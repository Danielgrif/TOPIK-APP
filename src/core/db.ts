import { client } from "./supabaseClient.ts";
import { state, Session } from "./state.ts";
import { showToast, parseBilingualString, compress } from "../utils/utils.ts";
import { syncGlobalStats } from "./sync.ts";
import { Scheduler } from "./scheduler.ts";
import { Word } from "../types/index.ts";
import { applyTheme, updateVoiceUI } from "../ui/ui_settings.ts";

let _saveTimer: number | null = null;
const VOCABULARY_CACHE_VERSION = "v1.1"; // Increment this when DB schema changes

interface UserProgressRow {
  word_id: string | number;
  is_learned: boolean;
  is_mistake: boolean;
  is_favorite: boolean;
  attempts: number;
  correct: number;
  last_review: string | number | null;
  sm2_interval: number | null;
  sm2_repetitions: number | null;
  sm2_ef: number | null;
  sm2_next_review: string | number | null;
  learned_date?: string | number | null;
}

function validateSchema(data: Word[]) {
  if (!data || data.length === 0) return;
  const sample = data[0];
  const required = ["id", "word_kr", "translation", "level", "type"];
  const missing = required.filter((field) => !(field in sample));

  if (missing.length > 0) {
    console.error(
      "🚨 CRITICAL: Database schema mismatch. Missing columns:",
      missing,
    );
    showToast(`⚠️ Ошибка БД: нет колонок ${missing.join(", ")}`);
  }
}

export function scheduleSaveState(delay: number = 300) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = window.setTimeout(() => {
    immediateSaveState();
    _saveTimer = null;
    syncGlobalStats();
  }, delay);
}

export function immediateSaveState() {
  try {
    localStorage.setItem("user_stats_v5", JSON.stringify(state.userStats));
    localStorage.setItem("learned_v5", JSON.stringify([...state.learned]));
    localStorage.setItem("mistakes_v5", JSON.stringify([...state.mistakes]));
    localStorage.setItem("favorites_v5", JSON.stringify([...state.favorites]));
    localStorage.setItem("word_history_v5", JSON.stringify(state.wordHistory));
    localStorage.setItem("streak_v5", JSON.stringify(state.streak));
    localStorage.setItem("sessions_v5", JSON.stringify(state.sessions));
    localStorage.setItem("achievements_v5", JSON.stringify(state.achievements));
    localStorage.setItem(
      "dirty_ids_v1",
      JSON.stringify([...state.dirtyWordIds]),
    );
    localStorage.setItem("custom_words_v1", JSON.stringify(state.customWords));
    localStorage.setItem("favorite_quotes_v1", JSON.stringify(state.favoriteQuotes));
    // Сжимаем кэш словаря, так как он самый большой
    localStorage.setItem("vocabulary_cache_v1", compress(JSON.stringify(state.dataStore)));
    localStorage.setItem("tts_volume_v1", String(state.ttsVolume));
    localStorage.setItem("vocabulary_version", VOCABULARY_CACHE_VERSION);
  } catch (e) {
    console.error("Save error:", e);
  }
}

function cleanupInvalidStateIds() {
  if (!state.dataStore || state.dataStore.length === 0) return;

  const validIds = new Set(state.dataStore.map((w) => String(w.id)));

  const cleanSet = (s: Set<string | number>): Set<string | number> => {
    const newSet = new Set<string | number>();
    s.forEach((id) => {
      if (validIds.has(String(id))) {
        newSet.add(id);
      }
    });
    return newSet;
  };

  state.learned = cleanSet(state.learned);
  state.mistakes = cleanSet(state.mistakes);
  state.favorites = cleanSet(state.favorites);

  for (const key in state.wordHistory) {
    if (!validIds.has(String(key))) {
      delete state.wordHistory[key];
    }
  }
}

export function updateStreak() {
  const today = new Date().toLocaleDateString("en-CA");
  if (state.streak.lastDate !== today) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toLocaleDateString("en-CA");

    if (state.streak.lastDate === yesterday) state.streak.count++;
    else {
      if (state.userStats.streakFreeze > 0) {
        state.userStats.streakFreeze--;
        showToast("❄️ Заморозка спасла серию!");
        state.streak.count++;
      } else {
        state.streak.count = 1;
      }
    }
    state.streak.lastDate = today;
    localStorage.setItem("streak_v5", JSON.stringify(state.streak));
  }
}

export function recordAttempt(id: number | string, isCorrect: boolean) {
  if (!state.wordHistory[id])
    state.wordHistory[id] = { attempts: 0, correct: 0, lastReview: null };
  const stats = state.wordHistory[id];
  stats.attempts++;
  if (isCorrect) stats.correct++;
  stats.lastReview = Date.now();

  if (!isCorrect && stats.sm2) {
    const result = Scheduler.calculate(0, stats.sm2);
    stats.sm2.interval = result.interval;
    stats.sm2.repetitions = result.repetitions;
    stats.sm2.ef = result.ef;
    stats.sm2.nextReview = Date.now();
  }

  updateStreak();
  if (state.sessionActive) state.sessionWordsReviewed++;
  scheduleSaveState();
}

function processVocabularyData(serverData: Word[]) {
  const serverWordsSet = new Set(serverData.map((w) => w.word_kr));
  state.customWords = state.customWords.filter(
    (cw) => !serverWordsSet.has(cw.word_kr),
  );
  immediateSaveState();

  state.dataStore = [...serverData, ...state.customWords];

  const uniqueMap = new Map();
  state.dataStore.forEach((w) => {
    if (w.id && !uniqueMap.has(w.id)) uniqueMap.set(w.id, w);
  });
  state.dataStore = Array.from(uniqueMap.values());

  state.dataStore.forEach((w) => {
    if (!w.type) w.type = "word";
    w._parsedTopic = parseBilingualString(w.topic || w.topic_ru || w.topic_kr);
    w._parsedCategory = parseBilingualString(w.category || w.category_ru || w.category_kr);
    w._searchStr = [w.word_kr, w.translation, w.word_hanja, w.synonyms, w.my_notes].filter(Boolean).join(" ").toLowerCase();
  });

  validateSchema(state.dataStore);
  cleanupInvalidStateIds();
  immediateSaveState();
}

export async function fetchVocabulary() {
  try {
    const cachedVersion = localStorage.getItem("vocabulary_version");
    const isCacheValid = cachedVersion === VOCABULARY_CACHE_VERSION;

    if (!isCacheValid && navigator.onLine) {
      console.log("🔄 Cache outdated or missing. Forcing refresh...");
      state.dataStore = []; // Clear in-memory cache to force fetch
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const { data, error } = await client.from("vocabulary").select("*").abortSignal(controller.signal);
    clearTimeout(timeoutId);

    if (error) throw error;

    let serverData: Word[] = data || [];

    if (serverData.length === 0 || (!navigator.onLine && isCacheValid)) {
      if (state.dataStore.length > 0) {
        showToast("⚠️ Офлайн режим: используются кэшированные данные");
        return;
      }
    }

    processVocabularyData(serverData);
  } catch (e) {
    console.error("Vocabulary fetch failed:", e);
    
    // Check for AbortError specifically
    if (e instanceof Error && e.name === 'AbortError') {
       console.warn("Request aborted. This might be due to a timeout or navigation.");
    } else if (typeof e === "object" && e !== null) {
       // @ts-ignore
       if ("message" in e) console.error("Error Message:", e.message);
       // @ts-ignore
       if ("details" in e) console.error("Error Details:", e.details);
    }
    if (state.dataStore.length > 0) {
      showToast("⚠️ Ошибка сети. Используются кэшированные данные.");
    } else {
      showToast("❌ Не удалось загрузить словарь.");
    }
  }
}

export async function loadFromSupabase(user: { id: string }) {
  if (!navigator.onLine) return;
  try {
    showToast("☁️ Синхронизация...");

    const { error: rpcError } = await client.rpc("cleanup_user_progress");
    if (rpcError) {
        // Ignore AbortError for cleanup, it's not critical
        if (rpcError.message && !rpcError.message.includes("AbortError")) console.warn("Server cleanup skipped:", rpcError.message);
    }

    const { data: globalData } = await client
      .from("user_global_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (globalData) {
      state.userStats.xp = globalData.xp ?? state.userStats.xp;
      state.userStats.level = globalData.level ?? state.userStats.level;
      state.userStats.sprintRecord =
        globalData.sprint_record ?? state.userStats.sprintRecord;
      state.userStats.survivalRecord =
        globalData.survival_record ?? state.userStats.survivalRecord;
      state.userStats.coins = globalData.coins ?? state.userStats.coins;
      state.userStats.streakFreeze =
        globalData.streak_freeze ?? state.userStats.streakFreeze;

      if (globalData.achievements && Array.isArray(globalData.achievements)) {
        const localIds = new Set(state.achievements.map((a) => a.id));
        globalData.achievements.forEach((a: { id: string; date?: number }) => {
          if (!localIds.has(a.id))
            state.achievements.push({ ...a, date: a.date || Date.now() });
        });
      }

      if (globalData.settings) {
        const s = globalData.settings;
        if (s.darkMode !== undefined) {
          state.darkMode = s.darkMode;
          localStorage.setItem("dark_mode_v1", String(state.darkMode));
        }
        if (s.hanjaMode !== undefined) {
          state.hanjaMode = s.hanjaMode;
          localStorage.setItem("hanja_mode_v1", String(state.hanjaMode));
        }
        if (s.audioSpeed !== undefined) {
          state.audioSpeed = s.audioSpeed;
          localStorage.setItem("audio_speed_v1", String(state.audioSpeed));
        }
        if (s.currentVoice !== undefined) {
          state.currentVoice = s.currentVoice;
          localStorage.setItem("voice_pref", state.currentVoice);
        }
        if (s.autoUpdate !== undefined) {
          state.autoUpdate = s.autoUpdate;
          localStorage.setItem("auto_update_v1", String(state.autoUpdate));
        }
        if (s.autoTheme !== undefined) {
          state.autoTheme = s.autoTheme;
          localStorage.setItem("auto_theme_v1", String(state.autoTheme));
        }
        if (s.studyGoal !== undefined) {
          state.studyGoal = s.studyGoal;
          localStorage.setItem("study_goal_v1", JSON.stringify(state.studyGoal));
        }
        if (s.lastDailyReward !== undefined)
          state.userStats.lastDailyReward = s.lastDailyReward;
        if (s.themeColor !== undefined) {
          state.themeColor = s.themeColor;
          localStorage.setItem("theme_color_v1", state.themeColor);
        }
        if (s.backgroundMusicEnabled !== undefined) {
          state.backgroundMusicEnabled = s.backgroundMusicEnabled;
          localStorage.setItem("background_music_enabled_v1", String(state.backgroundMusicEnabled));
        }
        if (s.backgroundMusicVolume !== undefined) {
          state.backgroundMusicVolume = s.backgroundMusicVolume;
          localStorage.setItem("background_music_volume_v1", String(state.backgroundMusicVolume));
        }
        if (s.ttsVolume !== undefined) {
          state.ttsVolume = s.ttsVolume;
          localStorage.setItem("tts_volume_v1", String(state.ttsVolume));
        }
        if (s.streakLastDate !== undefined)
          state.streak.lastDate = s.streakLastDate;
        if (s.survivalHealth !== undefined)
          state.userStats.survivalHealth = s.survivalHealth;

        applyTheme();
        updateVoiceUI();
      }

      if (globalData.sessions && Array.isArray(globalData.sessions)) {
        const localDates = new Set(
          state.sessions.map((s: { date: string }) => s.date),
        );
        globalData.sessions.forEach((s: Session) => {
          if (!localDates.has(s.date)) state.sessions.push(s);
        });
        state.sessions.sort(
          (a: { date: string }, b: { date: string }) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      }
    }

    const { data: wordData } = await client
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id);

    const validIds = new Set(state.dataStore.map((w) => String(w.id)));

    if (wordData) {
      wordData.forEach((row: UserProgressRow) => {
        const id = row.word_id;
        if (!validIds.has(String(id))) return;

        if (row.is_learned) state.learned.add(id);
        if (row.is_mistake) state.mistakes.add(id);
        if (row.is_favorite) state.favorites.add(id);

        state.wordHistory[id] = {
          attempts: row.attempts,
          correct: row.correct,
          lastReview: row.last_review
            ? new Date(Number(row.last_review) || row.last_review).getTime()
            : null,
          learnedDate: row.learned_date
            ? new Date(Number(row.learned_date) || row.learned_date).getTime() 
            : undefined,
          sm2: {
            interval: row.sm2_interval ?? 0,
            repetitions: row.sm2_repetitions ?? 0,
            ef: row.sm2_ef ?? 2.5,
            nextReview: row.sm2_next_review
              ? new Date(Number(row.sm2_next_review) || row.sm2_next_review).getTime()
              : undefined,
          },
        };

        // Migration: If word is learned but has no learnedDate, use lastReview or now
        // if (state.learned.has(id) && !state.wordHistory[id].learnedDate) {
        //     state.wordHistory[id].learnedDate = state.wordHistory[id].lastReview || Date.now();
        //     state.dirtyWordIds.add(id); // Mark for sync
        // }
      });
    }

    cleanupInvalidStateIds();
    immediateSaveState();
    showToast("✅ Профиль загружен");
  } catch (e) {
    console.error("Load Error:", e);
  }
}

export async function fetchRandomQuote() {
  try {
    // 1. Узнаем общее количество цитат
    const { count, error: countError } = await client
      .from("quotes")
      .select("*", { count: "exact", head: true });

    if (countError || count === null || count === 0) return null;

    // 2. Выбираем случайный индекс
    const randomIndex = Math.floor(Math.random() * count);

    // 3. Загружаем одну цитату по этому индексу
    const { data, error } = await client
      .from("quotes")
      .select("*")
      .range(randomIndex, randomIndex)
      .single();

    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Quote fetch error:", e);
    return null;
  }
}

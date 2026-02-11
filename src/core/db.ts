import { client } from "./supabaseClient.ts";
import { state, Session, CURRENT_DB_VERSION } from "./state.ts";
import { showToast, parseBilingualString } from "../utils/utils.ts";
import { syncGlobalStats } from "./sync.ts";
import { Scheduler } from "./scheduler.ts";
import { LS_KEYS, DB_TABLES } from "./constants.ts";
import { Word } from "../types/index.ts";

let _saveTimer: number | null = null;
const VOCABULARY_CACHE_VERSION = "v1.1"; // Increment this when DB schema changes

/**
 * Validates that the vocabulary data has the required columns.
 * Logs a critical error if the schema is invalid.
 * @param data The array of vocabulary words to validate.
 */
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

/**
 * Validates the structure of the user stats object to prevent corruption.
 * @param stats The user stats object to validate.
 * @returns True if valid, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateUserStats(stats: any): boolean {
  if (!stats || typeof stats !== "object") return false;

  // Проверяем, что числовые поля действительно числа и не NaN
  const numericFields = [
    "xp",
    "level",
    "coins",
    "sprintRecord",
    "survivalRecord",
  ];
  const isValid = numericFields.every(
    (field) => typeof stats[field] === "number" && !isNaN(stats[field]),
  );

  if (!isValid) console.error("❌ Validation failed for UserStats:", stats);
  return isValid;
}

/**
 * Schedules a save of the application state to localStorage and Supabase (debounced).
 * @param delay The delay in milliseconds before saving (default: 300ms).
 */
export function scheduleSaveState(delay: number = 300) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = window.setTimeout(() => {
    immediateSaveState();
    _saveTimer = null;
    syncGlobalStats();
  }, delay);
}

/**
 * Immediately saves the current application state to localStorage.
 * Also performs validation before saving.
 */
export function immediateSaveState() {
  try {
    // Валидация перед сохранением, чтобы не записать мусор
    if (!validateUserStats(state.userStats)) {
      console.warn(
        "⚠️ State validation failed. Aborting save to protect localStorage.",
      );
      return;
    }

    localStorage.setItem(LS_KEYS.DB_VERSION, String(CURRENT_DB_VERSION));
    localStorage.setItem(LS_KEYS.USER_STATS, JSON.stringify(state.userStats));
    localStorage.setItem(LS_KEYS.LEARNED, JSON.stringify([...state.learned]));
    localStorage.setItem(LS_KEYS.MISTAKES, JSON.stringify([...state.mistakes]));
    localStorage.setItem(
      LS_KEYS.FAVORITES,
      JSON.stringify([...state.favorites]),
    );
    localStorage.setItem(
      LS_KEYS.WORD_HISTORY,
      JSON.stringify(state.wordHistory),
    );
    localStorage.setItem(LS_KEYS.STREAK, JSON.stringify(state.streak));
    localStorage.setItem(LS_KEYS.SESSIONS, JSON.stringify(state.sessions));
    localStorage.setItem(
      LS_KEYS.ACHIEVEMENTS,
      JSON.stringify(state.achievements),
    );
    localStorage.setItem(
      LS_KEYS.DIRTY_IDS,
      JSON.stringify([...state.dirtyWordIds]),
    );
    localStorage.setItem(
      LS_KEYS.CUSTOM_WORDS,
      JSON.stringify(state.customWords),
    );
    localStorage.setItem(
      LS_KEYS.WORD_REQUESTS,
      JSON.stringify(state.wordRequests),
    );
    localStorage.setItem(
      LS_KEYS.FAVORITE_QUOTES,
      JSON.stringify(state.favoriteQuotes),
    );
    localStorage.setItem(
      LS_KEYS.TRASH_RETENTION,
      String(state.trashRetentionDays),
    );
    localStorage.setItem(
      LS_KEYS.PURCHASED_ITEMS,
      JSON.stringify(state.purchasedItems),
    );
    // Не сжимаем, чтобы избежать ошибок с Unicode
    localStorage.setItem(LS_KEYS.VOCAB_CACHE, JSON.stringify(state.dataStore));
    localStorage.setItem(LS_KEYS.TTS_VOLUME, String(state.ttsVolume));
    localStorage.setItem(LS_KEYS.VOCAB_VERSION, VOCABULARY_CACHE_VERSION);
  } catch (e) {
    console.error("Save error:", e);
  }
}

/**
 * Removes IDs from state sets (learned, mistakes, favorites) that no longer exist in the data store.
 */
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

/**
 * Updates the user's daily streak based on the last activity date.
 * Handles streak freezing logic if applicable.
 */
export function updateStreak() {
  const today = new Date().toLocaleDateString("en-CA");
  if (state.streak.lastDate !== today) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toLocaleDateString("en-CA");

    if (state.streak.lastDate === yesterday) state.streak.count++;
    else {
      // Check if freeze was already used today (e.g. by Shop)
      const lastFreeze = state.userStats.lastFreezeDate
        ? new Date(state.userStats.lastFreezeDate).toLocaleDateString("en-CA")
        : null;
      const freezeUsedToday = lastFreeze === today;

      if (
        state.streak.count > 0 &&
        state.streak.lastDate &&
        (state.userStats.streakFreeze > 0 || freezeUsedToday)
      ) {
        if (!freezeUsedToday) {
          state.userStats.streakFreeze--;
          state.userStats.lastFreezeDate = Date.now();
        }
        showToast("❄️ Заморозка спасла серию!");
        state.streak.count++;
      } else {
        state.streak.count = 1;
      }
    }
    state.streak.lastDate = today;
    scheduleSaveState();
  }
}

/**
 * Records a quiz attempt for a specific word.
 * Updates SM-2 scheduling parameters if the answer was incorrect.
 * @param id The ID of the word.
 * @param isCorrect Whether the answer was correct.
 */
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

/**
 * Processes raw vocabulary data from the server.
 * Merges with custom words, removes duplicates, sorts, and updates the local cache.
 * @param serverData The array of words fetched from the server.
 */
function processVocabularyData(serverData: Word[]) {
  const serverWordsSet = new Set(serverData.map((w) => w.word_kr));
  state.customWords = state.customWords.filter(
    (cw) => !serverWordsSet.has(cw.word_kr),
  );
  immediateSaveState();

  state.dataStore = [...serverData, ...state.customWords];

  const uniqueMap = new Map();
  const data = state.dataStore;
  for (let i = 0; i < data.length; i++) {
    const w = data[i];
    if (w.id && !uniqueMap.has(w.id)) uniqueMap.set(w.id, w);
  }
  state.dataStore = Array.from(uniqueMap.values());

  // Сортировка по умолчанию: Тема -> Категория -> Слово
  state.dataStore.sort((a, b) => {
    const topicA = a.topic || a.topic_ru || a.topic_kr || "zzz";
    const topicB = b.topic || b.topic_ru || b.topic_kr || "zzz";
    if (topicA !== topicB) return topicA.localeCompare(topicB);

    const catA = a.category || a.category_ru || a.category_kr || "zzz";
    const catB = b.category || b.category_ru || b.category_kr || "zzz";
    if (catA !== catB) return catA.localeCompare(catB);

    return (a.word_kr || "").localeCompare(b.word_kr || "");
  });

  const sortedData = state.dataStore;
  for (let i = 0; i < sortedData.length; i++) {
    const w = sortedData[i];
    if (!w.type) w.type = "word";
    w._parsedTopic = parseBilingualString(w.topic || w.topic_ru || w.topic_kr);
    w._parsedCategory = parseBilingualString(
      w.category || w.category_ru || w.category_kr,
    );
    w._searchStr = [
      w.word_kr,
      w.translation,
      w.word_hanja,
      w.synonyms,
      w.my_notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  validateSchema(state.dataStore);
  cleanupInvalidStateIds();
  immediateSaveState();
}

/**
 * Fetches the latest vocabulary data from Supabase.
 * Handles caching, offline mode, and slow connections.
 */
export async function fetchVocabulary() {
  try {
    const cachedVersion = localStorage.getItem(LS_KEYS.VOCAB_VERSION);
    const isCacheValid = cachedVersion === VOCABULARY_CACHE_VERSION;

    // 🐌 Проверка скорости: если есть кэш и интернет медленный, пропускаем обновление
    // @ts-ignore
    const conn = navigator.connection;
    if (
      conn &&
      (conn.saveData || ["slow-2g", "2g"].includes(conn.effectiveType))
    ) {
      if (state.dataStore.length > 0) {
        showToast("🐌 Медленный интернет: обновление словаря отложено");
        return;
      }
    }

    if (!isCacheValid && navigator.onLine) {
      // eslint-disable-next-line no-console
      console.log("🔄 Cache outdated or missing. Forcing refresh...");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const { data, error } = await client
      .from(DB_TABLES.VOCABULARY)
      .select("*")
      .is("deleted_at", null)
      .abortSignal(controller.signal);
    clearTimeout(timeoutId);

    if (error) throw error;

    const serverData: Word[] = data || [];

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
    if (e instanceof Error && e.name === "AbortError") {
      console.warn(
        "Request aborted. This might be due to a timeout or navigation.",
      );
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

/**
 * Loads user progress and settings from Supabase.
 * Merges remote data with local state.
 * @param user The authenticated user object containing the ID.
 */
export async function loadFromSupabase(user: { id: string }) {
  if (!navigator.onLine) return;
  try {
    showToast("☁️ Синхронизация...");

    const { error: rpcError } = await client.rpc("cleanup_user_progress");
    if (rpcError) {
      // Ignore AbortError for cleanup, it's not critical
      if (rpcError.message && !rpcError.message.includes("AbortError"))
        console.warn("Server cleanup skipped:", rpcError.message);
    }

    const { data: globalData } = await client
      .from(DB_TABLES.USER_GLOBAL_STATS)
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (globalData) {
      // Умное слияние, чтобы избежать потери данных из-за устаревшего облака
      if ((globalData.level || 0) > state.userStats.level) {
        // Если в облаке уровень выше, полностью доверяем облаку
        state.userStats.level = globalData.level;
        state.userStats.xp = globalData.xp ?? 0;
      } else if ((globalData.level || 0) === state.userStats.level) {
        // Если уровни одинаковые, берем больший XP
        state.userStats.xp = Math.max(state.userStats.xp, globalData.xp ?? 0);
      }
      // Если локальный уровень выше, мы ничего не делаем,
      // и локальные данные будут синхронизированы в облако позже.

      // Для остальных показателей просто берем максимальное значение
      state.userStats.sprintRecord = Math.max(
        state.userStats.sprintRecord,
        globalData.sprint_record ?? 0,
      );
      state.userStats.survivalRecord = Math.max(
        state.userStats.survivalRecord,
        globalData.survival_record ?? 0,
      );
      state.userStats.coins = Math.max(
        state.userStats.coins,
        globalData.coins ?? 0,
      );
      state.userStats.streakFreeze = Math.max(
        state.userStats.streakFreeze,
        globalData.streak_freeze ?? 0,
      );

      if (globalData.achievements && Array.isArray(globalData.achievements)) {
        const localIds = new Set(state.achievements.map((a) => a.id));
        globalData.achievements.forEach((a: { id: string; date?: number }) => {
          if (!localIds.has(a.id))
            state.achievements.push({ ...a, date: a.date || Date.now() });
        });
      }

      if (globalData.settings) {
        const s = globalData.settings;
        const cloudTime = s.settingsUpdatedAt || 0;
        const localTime = state.settingsUpdatedAt || 0;

        // FIX: Применяем настройки из облака ТОЛЬКО если они новее локальных.
        // Это решает проблему сброса настроек при перезагрузке, если синхронизация еще не прошла.
        if (cloudTime >= localTime) {
          state.settingsUpdatedAt = cloudTime;
          localStorage.setItem("settings_updated_at", String(cloudTime));

          if (s.darkMode !== undefined) {
            state.darkMode = s.darkMode;
            localStorage.setItem(LS_KEYS.DARK_MODE, String(state.darkMode));
          }
          if (s.hanjaMode !== undefined) {
            state.hanjaMode = s.hanjaMode;
            localStorage.setItem(LS_KEYS.HANJA_MODE, String(state.hanjaMode));
          }
          if (s.audioSpeed !== undefined) {
            state.audioSpeed = s.audioSpeed;
            localStorage.setItem(LS_KEYS.AUDIO_SPEED, String(state.audioSpeed));
          }
          if (s.currentVoice !== undefined) {
            state.currentVoice = s.currentVoice;
            localStorage.setItem(LS_KEYS.VOICE_PREF, state.currentVoice);
          }
          if (s.autoUpdate !== undefined) {
            state.autoUpdate = s.autoUpdate;
            localStorage.setItem(LS_KEYS.AUTO_UPDATE, String(state.autoUpdate));
          }
          if (s.autoTheme !== undefined) {
            state.autoTheme = s.autoTheme;
            localStorage.setItem(LS_KEYS.AUTO_THEME, String(state.autoTheme));
          }
          if (s.studyGoal !== undefined) {
            state.studyGoal = s.studyGoal;
            localStorage.setItem(
              LS_KEYS.STUDY_GOAL,
              JSON.stringify(state.studyGoal),
            );
          }
          if (s.lastDailyReward !== undefined)
            state.userStats.lastDailyReward = s.lastDailyReward;
          if (s.themeColor !== undefined) {
            state.themeColor = s.themeColor;
            localStorage.setItem(LS_KEYS.THEME_COLOR, state.themeColor);
          }
          if (s.backgroundMusicEnabled !== undefined) {
            state.backgroundMusicEnabled = s.backgroundMusicEnabled;
            localStorage.setItem(
              LS_KEYS.MUSIC_ENABLED,
              String(state.backgroundMusicEnabled),
            );
          }
          if (s.backgroundMusicVolume !== undefined) {
            state.backgroundMusicVolume = s.backgroundMusicVolume;
            localStorage.setItem(
              LS_KEYS.MUSIC_VOLUME,
              String(state.backgroundMusicVolume),
            );
          }
          if (s.ttsVolume !== undefined) {
            state.ttsVolume = s.ttsVolume;
            localStorage.setItem(LS_KEYS.TTS_VOLUME, String(state.ttsVolume));
          }
          if (s.trashRetentionDays !== undefined) {
            state.trashRetentionDays = s.trashRetentionDays;
            localStorage.setItem(
              LS_KEYS.TRASH_RETENTION,
              String(state.trashRetentionDays),
            );
          }
          if (s.streakLastDate !== undefined)
            state.streak.lastDate = s.streakLastDate;
          if (s.survivalHealth !== undefined)
            state.userStats.survivalHealth = s.survivalHealth;
          if (s.lastFreezeDate !== undefined)
            state.userStats.lastFreezeDate = s.lastFreezeDate;
        } // End of timestamp check
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
      .from(DB_TABLES.USER_PROGRESS)
      .select("*")
      .eq("user_id", user.id);

    const validIds = new Set(state.dataStore.map((w) => String(w.id)));

    if (wordData) {
      for (let i = 0; i < wordData.length; i++) {
        const row = wordData[i];
        const id = row.word_id;
        if (!validIds.has(String(id))) continue;

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
              ? new Date(
                  Number(row.sm2_next_review) || row.sm2_next_review,
                ).getTime()
              : undefined,
          },
        };

        // Migration: If word is learned but has no learnedDate, use lastReview or now
        // if (state.learned.has(id) && !state.wordHistory[id].learnedDate) {
        //     state.wordHistory[id].learnedDate = state.wordHistory[id].lastReview || Date.now();
        //     state.dirtyWordIds.add(id); // Mark for sync
        // }
      }
    }

    cleanupInvalidStateIds();
    scheduleSaveState();
    showToast("✅ Профиль загружен");
  } catch (e) {
    console.error("Load Error:", e);
  }
}

/**
 * Fetches a random quote from the database.
 * @returns A quote object or null if fetch fails.
 */
export async function fetchRandomQuote() {
  try {
    // 1. Узнаем общее количество цитат
    const { count, error: countError } = await client
      .from(DB_TABLES.QUOTES)
      .select("*", { count: "exact", head: true });

    if (countError || count === null || count === 0) return null;

    // 2. Выбираем случайный индекс
    const randomIndex = Math.floor(Math.random() * count);

    // 3. Загружаем одну цитату по этому индексу
    const { data, error } = await client
      .from(DB_TABLES.QUOTES)
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

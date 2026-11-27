import { client } from "./supabaseClient.ts";
import { state, notify, Session, CURRENT_DB_VERSION } from "./state.ts";
import { showToast, parseBilingualString, isConnectionSlow } from "../utils/utils.ts";
import { syncGlobalStats } from "./sync.ts";
import { Scheduler } from "./scheduler.ts";
import { LS_KEYS, DB_TABLES } from "./constants.ts";
import { Word } from "../types/index.ts";
import { getIdbItem, setIdbItem } from "./storage_idb.ts";

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
    console.error("🚨 CRITICAL: Database schema mismatch. Missing columns:", missing);
    showToast(`⚠️ Ошибка БД: нет колонок ${missing.join(", ")}`);
  }
}

/**
 * Validates the structure of the user stats object to prevent corruption.
 * @param stats The user stats object to validate.
 * @returns True if valid, false otherwise.
 */
function validateUserStats(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return false;

  const s = stats as Record<string, unknown>;

  // Проверяем, что числовые поля — конечные числа в допустимом диапазоне.
  // level = 0 особенно опасен: getXPForNextLevel(0) === 0 и addXP() зацикливается.
  const numericFields = ["xp", "level", "coins", "sprintRecord", "survivalRecord"];
  const isValid = numericFields.every((field) => {
    const value = s[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
    if (field === "level" && value < 1) return false;
    return true;
  });

  if (!isValid) console.error("❌ Validation failed for UserStats:", stats);
  return isValid;
}

/**
 * Schedules a save of the application state to localStorage and Supabase (debounced).
 * @param delay The delay in milliseconds before saving (default: 300ms).
 */
export function scheduleSaveState(delay: number = 300): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = window.setTimeout(() => {
    saveAllState();
    _saveTimer = null;
    syncGlobalStats();
  }, delay);
}

/**
 * Immediately saves the current application state to localStorage.
 * Also performs validation before saving.
 */
export function immediateSaveState(): void {
  try {
    // Валидация перед сохранением, чтобы не записать мусор
    if (!validateUserStats(state.userStats)) {
      console.warn("⚠️ State validation failed. Aborting save to protect localStorage.");
      return;
    }
    saveAllState();
  } catch (e: unknown) {
    console.error("Save error:", e);
    const error = e as { name?: string };
    if (error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      showToast("⚠️ Память переполнена! Данные могут не сохраниться.");
    }
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
  if (!state.wordHistory[id]) state.wordHistory[id] = { attempts: 0, correct: 0, lastReview: null };
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

  // КРИТИЧНО: прогресс из викторины/аудирования/ассоциаций должен попадать
  // в user_progress. Раньше помечали "грязными" только карточки и review.
  state.dirtyWordIds.add(id);

  updateStreak();
  if (state.sessionActive) state.sessionWordsReviewed++;
  scheduleSaveState();
}

function finalizeDataStore() {
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
    w._parsedCategory = parseBilingualString(w.category || w.category_ru || w.category_kr);
    w._searchStr = [
      w.word_kr,
      w.translation,
      w.word_hanja,
      w.synonyms,
      w.my_notes,
      w.topic,
      w.topic_ru,
      w.category,
      w.category_ru,
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
 * Processes raw vocabulary data from the server (FULL SYNC).
 * Merges with custom words, removes duplicates, sorts, and updates the local cache.
 * @param serverData The array of words fetched from the server.
 */
function processVocabularyData(serverData: Word[]) {
  // Пустой ответ сервера не должен стирать локальный кэш.
  if (serverData.length === 0 && state.dataStore.length > 0) {
    console.warn("⚠️ Empty vocabulary response — keeping local cache.");
    return;
  }
  const serverWordsSet = new Set(serverData.map((w) => w.word_kr));
  state.customWords = state.customWords.filter((cw) => !serverWordsSet.has(cw.word_kr));

  state.dataStore = [...serverData, ...state.customWords];
  finalizeDataStore();
}

/**
 * Processes incremental vocabulary updates (PARTIAL SYNC).
 * Handles additions, updates, and deletions (if deleted_at is set).
 * @param updates The array of updated/new words.
 */
function processIncrementalVocabularyData(updates: Word[]) {
  if (updates.length === 0) return;

  // 1. Identify deleted IDs
  const deletedIds = new Set(updates.filter((w) => w.deleted_at).map((w) => w.id));

  // 2. Identify active updates (new or modified words)
  const activeUpdates = updates.filter((w) => !w.deleted_at);
  const activeUpdatesMap = new Map(activeUpdates.map((w) => [w.id, w]));
  const activeWordsSet = new Set(activeUpdates.map((w) => w.word_kr));

  // 3. Update Custom Words (remove if they now exist on server)
  state.customWords = state.customWords.filter((cw) => !activeWordsSet.has(cw.word_kr));

  // 4. Update Data Store
  // Filter out: deleted words AND words that are being updated (we'll re-add the new version)
  state.dataStore = state.dataStore.filter(
    (w) => !deletedIds.has(w.id) && !activeUpdatesMap.has(w.id),
  );

  // Add new/updated words
  state.dataStore.push(...activeUpdates);

  // 5. Finalize (Sort, Enrich, Save)
  finalizeDataStore();
}

/**
 * Fetches the latest vocabulary data from Supabase.
 * Handles caching, offline mode, and slow connections.
 */
export async function fetchVocabulary() {
  try {
    const cachedVersion = localStorage.getItem(LS_KEYS.VOCAB_VERSION);
    const isCacheValid = cachedVersion === VOCABULARY_CACHE_VERSION;
    const lastSync = localStorage.getItem(LS_KEYS.LAST_VOCAB_SYNC);

    // IndexedDB — приоритетный источник словаря. localStorage мог остаться
    // старым после QuotaExceededError, поэтому читаем IDB всегда, а не только
    // когда память пуста; версия защищает от несовместимого старого кэша.
    const idbData = await getIdbItem<Word[]>(LS_KEYS.VOCAB_CACHE);
    const idbVersion = await getIdbItem<string>(LS_KEYS.VOCAB_VERSION);
    const hasValidIdb =
      Array.isArray(idbData) && idbData.length > 0 && idbVersion === VOCABULARY_CACHE_VERSION;

    if (hasValidIdb || (state.dataStore.length === 0 && Array.isArray(idbData))) {
      state.dataStore = idbData as Word[];
      notify("vocabs_updated");
    }

    const hasLocalData = state.dataStore.length > 0;

    // 🐌 Проверка скорости: если есть кэш и интернет медленный, пропускаем обновление
    if (isConnectionSlow() && hasLocalData) {
      showToast("🐌 Медленный интернет: обновление словаря отложено");
      return;
    }

    // Офлайн проверяем ДО запроса: иначе 4 ретрая × 10с дают ~40с тишины.
    if (!navigator.onLine) {
      showToast(
        hasLocalData
          ? "⚠️ Офлайн режим: используются кэшированные данные"
          : "❌ Нет интернета и нет кэша словаря",
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Оптимизация: загружаем только нужные колонки вместо SELECT *
    const VOCAB_COLUMNS =
      "id, word_kr, translation, level, type, topic, topic_ru, topic_kr, category, category_ru, category_kr, example_kr, example_ru, audio_url, audio_male, example_audio, image, image_source, synonyms, antonyms, word_hanja, my_notes, grammar_info, collocations, is_public, created_by, user_id, deleted_at, updated_at";

    // PostgREST по умолчанию отдаёт максимум 1000 строк. Без пагинации
    // большой словарь молча обрезался, а processVocabularyData стирал "лишние" слова.
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 200; // 200 000 строк — защита от бесконечной выборки
    const serverData: Word[] = [];
    let fetchError: unknown = null;

    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        let query = client.from(DB_TABLES.VOCABULARY).select(VOCAB_COLUMNS);

        if (isCacheValid && lastSync && hasLocalData) {
          query = query.gt("updated_at", lastSync);
        } else {
          query = query.is("deleted_at", null);
        }

        const { data, error } = await query
          .order("updated_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
          .abortSignal(controller.signal);

        if (error) {
          fetchError = error;
          break;
        }

        const rows = (data || []) as Word[];
        serverData.push(...rows);
        if (rows.length < PAGE_SIZE) break;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (fetchError) throw fetchError;

    if (isCacheValid && lastSync && hasLocalData) {
      if (serverData.length > 0) {
        console.info(`🔄 Incremental sync: ${serverData.length} changes.`);
        processIncrementalVocabularyData(serverData);
        notify("vocabs_updated");
      } else {
        console.info("✅ Dictionary up to date.");
      }
    } else {
      console.info(`📥 Full sync: ${serverData.length} words.`);
      processVocabularyData(serverData);
      notify("vocabs_updated");
    }

    // Update sync timestamp
    localStorage.setItem(LS_KEYS.LAST_VOCAB_SYNC, new Date().toISOString());
  } catch (e) {
    console.error("Vocabulary fetch failed:", e);

    const isNetworkErr =
      !navigator.onLine ||
      (e instanceof Error &&
        (e.message.includes("Failed to fetch") || e.message.includes("NetworkError"))) ||
      (typeof e === "object" &&
        e !== null &&
        "message" in e &&
        String((e as { message: unknown }).message).includes("Failed to fetch"));

    const isRlsPermissionErr =
      typeof e === "object" &&
      e !== null &&
      (("code" in e && String((e as { code: unknown }).code) === "42501") ||
        ("message" in e &&
          String((e as { message: unknown }).message).includes("permission denied")));

    if (isRlsPermissionErr) {
      console.warn("ℹ️ Supabase RLS permission restricted. Using local cached dictionary dataset.");
    } else if (isNetworkErr && state.dataStore.length > 0) {
      showToast("⚠️ Офлайн режим. Используются кэшированные данные.");
    } else if (state.dataStore.length === 0) {
      console.error("Full db load error:", e);
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
      state.userStats.coins = Math.max(state.userStats.coins, globalData.coins ?? 0);
      state.userStats.streakFreeze = Math.max(
        state.userStats.streakFreeze,
        globalData.streak_freeze ?? 0,
      );

      // Недельный опыт: берём максимум, иначе офлайн-прогресс теряется.
      if (globalData.weekly_xp !== undefined) {
        state.userStats.weeklyXp = Math.max(
          state.userStats.weeklyXp || 0,
          globalData.weekly_xp || 0,
        );
      }
      // Лигу из облака применяем только если она выше локальной
      // понижение обработает checkWeeklyReset на основе накопленного XP.
      if (globalData.league !== undefined) {
        const order = [
          "Bronze",
          "Silver",
          "Gold",
          "Platinum",
          "Diamond",
          "Master",
          "Grandmaster",
          "Challenger",
        ];
        const localLeague = state.userStats.league || "Bronze";
        if (order.indexOf(globalData.league) > order.indexOf(localLeague)) {
          state.userStats.league = globalData.league;
        }
      }

      if (globalData.achievements && Array.isArray(globalData.achievements)) {
        const localIds = new Set(state.achievements.map((a) => a.id));
        globalData.achievements.forEach((a: { id: string; date?: number }) => {
          if (!localIds.has(a.id)) state.achievements.push({ ...a, date: a.date || Date.now() });
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
          if (s.autoThemeStart !== undefined) {
            state.autoThemeStart = s.autoThemeStart;
            localStorage.setItem(LS_KEYS.AUTO_THEME_START, String(state.autoThemeStart));
          }
          if (s.autoThemeEnd !== undefined) {
            state.autoThemeEnd = s.autoThemeEnd;
            localStorage.setItem(LS_KEYS.AUTO_THEME_END, String(state.autoThemeEnd));
          }
          if (s.studyGoal !== undefined) {
            state.studyGoal = s.studyGoal;
            localStorage.setItem(LS_KEYS.STUDY_GOAL, JSON.stringify(state.studyGoal));
          }
          if (s.lastDailyReward !== undefined) state.userStats.lastDailyReward = s.lastDailyReward;
          if (s.themeColor !== undefined) {
            state.themeColor = s.themeColor;
            localStorage.setItem(LS_KEYS.THEME_COLOR, state.themeColor);
          }
          if (s.backgroundMusicEnabled !== undefined) {
            state.backgroundMusicEnabled = s.backgroundMusicEnabled;
            localStorage.setItem(LS_KEYS.MUSIC_ENABLED, String(state.backgroundMusicEnabled));
          }
          if (s.backgroundMusicVolume !== undefined) {
            state.backgroundMusicVolume = s.backgroundMusicVolume;
            localStorage.setItem(LS_KEYS.MUSIC_VOLUME, String(state.backgroundMusicVolume));
          }
          if (s.ttsVolume !== undefined) {
            state.ttsVolume = s.ttsVolume;
            localStorage.setItem(LS_KEYS.TTS_VOLUME, String(state.ttsVolume));
          }
          if (s.trashRetentionDays !== undefined) {
            state.trashRetentionDays = s.trashRetentionDays;
            localStorage.setItem(LS_KEYS.TRASH_RETENTION, String(state.trashRetentionDays));
          }
          if (s.streakLastDate !== undefined) state.streak.lastDate = s.streakLastDate;
          if (s.survivalHealth !== undefined) state.userStats.survivalHealth = s.survivalHealth;
          if (s.lastFreezeDate !== undefined) state.userStats.lastFreezeDate = s.lastFreezeDate;
        } // End of timestamp check
      }

      if (globalData.sessions && Array.isArray(globalData.sessions)) {
        const localDates = new Set(state.sessions.map((s: { date: string }) => s.date));
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

        // Если локально больше попыток (занятия были офлайн), облачная
        // запись устарела — оставляем локальную и отправляем её обратно.
        const localAttempts = state.wordHistory[id]?.attempts || 0;
        const remoteAttempts = Number(row.attempts) || 0;
        if (localAttempts > remoteAttempts) {
          state.dirtyWordIds.add(id);
          continue;
        }

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
      }
    }

    // Загрузка избранных цитат
    const { data: favQuotesData, error: favQuotesError } = await client
      .from(DB_TABLES.USER_FAVORITE_QUOTES)
      .select("quote_id")
      .eq("user_id", user.id);

    if (favQuotesError) {
      console.error("Error loading favorite quotes:", favQuotesError);
    } else if (favQuotesData) {
      const quoteIds = favQuotesData.map((q) => q.quote_id);
      if (quoteIds.length > 0) {
        // Загружаем полные данные цитат по ID.
        // Это предполагает, что у нас есть доступ к общей таблице `quotes`.
        const { data: quotes, error: quotesError } = await client
          .from(DB_TABLES.QUOTES)
          .select("*")
          .in("id", quoteIds);

        if (quotesError) {
          console.error("Error fetching full favorite quotes:", quotesError);
        } else {
          state.favoriteQuotes = quotes || [];
        }
      } else {
        // Пустой облачный список не должен затирать локальные цитаты.
        // Явное удаление на устройстве пока не синхронизируется — это безопаснее,
        // чем потеря данных при временном сбое загрузки.
      }
    }

    cleanupInvalidStateIds();
    notify("stats_updated", state.userStats);
    notify("settings_updated");
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

export async function isDatabaseActive(timeout: number = 5000): Promise<boolean> {
  try {
    // Use the PostgREST root endpoint — returns OpenAPI spec, works for anon without RLS
    // @ts-expect-error - supabaseUrl is protected but we need it for health check
    const baseUrl = client.supabaseUrl;
    // @ts-expect-error - supabaseKey is protected but we need it for health check
    const apiKey = client.supabaseKey;
    if (!baseUrl) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(`${baseUrl}/rest/v1/`, {
      method: "HEAD",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: apiKey ? { apikey: apiKey } : {},
    });

    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Сохранение по доменам (разделение God Object saveState)
// Каждая функция отвечает за свою зону ответственности.
// ============================================================================

/** Сохранение пользовательской статистики (XP, уровень, монеты, лига, стили, достижения) */
export function saveUserStats(): void {
  try {
    if (!validateUserStats(state.userStats)) {
      console.warn("⚠️ State validation failed. Aborting userStats save.");
      return;
    }
    localStorage.setItem(LS_KEYS.USER_STATS, JSON.stringify(state.userStats));
  } catch (e) {
    console.error("Save userStats error:", e);
  }
}

/** Сохранение множеств: learned, mistakes, favorites */
export function saveWordSets(): void {
  try {
    localStorage.setItem(LS_KEYS.LEARNED, JSON.stringify([...state.learned]));
    localStorage.setItem(LS_KEYS.MISTAKES, JSON.stringify([...state.mistakes]));
    localStorage.setItem(LS_KEYS.FAVORITES, JSON.stringify([...state.favorites]));
  } catch (e) {
    console.error("Save wordSets error:", e);
  }
}

/** Сохранение истории слов (wordHistory) */
export function saveWordHistory(): void {
  try {
    localStorage.setItem(LS_KEYS.WORD_HISTORY, JSON.stringify(state.wordHistory));
  } catch (e) {
    console.error("Save wordHistory error:", e);
  }
}

/** Сохранение сессий */
export function saveSessions(): void {
  try {
    localStorage.setItem(LS_KEYS.SESSIONS, JSON.stringify(state.sessions));
  } catch (e) {
    console.error("Save sessions error:", e);
  }
}

/** Сохранение achievements */
export function saveAchievements(): void {
  try {
    localStorage.setItem(LS_KEYS.ACHIEVEMENTS, JSON.stringify(state.achievements));
  } catch (e) {
    console.error("Save achievements error:", e);
  }
}

/** Сохранение dirtyWordIds */
export function saveDirtyWordIds(): void {
  try {
    localStorage.setItem(LS_KEYS.DIRTY_IDS, JSON.stringify([...state.dirtyWordIds]));
  } catch (e) {
    console.error("Save dirtyWordIds error:", e);
  }
}

/** Сохранение customWords */
export function saveCustomWords(): void {
  try {
    localStorage.setItem(LS_KEYS.CUSTOM_WORDS, JSON.stringify(state.customWords));
  } catch (e) {
    console.error("Save customWords error:", e);
  }
}

/** Сохранение wordRequests */
export function saveWordRequests(): void {
  try {
    localStorage.setItem(LS_KEYS.WORD_REQUESTS, JSON.stringify(state.wordRequests));
  } catch (e) {
    console.error("Save wordRequests error:", e);
  }
}

/** Сохранение favoriteQuotes */
export function saveFavoriteQuotes(): void {
  try {
    localStorage.setItem(LS_KEYS.FAVORITE_QUOTES, JSON.stringify(state.favoriteQuotes));
  } catch (e) {
    console.error("Save favoriteQuotes error:", e);
  }
}

/** Сохранение dailyChallenge */
export function saveDailyChallenge(): void {
  try {
    localStorage.setItem(LS_KEYS.DAILY_CHALLENGE, JSON.stringify(state.dailyChallenge));
  } catch (e) {
    console.error("Save dailyChallenge error:", e);
  }
}

/** Сохранение trashRetentionDays */
export function saveTrashRetentionDays(): void {
  try {
    localStorage.setItem(LS_KEYS.TRASH_RETENTION, String(state.trashRetentionDays));
  } catch (e) {
    console.error("Save trashRetentionDays error:", e);
  }
}

/** Сохранение purchasedItems */
export function savePurchasedItems(): void {
  try {
    localStorage.setItem(LS_KEYS.PURCHASED_ITEMS, JSON.stringify(state.purchasedItems));
  } catch (e) {
    console.error("Save purchasedItems error:", e);
  }
}

/** Сохранение ttsVolume */
export function saveTtsVolume(): void {
  try {
    localStorage.setItem(LS_KEYS.TTS_VOLUME, String(state.ttsVolume));
  } catch (e) {
    console.error("Save ttsVolume error:", e);
  }
}

/** Сохранение VOCAB_VERSION */
export function saveVocabVersion(): void {
  try {
    localStorage.setItem(LS_KEYS.VOCAB_VERSION, String(CURRENT_DB_VERSION));
  } catch (e) {
    console.error("Save vocabVersion error:", e);
  }
}

/** Сохранение VOCAB_CACHE (IndexedDB + localStorage fallback) */
export function saveVocabCache(): void {
  try {
    if (state.dataStore && state.dataStore.length > 0) {
      void setIdbItem(LS_KEYS.VOCAB_CACHE, state.dataStore);
      void setIdbItem(LS_KEYS.VOCAB_VERSION, VOCABULARY_CACHE_VERSION);
      try {
        localStorage.setItem(LS_KEYS.VOCAB_CACHE, JSON.stringify(state.dataStore));
      } catch {
        // QuotaExceededError: IndexedDB уже содержит данные
      }
    }
  } catch (e) {
    console.error("Save vocabCache error:", e);
  }
}

/**
 * Сохранение всего состояния (все домены).
 * Вызывается при необходимости полного сохранения.
 */
export function saveAllState(): void {
  saveUserStats();
  saveWordSets();
  saveWordHistory();
  saveSessions();
  saveAchievements();
  saveDirtyWordIds();
  saveCustomWords();
  saveWordRequests();
  saveFavoriteQuotes();
  saveDailyChallenge();
  saveTrashRetentionDays();
  savePurchasedItems();
  saveTtsVolume();
  saveVocabVersion();
  saveVocabCache();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Word,
  UserStats,
  WordHistoryItem,
  DailyChallenge,
  StudyGoal,
  MusicTrack,
  Quote,
  User,
} from "../types/index.ts";
import { createLocalBackup } from "./backup.ts";
import { LS_KEYS } from "./constants.ts";

export interface Session {
  date: string;
  duration: number;
  wordsReviewed: number;
  accuracy: number;
  platform?: string; // Пример нового поля
}

export interface WordRequestState {
  id: string | number;
  word: string;
  status: "pending" | "ai" | "audio" | "done" | "error";
  error?: string;
  timestamp: number;
  targetListId?: string;
  topic?: string;
  category?: string;
  level?: string;
}

export interface AppState {
  dataStore: Word[];
  searchResults: Word[] | null;
  userStats: UserStats;
  learned: Set<string | number>;
  mistakes: Set<string | number>;
  favorites: Set<string | number>;
  wordHistory: Record<string | number, WordHistoryItem>;
  streak: { count: number; lastDate: string | null };
  sessions: Session[];
  achievements: { id: string; date: number }[];
  dailyChallenge: DailyChallenge;
  searchHistory: string[];
  customWords: Word[];
  studyGoal: StudyGoal;
  favoriteQuotes: Quote[];
  dirtyWordIds: Set<string | number>;
  trashRetentionDays: number;
  selectMode: boolean;
  selectedWords: Set<string | number>;
  wordRequests: WordRequestState[];
  purchasedItems: string[];

  currentStar: string;
  currentTopic: string[];
  currentCategory: string[];
  currentType: string;
  hanjaMode: boolean;
  currentVoice: string;
  audioSpeed: number;
  darkMode: boolean;
  focusMode: boolean;
  zenMode: boolean;
  viewMode: string;
  themeColor: string;
  autoUpdate: boolean;
  autoTheme: boolean;
  autoThemeStart: number;
  autoThemeEnd: number;
  backgroundMusicEnabled: boolean;
  backgroundMusicVolume: number;
  ttsVolume: number;
  backgroundMusicTrack?: string;

  MUSIC_TRACKS: MusicTrack[];
  quizDifficulty: string;
  quizTopic: string;
  quizCategory: string;

  isSyncing: boolean;

  sessionActive: boolean;
  sessionSeconds: number;
  sessionInterval: number | null;
  sessionWordsReviewed: number;
  currentUser: User | null;
  networkPing: number | null;
  settingsUpdatedAt: number;
}

export const CURRENT_DB_VERSION = 10;

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage access failed for key "${key}":`, e);
    return null;
  }
};

export const state: AppState = {
  dataStore: [],
  searchResults: null,
  userStats: {
    xp: 0,
    level: 1,
    sprintRecord: 0,
    survivalRecord: 0,
    coins: 0,
    streakFreeze: 0,
    lastDailyReward: null,
    dailyRewardStreak: 0,
    achievements: [],
    survivalHealth: 0,
    lastFreezeDate: null,
    timeFreeze: 0,
    skipQuestion: 0,
    fiftyFifty: 0,
    weeklyXp: 0,
    league: "Bronze",
    lastWeekId: "",
  },
  learned: new Set(),
  mistakes: new Set(),
  favorites: new Set(),
  wordHistory: Object.create(null),
  streak: { count: 0, lastDate: null },
  sessions: [],
  achievements: [],
  dailyChallenge: { lastDate: null, completed: false, streak: 0 },
  searchHistory: [],
  customWords: [],
  studyGoal: { type: "words", target: 10 },
  favoriteQuotes: [],
  dirtyWordIds: new Set(),
  trashRetentionDays: 30,
  selectMode: false,
  selectedWords: new Set(),
  wordRequests: [],
  purchasedItems: [],

  currentStar: "all",
  currentTopic: ["all"],
  currentCategory: ["all"],
  currentType: "word",
  hanjaMode: safeGetItem(LS_KEYS.HANJA_MODE) === "true",
  currentVoice: safeGetItem(LS_KEYS.VOICE_PREF) || "female",
  audioSpeed:
    safeGetItem(LS_KEYS.AUDIO_SPEED) !== null
      ? Number(safeGetItem(LS_KEYS.AUDIO_SPEED))
      : 0.9,
  darkMode:
    safeGetItem(LS_KEYS.DARK_MODE) !== null
      ? safeGetItem(LS_KEYS.DARK_MODE) === "true"
      : window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        ? true
        : false,
  focusMode: false, // Отключаем сохранение состояния при перезагрузке
  zenMode: safeGetItem(LS_KEYS.ZEN_MODE) === "true",
  viewMode: safeGetItem(LS_KEYS.VIEW_MODE) || "grid",
  themeColor: safeGetItem(LS_KEYS.THEME_COLOR) || "purple",
  autoUpdate: safeGetItem(LS_KEYS.AUTO_UPDATE) !== "false",
  autoTheme: safeGetItem(LS_KEYS.AUTO_THEME) === "true",
  autoThemeStart:
    safeGetItem(LS_KEYS.AUTO_THEME_START) !== null
      ? Number(safeGetItem(LS_KEYS.AUTO_THEME_START))
      : 20,
  autoThemeEnd:
    safeGetItem(LS_KEYS.AUTO_THEME_END) !== null
      ? Number(safeGetItem(LS_KEYS.AUTO_THEME_END))
      : 6,
  backgroundMusicEnabled: safeGetItem(LS_KEYS.MUSIC_ENABLED) === "true",
  backgroundMusicVolume:
    safeGetItem(LS_KEYS.MUSIC_VOLUME) !== null
      ? Number(safeGetItem(LS_KEYS.MUSIC_VOLUME))
      : 0.3,
  ttsVolume:
    safeGetItem(LS_KEYS.TTS_VOLUME) !== null
      ? Number(safeGetItem(LS_KEYS.TTS_VOLUME))
      : 1.0,

  MUSIC_TRACKS: [
    {
      id: "default",
      name: "Seoul Lounge (Instrumental)",
      filename: "Seoul Lounge (Instrumental).mp3",
    },
    {
      id: "zen",
      name: "K-Drama Study (Instrumental)",
      filename: "K-Drama Study (Instrumental).mp3",
    },
    {
      id: "quiz",
      name: "Future Bass Pop (Instrumental)",
      filename: "Future Bass Pop (Instrumental).mp3",
    },
  ],
  quizDifficulty: safeGetItem(LS_KEYS.QUIZ_DIFFICULTY) || "all",
  quizTopic: safeGetItem(LS_KEYS.QUIZ_TOPIC) || "all",
  quizCategory: safeGetItem(LS_KEYS.QUIZ_CATEGORY) || "all",

  isSyncing: false,

  sessionActive: false,
  sessionSeconds: 0,
  sessionInterval: null,
  sessionWordsReviewed: 0,
  currentUser: null,
  networkPing: null,
  settingsUpdatedAt: 0,
};

try {
  const runMigrations = () => {
    try {
      const storedVersion = Number(safeGetItem(LS_KEYS.DB_VERSION) || "0");
      if (storedVersion >= CURRENT_DB_VERSION) return;

      // 🛡️ Автоматическое создание резервной копии перед миграцией
      createLocalBackup();

      // Пример миграции: перенос данных из v4 в v5 (если бы мы обновлялись с v4)
      if (storedVersion < 5) {
        const keys = [
          "user_stats",
          "learned",
          "mistakes",
          "favorites",
          "word_history",
          "streak",
          "sessions",
          "achievements",
        ];

        keys.forEach((baseKey) => {
          const oldKey = `${baseKey}_v4`;
          const newKey = `${baseKey}_v5`;
          const val = safeGetItem(oldKey);
          if (val && !safeGetItem(newKey)) {
            localStorage.setItem(newKey, val);
          }
        });
      }

      if (storedVersion < 6) {
        const key = "user_stats_v5";
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const stats = JSON.parse(raw);

            // Пример переименования поля: oldField -> newField
            // if (stats.oldField !== undefined) {
            //   stats.newField = stats.oldField;
            //   delete stats.oldField;
            // }

            // Убедимся, что новые поля инициализированы (структурная миграция)
            if (stats.survivalHealth === undefined) stats.survivalHealth = 0;

            localStorage.setItem(key, JSON.stringify(stats));
          } catch (e) {
            console.error("Migration v6 failed:", e);
          }
        }
      }

      if (storedVersion < 7) {
        const key = "sessions_v5";
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const sessions = JSON.parse(raw);
            if (Array.isArray(sessions)) {
              const updatedSessions = sessions.map((s: any) => ({
                ...s,
                platform: s.platform || "web", // Значение по умолчанию
              }));
              localStorage.setItem(key, JSON.stringify(updatedSessions));
            }
          } catch (e) {
            console.error("Migration v7 failed:", e);
          }
        }
      }

      if (storedVersion < 8) {
        const key = "sessions_v5";
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const sessions = JSON.parse(raw);
            if (Array.isArray(sessions)) {
              const seen = new Set();
              const uniqueSessions = sessions.filter((s: any) => {
                const isDuplicate = seen.has(s.date);
                seen.add(s.date);
                return !isDuplicate;
              });

              if (uniqueSessions.length !== sessions.length) {
                localStorage.setItem(key, JSON.stringify(uniqueSessions));
              }
            }
          } catch (e) {
            console.error("Migration v8 failed:", e);
          }
        }
      }

      if (storedVersion < 9) {
        const key = "sessions_v5";
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const sessions: Session[] = JSON.parse(raw);
            if (Array.isArray(sessions)) {
              const mergedMap = new Map();

              sessions.forEach((s) => {
                const dateKey = s.date; // Используем дату как ключ для объединения
                if (mergedMap.has(dateKey)) {
                  const existing = mergedMap.get(dateKey);

                  // Взвешенная точность перед обновлением слов
                  const totalWords = existing.wordsReviewed + s.wordsReviewed;
                  const weightedAcc =
                    totalWords > 0
                      ? (existing.accuracy * existing.wordsReviewed +
                          s.accuracy * s.wordsReviewed) /
                        totalWords
                      : existing.accuracy;

                  existing.duration += s.duration;
                  existing.wordsReviewed += s.wordsReviewed;
                  existing.accuracy = Math.round(weightedAcc);
                  // Можно также объединить другие поля, если есть
                } else {
                  mergedMap.set(dateKey, { ...s });
                }
              });

              const mergedSessions = Array.from(mergedMap.values());
              localStorage.setItem(key, JSON.stringify(mergedSessions));
            }
          } catch (e) {
            console.error("Migration v9 failed:", e);
          }
        }
      }

      if (storedVersion < 10) {
        const key = "user_stats_v5";
        const raw = safeGetItem(key);
        if (raw) {
          const stats = JSON.parse(raw);
          if (stats.weeklyXp === undefined) stats.weeklyXp = 0;
          if (stats.league === undefined) stats.league = "Bronze";
          if (stats.lastWeekId === undefined) stats.lastWeekId = "";
          localStorage.setItem(key, JSON.stringify(stats));
        }
      }

      localStorage.setItem(LS_KEYS.DB_VERSION, String(CURRENT_DB_VERSION));
    } catch (e) {
      console.error("Migration failed:", e);
    }
  };
  runMigrations();

  const load = <T>(key: string, def: T): T => {
    const val = safeGetItem(key);
    if (!val) return def;
    try {
      return JSON.parse(val);
    } catch (e) {
      console.warn(
        `⚠️ Corrupted data for key "${key}". Resetting to default.`,
        e,
      );
      return def;
    }
  };

  state.userStats = load(LS_KEYS.USER_STATS, state.userStats);
  state.learned = new Set(load(LS_KEYS.LEARNED, []));
  state.mistakes = new Set(load(LS_KEYS.MISTAKES, []));
  state.favorites = new Set(load(LS_KEYS.FAVORITES, []));
  const loadedHistory = load(LS_KEYS.WORD_HISTORY, {});
  state.wordHistory = Object.assign(Object.create(null), loadedHistory);
  state.streak = load(LS_KEYS.STREAK, { count: 0, lastDate: null });
  if (state.streak.count === undefined) state.streak.count = 0;
  if (state.streak.lastDate === undefined) state.streak.lastDate = null;
  state.sessions = load(LS_KEYS.SESSIONS, state.sessions);
  state.achievements = load(LS_KEYS.ACHIEVEMENTS, state.achievements);
  state.dailyChallenge = load("daily_challenge_v1", {
    lastDate: null,
    completed: false,
    streak: 0,
  });
  if (state.dailyChallenge.lastDate === undefined)
    state.dailyChallenge.lastDate = null;
  if (state.dailyChallenge.completed === undefined)
    state.dailyChallenge.completed = false;
  if (state.dailyChallenge.streak === undefined)
    state.dailyChallenge.streak = 0;
  state.searchHistory = load(LS_KEYS.SEARCH_HISTORY, []);
  state.customWords = load(LS_KEYS.CUSTOM_WORDS, []);
  state.wordRequests = load(LS_KEYS.WORD_REQUESTS, []);
  state.purchasedItems = load(LS_KEYS.PURCHASED_ITEMS, []);
  state.settingsUpdatedAt = Number(safeGetItem("settings_updated_at")) || 0;

  // Загрузка сжатого словаря
  const cachedVocab = safeGetItem(LS_KEYS.VOCAB_CACHE);
  if (cachedVocab) {
    try {
      // Убрана декомпрессия, парсим напрямую
      const parsed = JSON.parse(cachedVocab);

      // Валидация схемы: проверяем, что это массив и ВСЕ элементы имеют обязательные поля.
      // Метод .every() работает очень быстро (менее 10мс для 10,000 элементов) и не блокирует UI.
      const isValid =
        Array.isArray(parsed) &&
        parsed.every(
          (item: Word) =>
            item &&
            typeof item === "object" &&
            "id" in item &&
            "word_kr" in item,
        );

      if (isValid) {
        state.dataStore = parsed;
      } else {
        throw new Error("Invalid vocabulary schema in cache");
      }
    } catch (e) {
      console.warn("Failed to parse vocabulary cache, resetting.", e);
      localStorage.removeItem(LS_KEYS.VOCAB_CACHE);
      state.dataStore = [];
    }
  }
  state.studyGoal = load(LS_KEYS.STUDY_GOAL, { type: "words", target: 10 });
  state.favoriteQuotes = load(LS_KEYS.FAVORITE_QUOTES, []);
  state.dirtyWordIds = new Set(load(LS_KEYS.DIRTY_IDS, []));
  state.trashRetentionDays =
    safeGetItem(LS_KEYS.TRASH_RETENTION) !== null
      ? Number(safeGetItem(LS_KEYS.TRASH_RETENTION))
      : 30;
  state.quizDifficulty = localStorage.getItem(LS_KEYS.QUIZ_DIFFICULTY) || "all";
  state.quizTopic = localStorage.getItem(LS_KEYS.QUIZ_TOPIC) || "all";
  state.quizCategory = localStorage.getItem(LS_KEYS.QUIZ_CATEGORY) || "all";

  if (state.userStats.sprintRecord === undefined)
    state.userStats.sprintRecord = 0;
  if (state.userStats.survivalRecord === undefined)
    state.userStats.survivalRecord = 0;
  if (state.userStats.coins === undefined) state.userStats.coins = 0;
  if (state.userStats.streakFreeze === undefined)
    state.userStats.streakFreeze = 0;
  if (state.userStats.lastDailyReward === undefined)
    state.userStats.lastDailyReward = null;
  if (state.userStats.dailyRewardStreak === undefined)
    state.userStats.dailyRewardStreak = 0;
  if (state.userStats.survivalHealth === undefined)
    state.userStats.survivalHealth = 0;
  if (state.userStats.timeFreeze === undefined) state.userStats.timeFreeze = 0;
  if (state.userStats.skipQuestion === undefined)
    state.userStats.skipQuestion = 0;
  if (state.userStats.fiftyFifty === undefined) state.userStats.fiftyFifty = 0;
  if (state.userStats.weeklyXp === undefined) state.userStats.weeklyXp = 0;
  if (state.userStats.league === undefined) state.userStats.league = "Bronze";
  if (state.userStats.lastWeekId === undefined) state.userStats.lastWeekId = "";
} catch (e) {
  console.error("State init error:", e);
}

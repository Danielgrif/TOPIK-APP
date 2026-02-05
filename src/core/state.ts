/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
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
}

export const CURRENT_DB_VERSION = 9;

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
    achievements: [],
    survivalHealth: 0,
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

  currentStar: "all",
  currentTopic: ["all"],
  currentCategory: ["all"],
  currentType: "word",
  hanjaMode: localStorage.getItem(LS_KEYS.HANJA_MODE) === "true",
  currentVoice: localStorage.getItem(LS_KEYS.VOICE_PREF) || "female",
  audioSpeed:
    localStorage.getItem(LS_KEYS.AUDIO_SPEED) !== null
      ? Number(localStorage.getItem(LS_KEYS.AUDIO_SPEED))
      : 0.9,
  darkMode: localStorage.getItem(LS_KEYS.DARK_MODE) === "true",
  focusMode: false, // Отключаем сохранение состояния при перезагрузке
  zenMode: localStorage.getItem(LS_KEYS.ZEN_MODE) === "true",
  viewMode: localStorage.getItem(LS_KEYS.VIEW_MODE) || "grid",
  themeColor: localStorage.getItem(LS_KEYS.THEME_COLOR) || "purple",
  autoUpdate: localStorage.getItem(LS_KEYS.AUTO_UPDATE) !== "false",
  autoTheme: localStorage.getItem(LS_KEYS.AUTO_THEME) === "true",
  backgroundMusicEnabled:
    localStorage.getItem(LS_KEYS.MUSIC_ENABLED) === "true",
  backgroundMusicVolume:
    localStorage.getItem(LS_KEYS.MUSIC_VOLUME) !== null
      ? Number(localStorage.getItem(LS_KEYS.MUSIC_VOLUME))
      : 0.3,
  ttsVolume:
    localStorage.getItem(LS_KEYS.TTS_VOLUME) !== null
      ? Number(localStorage.getItem(LS_KEYS.TTS_VOLUME))
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
  quizDifficulty: localStorage.getItem(LS_KEYS.QUIZ_DIFFICULTY) || "all",
  quizTopic: localStorage.getItem(LS_KEYS.QUIZ_TOPIC) || "all",
  quizCategory: localStorage.getItem(LS_KEYS.QUIZ_CATEGORY) || "all",

  isSyncing: false,

  sessionActive: false,
  sessionSeconds: 0,
  sessionInterval: null,
  sessionWordsReviewed: 0,
  currentUser: null,
};

try {
  const runMigrations = () => {
    try {
      const storedVersion = Number(
        localStorage.getItem(LS_KEYS.DB_VERSION) || "0",
      );
      if (storedVersion >= CURRENT_DB_VERSION) return;

      // 🛡️ Автоматическое создание резервной копии перед миграцией
      console.log("🛡️ Creating safety backup before migration...");
      createLocalBackup();

      console.log(
        `🔄 Migrating data from v${storedVersion} to v${CURRENT_DB_VERSION}...`,
      );

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
          const val = localStorage.getItem(oldKey);
          if (val && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, val);
          }
        });
      }

      if (storedVersion < 6) {
        const key = "user_stats_v5";
        const raw = localStorage.getItem(key);
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
            console.log(
              "✅ Migration v6 applied: user_stats structure updated",
            );
          } catch (e) {
            console.error("Migration v6 failed:", e);
          }
        }
      }

      if (storedVersion < 7) {
        const key = "sessions_v5";
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const sessions = JSON.parse(raw);
            if (Array.isArray(sessions)) {
              const updatedSessions = sessions.map((s: any) => ({
                ...s,
                platform: s.platform || "web", // Значение по умолчанию
              }));
              localStorage.setItem(key, JSON.stringify(updatedSessions));
              console.log("✅ Migration v7 applied: sessions array updated");
            }
          } catch (e) {
            console.error("Migration v7 failed:", e);
          }
        }
      }

      if (storedVersion < 8) {
        const key = "sessions_v5";
        const raw = localStorage.getItem(key);
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
                console.log(
                  `✅ Migration v8 applied: removed ${sessions.length - uniqueSessions.length} duplicate sessions`,
                );
              }
            }
          } catch (e) {
            console.error("Migration v8 failed:", e);
          }
        }
      }

      if (storedVersion < 9) {
        const key = "sessions_v5";
        const raw = localStorage.getItem(key);
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
              console.log(
                `✅ Migration v9 applied: merged ${sessions.length} sessions into ${mergedSessions.length}`,
              );
            }
          } catch (e) {
            console.error("Migration v9 failed:", e);
          }
        }
      }

      localStorage.setItem(LS_KEYS.DB_VERSION, String(CURRENT_DB_VERSION));
    } catch (e) {
      console.error("Migration failed:", e);
    }
  };
  runMigrations();

  const load = <T>(key: string, def: T): T => {
    const val = localStorage.getItem(key);
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

  // Загрузка сжатого словаря
  const cachedVocab = localStorage.getItem(LS_KEYS.VOCAB_CACHE);
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
      console.warn("Failed to decompress vocabulary cache, resetting.", e);
      localStorage.removeItem(LS_KEYS.VOCAB_CACHE);
      state.dataStore = [];
    }
  }
  state.studyGoal = load(LS_KEYS.STUDY_GOAL, { type: "words", target: 10 });
  state.favoriteQuotes = load(LS_KEYS.FAVORITE_QUOTES, []);
  state.dirtyWordIds = new Set(load(LS_KEYS.DIRTY_IDS, []));
  state.trashRetentionDays =
    localStorage.getItem(LS_KEYS.TRASH_RETENTION) !== null
      ? Number(localStorage.getItem(LS_KEYS.TRASH_RETENTION))
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
  if (state.userStats.survivalHealth === undefined)
    state.userStats.survivalHealth = 0;
} catch (e) {
  console.error("State init error:", e);
}

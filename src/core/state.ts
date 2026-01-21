import {
  Word,
  UserStats,
  WordHistoryItem,
  DailyChallenge,
  StudyGoal,
  MusicTrack,
} from "../types/index.ts";
import { decompress } from "../utils/utils.ts";

export interface Session {
  date: string;
  duration: number;
  wordsReviewed: number;
  accuracy: number;
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
  favoriteQuotes: any[];
  dirtyWordIds: Set<string | number>;

  currentStar: string;
  currentTopic: string[];
  currentCategory: string;
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
}

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
  wordHistory: {},
  streak: { count: 0, lastDate: null },
  sessions: [],
  achievements: [],
  dailyChallenge: { lastDate: null, completed: false, streak: 0 },
  searchHistory: [],
  customWords: [],
  studyGoal: { type: "words", target: 10 },
  favoriteQuotes: [],
  dirtyWordIds: new Set(),

  currentStar: "all",
  currentTopic: ["all"],
  currentCategory: "all",
  currentType: "word",
  hanjaMode: localStorage.getItem("hanja_mode_v1") === "true",
  currentVoice: localStorage.getItem("voice_pref") || "female",
  audioSpeed:
    localStorage.getItem("audio_speed_v1") !== null
      ? Number(localStorage.getItem("audio_speed_v1"))
      : 0.9,
  darkMode: localStorage.getItem("dark_mode_v1") === "true",
  focusMode: localStorage.getItem("focus_mode_v1") === "true",
  zenMode: localStorage.getItem("zen_mode_v1") === "true",
  viewMode: localStorage.getItem("view_mode_v1") || "grid",
  themeColor: localStorage.getItem("theme_color_v1") || "purple",
  autoUpdate: localStorage.getItem("auto_update_v1") !== "false",
  autoTheme: localStorage.getItem("auto_theme_v1") === "true",
  backgroundMusicEnabled:
    localStorage.getItem("background_music_enabled_v1") === "true",
  backgroundMusicVolume:
    localStorage.getItem("background_music_volume_v1") !== null
      ? Number(localStorage.getItem("background_music_volume_v1"))
      : 0.3,
  ttsVolume:
    localStorage.getItem("tts_volume_v1") !== null
      ? Number(localStorage.getItem("tts_volume_v1"))
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
  quizDifficulty: "all",
  quizTopic: "all",
  quizCategory: "all",

  isSyncing: false,

  sessionActive: false,
  sessionSeconds: 0,
  sessionInterval: null,
  sessionWordsReviewed: 0,
};

try {
  const load = <T>(key: string, def: T): T => {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : def;
  };

  state.userStats = load("user_stats_v5", state.userStats);
  state.learned = new Set(load("learned_v5", []));
  state.mistakes = new Set(load("mistakes_v5", []));
  state.favorites = new Set(load("favorites_v5", []));
  state.wordHistory = load("word_history_v5", state.wordHistory);
  state.streak = load("streak_v5", { count: 0, lastDate: null });
  if (state.streak.count === undefined) state.streak.count = 0;
  if (state.streak.lastDate === undefined) state.streak.lastDate = null;
  state.sessions = load("sessions_v5", state.sessions);
  state.achievements = load("achievements_v5", state.achievements);
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
  state.searchHistory = load("search_history_v1", []);
  state.customWords = load("custom_words_v1", []);
  
  // Загрузка сжатого словаря
  const cachedVocab = localStorage.getItem("vocabulary_cache_v1");
  if (cachedVocab) {
    try {
      // Пробуем распаковать. Если не получается (старый формат), парсим как есть.
      const decompressed = cachedVocab.startsWith("[") ? cachedVocab : decompress(cachedVocab);
      state.dataStore = JSON.parse(decompressed);
    } catch (e) {
      console.warn("Failed to decompress vocabulary cache, resetting.", e);
      localStorage.removeItem("vocabulary_cache_v1");
      state.dataStore = [];
    }
  }
  state.studyGoal = load("study_goal_v1", { type: "words", target: 10 });
  state.favoriteQuotes = load("favorite_quotes_v1", []);
  state.dirtyWordIds = new Set(load("dirty_ids_v1", []));
  state.quizDifficulty = localStorage.getItem("quiz_difficulty_v1") || "all";
  state.quizTopic = localStorage.getItem("quiz_topic_v1") || "all";
  state.quizCategory = localStorage.getItem("quiz_category_v1") || "all";

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

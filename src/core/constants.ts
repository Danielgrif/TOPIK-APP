/**
 * Централизованные константы для всего приложения.
 */

// Ключи для localStorage
export const LS_KEYS = {
  DB_VERSION: "db_version",
  USER_STATS: "user_stats_v5",
  LEARNED: "learned_v5",
  MISTAKES: "mistakes_v5",
  FAVORITES: "favorites_v5",
  WORD_HISTORY: "word_history_v5",
  STREAK: "streak_v5",
  SESSIONS: "sessions_v5",
  ACHIEVEMENTS: "achievements_v5",
  DIRTY_IDS: "dirty_ids_v1",
  CUSTOM_WORDS: "custom_words_v1",
  FAVORITE_QUOTES: "favorite_quotes_v1",
  TRASH_RETENTION: "trash_retention_v1",
  PURCHASED_ITEMS: "purchased_items_v1",
  VOCAB_CACHE: "vocabulary_cache_v1",
  VOCAB_VERSION: "vocabulary_version",
  SEARCH_HISTORY: "search_history_v1",
  WORD_REQUESTS: "word_requests_state_v1",
  STUDY_GOAL: "study_goal_v1",
  ONBOARDING: "onboarding_completed_v1",
  PWA_BANNER_DISMISSED: "pwa_banner_dismissed_v1",
  // Настройки
  HANJA_MODE: "hanja_mode_v1",
  VOICE_PREF: "voice_pref",
  AUDIO_SPEED: "audio_speed_v1",
  DARK_MODE: "dark_mode_v1",
  ZEN_MODE: "zen_mode_v1",
  VIEW_MODE: "view_mode_v1",
  THEME_COLOR: "theme_color_v1",
  AUTO_UPDATE: "auto_update_v1",
  AUTO_THEME: "auto_theme_v1",
  MUSIC_ENABLED: "background_music_enabled_v1",
  MUSIC_VOLUME: "background_music_volume_v1",
  TTS_VOLUME: "tts_volume_v1",
  QUIZ_DIFFICULTY: "quiz_difficulty_v1",
  QUIZ_TOPIC: "quiz_topic_v1",
  QUIZ_CATEGORY: "quiz_category_v1",
  // Резервное копирование
  SAFETY_BACKUP: "safety_backup_v1",
};

// Имена таблиц Supabase
export const DB_TABLES = {
  VOCABULARY: "vocabulary",
  QUOTES: "quotes",
  USER_PROGRESS: "user_progress",
  USER_GLOBAL_STATS: "user_global_stats",
  WORD_REQUESTS: "word_requests",
  USER_LISTS: "user_lists",
  LIST_ITEMS: "list_items",
};

// Имена бакетов Supabase Storage
export const DB_BUCKETS = {
  AUDIO: "audio-files",
  IMAGES: "image-files",
};

// Статусы заявок на слова
export const WORD_REQUEST_STATUS = {
  PENDING: "pending",
  AI: "ai",
  AUDIO: "audio",
  DONE: "done",
  PROCESSED: "processed",
  ERROR: "error",
};

// Типы сообщений для Service Worker
export const SW_MESSAGES = {
  SKIP_WAITING: "SKIP_WAITING",
  PROCESS_DOWNLOAD_QUEUE: "PROCESS_DOWNLOAD_QUEUE",
  DOWNLOAD_QUEUE_COMPLETED: "DOWNLOAD_QUEUE_COMPLETED",
};

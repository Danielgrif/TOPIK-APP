export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  USER_VOCABULARY: "user_vocabulary",
  ARTICLES: "articles",
  USER_FAVORITE_QUOTES: "user_favorite_quotes",
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
  // Дополнительные статусы для внутренних процессов
  AUDIO_RETRY: "audio_retry",
};

// Шаги обработки, на которых может произойти сбой
export const PROCESSING_STEPS = {
  AI_PROCESSING: "ai_processing",
  DB_INSERT: "db_insert",
  AUDIO_GENERATION: "audio_generation",
};

// Имена функций Supabase
export const FUNCTION_NAMES = {
  GENERATE_WORD_DATA: "generate-word-data",
  REGENERATE_IMAGE: "regenerate-image",
  GENERATE_AUDIO: "generate-audio",
  PROCESS_WORD_REQUEST: "process-word-request",
  AI_TEACHER: "ai-teacher",
  CHECK_ESSAY: "check-essay",
};

// Модели Gemini
export const GEMINI_MODELS = {
  // Для генерации данных о слове и общих задач
  FLASH: "gemini-1.5-flash-latest",
  PRO: "gemini-pro",
  // Для сложных задач (анализ эссе)
  PRO_1_5: "gemini-1.5-pro-latest",
};

// Голоса для Google Text-to-Speech
export const TTS_VOICES = {
  FEMALE: "ko-KR-Wavenet-A",
  MALE: "ko-KR-Wavenet-D",
};

// Базовые URL для внешних API
export const API_URLS = {
  GOOGLE_TTS: "https://texttospeech.googleapis.com/v1/text:synthesize",
  PIXABAY: "https://pixabay.com/api/",
  UNSPLASH: "https://api.unsplash.com/search/photos",
  PEXELS: "https://api.pexels.com/v1/search",
  GEMINI_IMAGE_GEN_BASE: "https://generativelanguage.googleapis.com/v1beta/models/",
};

// Действия для функции ai-teacher
export const AI_TEACHER_ACTIONS = {
  EXPLAIN_GRAMMAR: "explain-grammar",
  GENERATE_EXAMPLES: "generate-examples",
  GENERATE_SYNONYMS: "generate-synonyms",
};

// Константы для фоновых задач
export const WORKER_CONSTANTS = {
  BATCH_SIZE: 10,
};
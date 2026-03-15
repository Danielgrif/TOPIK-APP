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
  AI_CACHE: "ai_cache",
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
  PROCESS_WORD_REQUEST: "process-word-request",
  AI_TEACHER: "ai-teacher",
  CHECK_ESSAY: "check-essay",
  // Новые функции
  GENERATE_MEDIA: "generate-media-for-word",
  RETRY_WORD_REQUEST: "retry-word-request",
  GENERATE_QUOTE_AUDIO: "generate-quote-audio",
};

// Модели Gemini
export const GEMINI_MODELS = {
  // Для генерации данных о слове и общих задач
  FLASH: "gemini-2.5-flash",
  PRO: "gemini-2.5-pro",
  // Для сложных задач (анализ эссе)
  PRO_1_5: "gemini-3.1-pro-preview",
};

// Голоса для Microsoft Edge TTS (Neural)
export const TTS_VOICES = {
  FEMALE: "ko-KR-SunHiNeural",
  MALE: "ko-KR-InJoonNeural",
};

// Базовые URL для внешних API
export const API_URLS = {
  // Google TTS больше не используется, заменен на Edge TTS
  EDGE_TTS: "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4",
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

// Списки для валидации в AI промптах
export const VALID_TOPICS = [
  "일상생활 (Повседневная жизнь)", "음식 (Еда)", "여행 (Путешествия)",
  "교육 (Образование)", "직장 (Работа)", "건강 (Здоровье)",
  "자연 (Природа)", "인간관계 (Отношения)", "쇼핑 (Покупки)",
  "문화 (Культура)", "정치/경제 (Политика/Экономика)", "기타 (Другое)",
];

export const VALID_CATEGORIES = [
  "명사 (Существительные)", "동사 (Глаголы)", "형용사 (Прилагательные)",
  "부사 (Наречия)", "조사 (Частицы)", "관용구 (Идиомы)",
  "문구 (Фразы)", "문법 (Грамматика)",
];

// Константы для фоновых задач
export const WORKER_CONSTANTS = {
  BATCH_SIZE: 10,
};
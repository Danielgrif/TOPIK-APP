// supabase/functions/constants.ts
// Единые константы для всех Edge Functions — включая модели Gemini.

export const GEMINI_MODELS = {
  /** Быстрая и недорогая модель для простых задач (генерация слов, медиа). */
  FLASH: "models/gemini-1.5-flash-latest",
  /** Мощная модель для сложных задач (проверка эссе, генерация контента). */
  PRO: "models/gemini-1.5-pro-latest",
} as const;

export const LIMITS = {
  MAX_WORDS_PER_REQUEST: 50,
  MAX_WORD_LENGTH: 100,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5 МБ
  MAX_FEEDBACK_ATTACHMENTS: 5,
  MAX_FEEDBACK_ATTACHMENT_SIZE_BYTES: 10 * 1024 * 1024, // 10 МБ
  AI_TIMEOUT_MS: 60_000,
  FETCH_TIMEOUT_MS: 15_000,
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_FEEDBACK_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
} as const;

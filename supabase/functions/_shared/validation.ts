import { HttpError } from "./utils.ts";
import { LIMITS } from "./constants.ts";

/** Читает JSON-объект из тела запроса. GET-запросы не должны его читать. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError("Request body must be a JSON object", 400);
  }
  return body as Record<string, unknown>;
}

/** Строка с ограничением длины (и опциональным минимумом). */
export function requireString(
  value: unknown,
  field: string,
  maxLength: number,
  minLength = 1,
): string {
  if (typeof value !== "string") {
    throw new HttpError(`Missing or invalid '${field}'`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new HttpError(
      `'${field}' must be between ${minLength} and ${maxLength} characters`,
      400,
    );
  }
  return trimmed;
}

export function requireOneOf<T extends string>(
  value: unknown,
  allowed: ReadonlyArray<T>,
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(`Invalid '${field}'`, 400);
  }
  return value as T;
}

/** Разрешённые MIME-типы изображений (JPEG/PNG/WebP). */
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface ValidImage {
  data: string;
  mimeType: string;
}

/** Валидация base64-изображения ДО отправки в Gemini. */
export function validateImageInput(value: unknown): ValidImage | null {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Invalid 'image'", 400);
  }

  const data = (value as { data?: unknown }).data;
  const mimeType = (value as { mimeType?: unknown }).mimeType;

  if (typeof data !== "string" || !/^[A-Za-z0-9+/=\r\n]+$/.test(data)) {
    throw new HttpError("Invalid 'image.data' (base64 expected)", 400);
  }
  if (data.length > LIMITS.MAX_IMAGE_BASE64_LENGTH) {
    throw new HttpError("Image is too large", 413);
  }
  if (typeof mimeType !== "string" || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new HttpError("Unsupported image MIME type", 415);
  }

  // Приблизительная проверка реального размера Decode base64.
  const padding = (data.match(/=+$/) || [""])[0].length;
  const byteLength = Math.floor((data.length * 3) / 4) - padding;
  if (byteLength > LIMITS.MAX_IMAGE_BYTES) {
    throw new HttpError("Image is too large", 413);
  }

  return { data: data.replace(/\r\n/g, ""), mimeType };
}

/** Ограниченный список слов для генерации данных. */
export function validateWords(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : null;
  if (!raw || raw.length === 0) {
    throw new HttpError("Missing 'word' or 'words'", 400);
  }
  if (raw.length > LIMITS.MAX_WORDS_PER_REQUEST) {
    throw new HttpError(`Too many words (max ${LIMITS.MAX_WORDS_PER_REQUEST})`, 400);
  }
  const words = raw.map((w) => requireString(w, "word", LIMITS.MAX_WORD_LENGTH));
  if (words.some((w) => !/^[\p{L}\p{N}\s.,?!~'-]+$/u.test(w))) {
    throw new HttpError("Invalid characters in word list", 400);
  }
  return words;
}

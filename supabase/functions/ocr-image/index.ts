// supabase/functions/ocr-image/index.ts
// Распознавание текста с изображения (OCR) через Gemini Vision.
// Клиент вызывает эту функцию из ui_writing.ts при загрузке изображения задачи.
import { serve } from "std/http/server.ts";
import { getGeminiClient } from "../_shared/clients.ts";
import { GEMINI_MODELS, LIMITS } from "../_shared/constants.ts";
import {
  corsPreflightResponse,
  createErrorResponse,
  HttpError,
  jsonResponse,
  withTimeout,
} from "../_shared/utils.ts";
import { readJsonObject, validateImageInput } from "../_shared/validation.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const OCR_PROMPT = `Распознай весь текст на этом изображении.
Верни ТОЛЬКО JSON-объект с одним полем "text", содержащим распознанный текст.
Сохрани переносы строк и оригинальную разметку текста.
Если на изображении корейский текст, верни его как есть, без перевода.
Если текст неразборчив, верни пустую строку в поле "text".
Не добавляй markdown-обёртки и никакой текста вне JSON.`;

// JSON-ответ, который ожидает клиент (ui_writing.ts читает data.text)
interface OcrResult {
  text: string;
}

function parseOcrJson(raw: string): OcrResult {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    // Модель вернула не JSON — принимаем весь текст как результат
    return { text: raw.trim() };
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return {
      text: typeof parsed.text === "string" ? parsed.text : raw.trim(),
    };
  } catch {
    return { text: raw.trim() };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    // Проверяем аутентификацию пользователя (JWT через verify_jwt = true,
    // но ещё раз подтверждаем на уровне функции для защищённости)
    await getAuthenticatedUser(req);

    const body = await readJsonObject(req);
    const image = validateImageInput(body.image);

    if (!image) {
      throw new HttpError("Missing or invalid 'image'", 400);
    }

    const model = getGeminiClient().getGenerativeModel({
      model: GEMINI_MODELS.FLASH,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    const response = await withTimeout(
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: OCR_PROMPT },
              { inlineData: { mimeType: image.mimeType, data: image.data } },
            ],
          },
        ],
      }),
      LIMITS.AI_TIMEOUT_MS,
      "OCR recognition timed out",
    );

    const rawText = response.response.text();
    const result: OcrResult = parseOcrJson(rawText);

    return jsonResponse({ text: result.text });
  } catch (error) {
    return createErrorResponse(error);
  }
});

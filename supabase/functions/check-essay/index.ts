import { serve } from "std/http/server.ts";
import { getGeminiClient } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { GEMINI_MODELS, LIMITS } from "shared/constants.ts";
import {
  corsPreflightResponse,
  createErrorResponse,
  HttpError,
  jsonResponse,
  withTimeout,
} from "shared/utils.ts";
import { readJsonObject, requireOneOf, requireString, validateImageInput } from "shared/validation.ts";

const TASK_TYPES = ["51", "52", "53", "54"] as const;

interface EssayCorrection {
  original: string;
  corrected: string;
  reason: string;
}

interface EssayResult {
  score: number;
  feedback: string;
  corrections: EssayCorrection[];
  improved_version: string;
}

/** Достаём JSON из ответа Gemini, даже если модель добавила обёртку ```json. */
function parseModelJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new HttpError("AI returned a non-JSON response", 502);
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new HttpError("AI returned malformed JSON", 502);
  }
}

/** Жёсткая валидация ответа: контракт совпадает с ожиданием клиента. */
function validateEssayResult(value: unknown): EssayResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Invalid AI response shape", 502);
  }
  const raw = value as Record<string, unknown>;

  if (typeof raw.score !== "number" || !Number.isFinite(raw.score)) {
    throw new HttpError("Invalid AI score", 502);
  }
  const score = Math.max(0, Math.min(10, Math.round(raw.score * 10) / 10));
  const feedback = requireString(raw.feedback, "feedback", 4000);

  if (!Array.isArray(raw.corrections) || raw.corrections.length > 20) {
    throw new HttpError("Invalid AI corrections", 502);
  }
  const corrections: EssayCorrection[] = raw.corrections.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpError("Invalid AI correction", 502);
    }
    const c = item as Record<string, unknown>;
    return {
      original: requireString(c.original, "original", 500),
      corrected: requireString(c.corrected, "corrected", 500),
      reason: requireString(c.reason, "reason", 1000),
    };
  });

  const improved = raw.improved_version;
  if (improved !== undefined && typeof improved !== "string") {
    throw new HttpError("Invalid AI improved_version", 502);
  }

  return {
    score,
    feedback,
    corrections,
    improved_version: typeof improved === "string" ? improved.slice(0, 8000) : "",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    // [SECURITY] Проверяем аутентификацию пользователя по JWT.
    const { user } = await getAuthenticatedUser(req);

    const body = await readJsonObject(req);
    const taskType = requireOneOf(body.taskType, TASK_TYPES, "taskType");
    const question =
      body.question === undefined || body.question === null
        ? ""
        : requireString(body.question, "question", LIMITS.MAX_QUESTION_LENGTH, 0);
    const answer = requireString(body.answer, "answer", LIMITS.MAX_ANSWER_LENGTH);
    // OCR-изображение может заменить текстовую формулировку задания.
    const image = validateImageInput(body.image);

    if (!question && !image) {
      throw new HttpError("Provide a question or an image of the task", 400);
    }

    const promptParts: string[] = [
      "You are an official TOPIK II writing examiner.",
      `Task type: ${taskType}`,
      `Task prompt: ${question || "(see the image attached below)"}`,
      `Student answer: ${answer}`,
      "",
      "Evaluate the answer and return ONLY a JSON object with exactly these fields:",
      '{"score": number from 0 to 10, "feedback": string in Russian,',
      '"corrections": [{"original": string, "corrected": string, "reason": string in Russian}],',
      '"improved_version": string with an improved Korean answer}',
      "Feedback and reasons must be in Russian. Corrected text must be in Korean.",
      "If there are no mistakes, corrections must be an empty array.",
      "Do not include markdown or any text outside the JSON object.",
    ];

    // Модель берём из существующих констант проекта.
    const model = getGeminiClient().getGenerativeModel({
      model: GEMINI_MODELS.FLASH,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    const parts: (
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    )[] = [{ text: promptParts.join("\n") }];
    if (image) {
      parts.push({
        inlineData: { mimeType: image.mimeType, data: image.data },
      });
    }

    console.log(`📝 Essay check for user ${user.id}: taskType=${taskType}`);
    const response = await withTimeout(
      model.generateContent({ contents: [{ role: "user", parts }] }),
      LIMITS.AI_TIMEOUT_MS,
      "Essay check timed out",
    );

    const result = validateEssayResult(parseModelJson(response.response.text()));
    return jsonResponse(result);
  } catch (error) {
    return createErrorResponse(error);
  }
});

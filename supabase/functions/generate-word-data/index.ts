import { serve } from "std/http/server.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { getSupabaseAdmin } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { DB_TABLES, LIMITS } from "shared/constants.ts";
import {
  corsPreflightResponse,
  createErrorResponse,
  jsonResponse,
  withTimeout,
} from "shared/utils.ts";
import { readJsonObject, validateWords } from "shared/validation.ts";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") ?? "");

// =========================
// 🧠 ZOD
// =========================
const WordSchema = z.object({
  word_kr: z.string(),
  translation: z.string(),
  example_kr: z.string().optional(),
  example_ru: z.string().optional(),
  topik_level: z.string().optional(),
  synonyms: z.string().optional(),
  antonyms: z.string().optional(),
  word_hanja: z.string().optional(),
  topic: z.string().optional(),
  category: z.string().optional(),
  grammar_info: z.string().optional(),
  collocations: z.string().optional(),
});

const ResponseSchema = z.union([WordSchema, z.array(WordSchema)]);

type WordItem = z.infer<typeof WordSchema>;

// =========================
// 📊 MODELS (AUTO ROUTER)
// =========================
type ModelStats = {
  name: string;
  score: number;
  success: number;
  fail: number;
  blockedUntil: number;
};

const BASE_MODELS: ReadonlyArray<{ name: string; score: number }> = [
  { name: "models/gemini-3.1-flash-lite", score: 100 },
  { name: "models/gemini-3-flash", score: 90 },
  { name: "models/gemini-2.5-flash", score: 80 },
  { name: "models/gemini-flash-latest", score: 70 },
];

const models: ModelStats[] = BASE_MODELS.map((m) => ({
  ...m,
  success: 0,
  fail: 0,
  blockedUntil: 0,
}));

function getBestModels(): ModelStats[] {
  return models
    .filter((m) => Date.now() > m.blockedUntil)
    .sort((a, b) => b.score + b.success * 2 - b.fail * 5 - (a.score + a.success * 2 - a.fail * 5));
}

function blockModel(m: ModelStats): void {
  m.fail++;
  m.blockedUntil = Date.now() + 30000; // Block for 30 seconds
}

function markSuccess(m: ModelStats): void {
  m.success++;
}

// =========================
// 🧠 PROMPT
// =========================
function buildPrompt(words: string[]): string {
  return `You are a Korean language dictionary API. Return a JSON array of objects for the given Korean words.
Each object MUST have these fields:
- "word_kr": the Korean word exactly as given
- "translation": Russian translation (concise, 1-3 words)
- "example_kr": example sentence in Korean using this word
- "example_ru": Russian translation of the example sentence
- "synonyms": comma-separated Korean synonyms (or "" if none)
- "antonyms": comma-separated Korean antonyms (or "" if none)
- "word_hanja": Hanja (Chinese characters) if applicable, otherwise ""
- "topic": thematic category in Russian (e.g. "Еда", "Путешествия", "Работа")
- "category": part of speech in Russian (e.g. "Существительное", "Глагол", "Прилагательное")
- "grammar_info": brief grammar note in Russian (e.g. "Неправильный глагол ㄹ")
- "topik_level": TOPIK level ("1" to "6")

Return ONLY valid JSON, no markdown, no extra text.
Words: ${words.join(", ")}`;
}

function simplePrompt(words: string[]): string {
  return `Return JSON:
[{"word_kr":"","translation":"","example_kr":"","example_ru":""}]
Words: ${words.join(", ")}
`;
}

// =========================
// 🔧 FIX JSON
// =========================
function autoFixJSON(text: string): string {
  let fixed = text.trim();
  const first = fixed.indexOf("{");
  const firstArr = fixed.indexOf("[");
  const start = firstArr !== -1 && firstArr < first ? firstArr : first;
  if (start > 0) fixed = fixed.slice(start);
  const lastBrace = fixed.lastIndexOf("}");
  const lastBracket = fixed.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (end !== -1) fixed = fixed.slice(0, end + 1);
  return fixed;
}

// =========================
// 🚀 GENERATE
// =========================
async function generate(prompt: string): Promise<{ text: string; model: string }> {
  for (const m of getBestModels()) {
    try {
      const model = genAI.getGenerativeModel({ model: m.name });
      const res = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
        LIMITS.AI_TIMEOUT_MS,
        "Word generation timed out",
      );
      const text = res.response.text();
      if (!text || text.length < 5) {
        blockModel(m);
        continue;
      }
      markSuccess(m);
      return { text, model: m.name };
    } catch (err: unknown) {
      console.log("❌ model fail:", m.name, err instanceof Error ? err.message : String(err));
      blockModel(m);
    }
  }
  throw new Error("All models failed");
}

async function generateSafe(words: string[]): Promise<{ items: WordItem[]; model: string }> {
  try {
    const ai = await generate(buildPrompt(words));
    const parsed = JSON.parse(autoFixJSON(ai.text));
    const result = ResponseSchema.safeParse(parsed);
    if (!result.success) throw new Error("Primary parse failed");
    const items = Array.isArray(result.data) ? result.data : [result.data];
    return { items, model: ai.model };
  } catch (e: unknown) {
    console.log("⚠️ fallback prompt after error:", e instanceof Error ? e.message : String(e));
    const ai = await generate(simplePrompt(words));
    const parsed = JSON.parse(autoFixJSON(ai.text));
    const result = ResponseSchema.safeParse(parsed);
    if (!result.success) throw new Error("Fallback parse also failed");
    const items = Array.isArray(result.data) ? result.data : [result.data];
    return { items, model: ai.model };
  }
}

// =========================
// 🌐 SERVER
// =========================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    // [SECURITY] Проверяем аутентификацию пользователя по JWT.
    const { user } = await getAuthenticatedUser(req);

    const body = await readJsonObject(req);

    // [SECURITY] Ограничиваем количество и длину слов до вызова Gemini.
    const words = validateWords(body.word !== undefined ? body.word : body.words);

    // 1. Проверка кеша (DB Cache)
    const supabase = getSupabaseAdmin();
    const cacheKey = `word-data:${words.map((w) => w.trim().toLowerCase()).join(",")}`;

    try {
      const { data: cached } = await supabase
        .from(DB_TABLES.AI_CACHE)
        .select("response_data")
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached?.response_data) {
        console.log(`⚡ Cache hit for user ${user.id}:`, cacheKey);
        return jsonResponse({
          success: true,
          data: cached.response_data,
        });
      }
    } catch (err) {
      // Не блокируем выполнение, если с кешем проблемы
      console.warn("⚠️ Cache read failed:", err);
    }

    // 2. Генерация, если в кеше нет
    console.log(`🤖 Generating word data for user ${user.id}:`, words.join(", "));
    const { items, model } = await generateSafe(words);

    // 3. Сохранение в кеш
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Ensure we are inserting an array
      const dataToCache = Array.isArray(items) ? items : [items];

      if (dataToCache.length > 0) {
        await supabase.from(DB_TABLES.AI_CACHE).insert({
          cache_key: cacheKey,
          response_data: dataToCache,
          expires_at: expiresAt.toISOString(),
        });
      }
    } catch (err) {
      console.error("❌ Cache write failed:", err);
    }

    return jsonResponse({
      success: true,
      data: items,
      model,
    });
  } catch (e) {
    return createErrorResponse(e);
  }
});

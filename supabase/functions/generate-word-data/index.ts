// supabase/functions/generate-word-data/index.ts
import { serve } from "std/http/server.ts";
import { SchemaType } from "@google/generative-ai";
import { corsHeaders, GEMINI_MODELS } from "shared/constants.ts";
import { selectBestModel } from "shared/gemini.ts";
import { getGeminiClient } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";
import type { WordData } from "shared/types.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

declare global {
  interface ImportMeta {
    env: {
      GOOGLE_API_KEY: string
    }
  }
}

const VALID_TOPICS = [
  "일상생활 (Повседневная жизнь)", "음식 (Еда)", "여행 (Путешествия)", 
  "교육 (Образование)", "직장 (Работа)", "건강 (Здоровье)", 
  "자연 (Природа)", "인간관계 (Отношения)", "쇼핑 (Покупки)", 
  "문화 (Культура)", "정치/경제 (Политика/Экономика)", "기타 (Другое)"
];

const VALID_CATEGORIES = [
  "명사 (Существительные)", "동사 (Глаголы)", "형용사 (Прилагательные)", 
  "부사 (Наречия)", "조사 (Частицы)", "관용구 (Идиомы)", 
  "문구 (Фразы)", "문법 (Грамматика)"
];

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📥 Request method:", req.method, "URL:", new URL(req.url).pathname);

    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed. Use POST.", 405);
    }

    // 1. Parse Request Body
    const rawBody = await req.text();
    console.log("📦 Raw request body:", rawBody);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("❌ JSON parse error:", e);
      body = {};
    }
    
    const word = typeof body === 'object' && body !== null && 'word' in body ? (body as Record<string, unknown>).word as string | undefined : undefined;
    if (!word || typeof word !== "string" || word.trim().length === 0) {
      return createErrorResponse("Missing or invalid 'word' in JSON body. Example: { \"word\": \"안녕\" }", 400);
    }

    const trimmedWord = word.trim();
    console.log("🔤 Обрабатываем слово:", trimmedWord);

    // 2. Initialize client from shared helper
    console.log("🤖 Инициализация GoogleGenAI...");
    const genai = getGeminiClient();
    
    // 4. Проверка доступных моделей и выбор лучшей
    const preferredModels = [GEMINI_MODELS.FLASH, GEMINI_MODELS.PRO, GEMINI_MODELS.PRO_1_5];
    const selectedModel = await selectBestModel(genai, preferredModels, GEMINI_MODELS.FLASH);
    console.log("🎯 Используем модель:", selectedModel);

    // 5. Initialize model с выбранной моделью
    const model = genai.getGenerativeModel({ 
      model: selectedModel,
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              word_kr: { type: SchemaType.STRING },
              translation: { type: SchemaType.STRING },
              frequency: { type: SchemaType.STRING },
              topik_level: { type: SchemaType.STRING },
              tone: { type: SchemaType.STRING },
              word_hanja: { type: SchemaType.STRING },
              topic: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
              level: { type: SchemaType.STRING },
              example_kr: { type: SchemaType.STRING },
              example_ru: { type: SchemaType.STRING },
              synonyms: { type: SchemaType.STRING },
              antonyms: { type: SchemaType.STRING },
              collocations: { type: SchemaType.STRING },
              grammar_info: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING }
            },
            required: ["word_kr", "translation", "level", "type"]
          }
        }
      }
    });

    // 6. Construct Detailed TOPIK Prompt (полный, без сокращений)
    const prompt = `You are an expert Korean language teacher for Russian speakers.
Analyze the following Korean word: '${trimmedWord}' for use in TOPIK II exam preparation. The response should be in Russian. Also find frequency of use for this word (high, medium, low), and approximately to which TOPIK level this word corresponds (TOPIK I, TOPIK II level 3, TOPIK II level 4, TOPIK II level 5, TOPIK II level 6). Always explain Hanja component if it is available.

### 1. Identification & Correction
- Detect if the input is Korean, a typo (e.g. 'gks' -> '한'), or Romanization (e.g. 'annyeong' -> '안녕').
- Use the **corrected Korean word** for analysis.
- Provide frequency of use AND TOPIK Level
- If the input is gibberish or not a valid Korean word, return: {"error": "Invalid input"}

### 2. Hanja Explanation 
- Always explain hanja component if it is available.

### 3. Analysis Rules
- If the word has multiple distinct meanings (homonyms), return a JSON ARRAY of objects (max 3 most common).
- If it has a single meaning, return a single JSON object instead of an array.
- **Strictly** follow the JSON structure below. Do NOT use Markdown formatting (no \`\`\`json).

### 4. JSON Structure
Each object must have:
- "word_kr": string (The corrected Korean word)
- "translation": string (Concise Russian translation, MUST be less than 4 words)
- "frequency": string ("high" or "medium" or "low")
- "topik_level": string ("TOPIK I", "TOPIK II level 3", "TOPIK II level 4", "TOPIK II level 5", "TOPIK II level 6")
- "tone": string (Describe the tone/register. Options: Formal, Informal, Poetic, Technical, Slang. Be consistent with example sentences.)
- "word_hanja": string (Hanja characters ONLY if applicable. Empty string if native Korean)
- "topic": string (One from: ${VALID_TOPICS.join(', ')}. If unsure, use "기타 (Другое)")
- "category": string (One from: ${VALID_CATEGORIES.join(', ')}. If unsure, use "기타 (Другое)")
- "level": string (One of: "★★★" (Beginner), "★★☆" (Intermediate), "★☆☆" (Advanced))
- "example_kr": string (A simple, natural Korean sentence using the word in **polite informal style (해요체)**)
- "example_ru": string (Russian translation of the example)
- "synonyms": string (Comma-separated Korean synonyms **matching this specific meaning**, max 3. Empty if none)
- "antonyms": string (Comma-separated Korean antonyms **matching this specific meaning**, max 3. Empty if none)
- "collocations": string (Common word pairings, e.g. "make friends", max 3)
- "grammar_info": string (Brief usage note, conjugation tip, or Hanja meaning breakdown. E.g. "Irregular verb" or "學(learn) 校(school)")
- "type": string ("word" or "grammar")

### 5. Constraints
- Topic/Category MUST be exactly from the provided lists. If unsure, use "기타 (Другое)".
- Examples should be suitable for the word's difficulty level AND maintain consistent tone (formal, informal, etc.).
- Return ONLY a valid JSON string. No explanations or extra text.

Input: '${trimmedWord}'`;

    console.log("✨ Отправляем промпт в модель...");

    // 7. Generate Content с новой genai библиотекой
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = await response.text();

    console.log("📄 Получен ответ от AI (длина:", text.length, ")");
    
    // 8. Parse JSON (с расширенной очисткой, хотя responseSchema должна вернуть чистый JSON)
    // Но на всякий случай оставим базовую очистку от markdown, если модель решит добавить его
    if (text.trim().startsWith("```")) {
      if (text.includes("```json")) {
        text = text.split("```json")[1]?.split("```")[0]?.trim() || text;
      } else {
        text = text.split("```")[1]?.split("```")[0]?.trim() || text;
      }
    }

    // Удаляем висящие запятые и лишние символы
    text = text
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/^\s*[\n\r]+/, "")
      .replace(/[\n\r]+\s*$/, "")
      .trim();

    let data: unknown;
    try {
      data = JSON.parse(text);
      console.log("✅ JSON успешно распарсен");
    } catch (_parseError: unknown) {
      console.error("❌ JSON Parse Error. Raw response (500 chars):", text.substring(0, 500));
      return createErrorResponse({
          error: "AI response is not valid JSON",
          rawResponse: text.substring(0, 1000),
          word: trimmedWord
      }, 502);
    }

    // 9. Normalize to array
    const items = Array.isArray(data) ? data : [data];
    
    // Validate items
    const validItems = items.filter((item: WordData) => {
      return item && typeof item === 'object' && item.word_kr && item.translation;
    });

    if (validItems.length === 0) {
       throw new Error("AI returned invalid data structure (missing word_kr or translation)");
    }

    // Use validated items
    const finalItems = validItems;

    // Validate Topic/Category against allowed lists
    finalItems.forEach((item: WordData) => {
      if (item.topic && !VALID_TOPICS.includes(item.topic)) {
        item.topic = "기타 (Другое)";
      }
      if (item.category && !VALID_CATEGORIES.includes(item.category)) {
        item.category = "기타 (Другое)"; // Fallback or keep as is if strict validation isn't critical
      }
      
      // Дублируем в поля _ru для совместимости с новой схемой БД
      item.topic_ru = item.topic;
      item.category_ru = item.category;
    });

    console.log("✅ Успешно обработано слово:", trimmedWord, "| Найдено значений:", items.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: finalItems,
        modelUsed: selectedModel,
        word: trimmedWord,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: Error | unknown) {
    // Используем наш новый хелпер для стандартизации ошибок
    return createErrorResponse(error);
  }
});

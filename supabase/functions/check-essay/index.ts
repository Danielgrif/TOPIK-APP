// supabase/functions/generate-word-data/index.ts
import { serve } from "https://deno.land/std@0.223.0/http/server.ts"
// ✅ НОВАЯ БИБЛИОТЕКА google-genai (замена @google/generative-ai)
import { GoogleGenerativeAI } from "npm:@google/genai@0.1.0"

declare global {
  interface ImportMeta {
    env: {
      GOOGLE_API_KEY: string
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AvailableModel {
  name: string
  displayName: string
  description: string
  supportedGenerationMethods: string[]
}

async function getAvailableModels(genai: GoogleGenerativeAI): Promise<AvailableModel[]> {
  try {
    console.log("🔍 Получение списка доступных моделей...");
    
    // Пробуем получить список моделей через genai API
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${genai.apiKey}`,
      { method: "GET" }
    );
    
    if (!modelsResponse.ok) {
      console.error("❌ Не удалось получить список моделей:", modelsResponse.statusText);
      return [];
    }
    
    const modelsData = await modelsResponse.json();
    const models: AvailableModel[] = [];
    
    if (modelsData.models) {
      for (const model of modelsData.models) {
        models.push({
          name: model.name,
          displayName: model.displayName || model.name,
          description: model.description || "No description",
          supportedGenerationMethods: model.supportedGenerationMethods || ["generateContent"]
        });
      }
    }
    
    console.log("✅ Доступные модели:", models.map(m => m.name));
    return models;
  } catch (error) {
    console.error("❌ Ошибка при получении моделей:", error);
    return [];
  }
}

async function selectBestModel(genai: GoogleGenerativeAI): Promise<string> {
  // Приоритетный список моделей (от лучшей к базовой)
  const preferredModels = [
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp", 
    "gemini-pro",
    "gemini-1.5-flash-latest"
  ];
  
  const fallbackModels = ["gemini-pro", "gemini-1.0-pro"];
  
  try {
    const availableModels = await getAvailableModels(genai);
    console.log("📋 Всего доступно моделей:", availableModels.length);
    
    // Ищем лучшую доступную модель
    for (const modelName of preferredModels) {
      const found = availableModels.find(m => m.name.includes(modelName));
      if (found) {
        console.log("✅ Выбрана модель:", modelName);
        return modelName;
      }
    }
    
    // Fallback на первую доступную
    if (availableModels.length > 0) {
      const fallback = availableModels[0].name;
      console.log("🔄 Fallback модель:", fallback);
      return fallback;
    }
    
    // Последний резерв
    console.log("⚠️ Используем gemini-pro (гарантированно доступна)");
    return "gemini-pro";
    
  } catch (error) {
    console.error("❌ Ошибка выбора модели, используем gemini-pro:", error);
    return "gemini-pro";
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📥 Request method:", req.method, "URL:", new URL(req.url).pathname);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Method not allowed. Use POST with { word: '...' } body" 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 1. Parse Request Body
    const body = await req.json().catch((e) => {
      console.error("❌ JSON parse error:", e);
      return {};
    });
    
    const word = (body as any).word as string | undefined;
    if (!word || typeof word !== "string" || word.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing or invalid 'word' in JSON body. Example: { \"word\": \"안녕\" }" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const trimmedWord = word.trim();
    console.log("🔤 Обрабатываем слово:", trimmedWord);

    // 2. Get API Key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    console.log("🔑 API key loaded:", !!apiKey);
    
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is missing in environment variables");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Server configuration error: GEMINI_API_KEY missing in Supabase secrets" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 3. Initialize NEW google-genai client
    console.log("🤖 Инициализация GoogleGenAI...");
    const genai = new GoogleGenerativeAI(apiKey);
    
    // 4. Проверка доступных моделей и выбор лучшей
    const selectedModel = await selectBestModel(genai);
    console.log("🎯 Используем модель:", selectedModel);

    // 5. Initialize model с выбранной моделью
    const model = genai.getGenerativeModel({ 
      model: selectedModel,
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 1024,
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
- "topic": string (One from: Daily Life (Повседневная жизнь), Food (Еда), Travel (Путешествия), Education (Образование), Work (Работа), Health (Здоровье), Nature (Природа), Relationships (Отношения), Shopping (Покупки), Culture (Культура), Politics/Economy (Политика/Экономика), Other (Другое))
- "category": string (One from: Nouns (Существительные), Verbs (Глаголы), Adjectives (Прилагательные), Adverbs (Наречия), Particles (Частицы), Idioms (Идиомы), Phrases (Фразы), Grammar (Грамматика))
- "level": string (One of: "★★★" (Beginner), "★★☆" (Intermediate), "★☆☆" (Advanced))
- "example_kr": string (A simple, natural Korean sentence using the word in **polite informal style (해요체)**)
- "example_ru": string (Russian translation of the example)
- "synonyms": string (Comma-separated Korean synonyms **matching this specific meaning**, max 3. Empty if none)
- "antonyms": string (Comma-separated Korean antonyms **matching this specific meaning**, max 3. Empty if none)
- "collocations": string (Common word pairings, e.g. "make friends", max 3)
- "grammar_info": string (Brief usage note, conjugation tip, or Hanja meaning breakdown. E.g. "Irregular verb" or "學(learn) 校(school)")
- "type": string ("word" or "grammar")

### 5. Constraints
- Topic/Category MUST be exactly from the provided lists. If unsure, use "Other (Другое)".
- Examples should be suitable for the word's difficulty level AND maintain consistent tone (formal, informal, etc.).
- Return ONLY a valid JSON string. No explanations or extra text.

Input: '${trimmedWord}'`;

    console.log("✨ Отправляем промпт в модель...");

    // 7. Generate Content с новой genai библиотекой
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = await response.text();

    console.log("📄 Получен ответ от AI (длина:", text.length, ")");

    // 8. Parse JSON (с расширенной очисткой)
    if (text.includes("```json")) {
      text = text.split("```json")[1]?.split("```")?.trim() || text;
    } else if (text.includes("```")) {
      text = text.split("```")[2]?.split("```")[0]?.trim() || text;
    }

    // Удаляем висящие запятые и лишние символы
    text = text
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/^\s*[\n\r]+/, "")
      .replace(/[\n\r]+\s*$/, "")
      .trim();

    let data: any;
    try {
      data = JSON.parse(text);
      console.log("✅ JSON успешно распарсен");
    } catch (parseError) {
      console.error("❌ JSON Parse Error. Raw response (500 chars):", text.substring(0, 500));
      
      // Fallback: возвращаем сырой текст для отладки
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "AI response is not valid JSON",
          rawResponse: text.substring(0, 1000),
          word: trimmedWord
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 9. Normalize to array
    const items = Array.isArray(data) ? data : [data];
    
    console.log("✅ Успешно обработано слово:", trimmedWord, "| Найдено значений:", items.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: items,
        modelUsed: selectedModel,
        word: trimmedWord,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("💥 Function Error:", error.message || error);
    console.error("💥 Full error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown server error",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

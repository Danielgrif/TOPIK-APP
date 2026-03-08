// supabase/functions/generate-word-data/index.ts

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.20.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📥 Request method:", req.method, "URL:", req.url);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Use POST with {word: '...'} body" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Parse Request Body
    const { word } = await req.json().catch(() => ({}));
    if (!word) {
      return new Response(
        JSON.stringify({ error: "Missing 'word' in JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get API Key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    console.log("🔑 API key loaded:", !!apiKey);
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY missing in Supabase secrets");
    }

    // 3. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Используем 1.5-flash как самую стабильную и быструю

    // 4. Construct Prompt
    const prompt = `You are an expert Korean language teacher for Russian speakers.
Analyze the following Korean word: '${word}' for use in TOPIK II exam preparation. The response should be in Russian. Also find frequency of use for this word (high, medium, low), and approximately to which TOPIK level this word corresponds (TOPIK I, TOPIK II level 3, TOPIK II level 4, TOPIK II level 5, TOPIK II level 6). Always explain Hanja component if it is available.

### 1. Identification & Correction
- Detect if the input is Korean, a typo (e.g. 'gks' -> '한'), or Romanization (e.g. 'annyeong' -> '안녕').
- Use the **corrected Korean word** for analysis.
- Provide frequency of use AND TOPIK Level
- If the input is gibberish or not a valid Korean word, return: {"error": "Invalid input"}

### 2. Hanja Explaination 
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

Input: '${word}'`;

    // 5. Generate Content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 6. Parse JSON
    if (text.includes("```json")) {
        text = text.split("```json")[1]?.split("```")[0]?.trim() || text;
    } else if (text.includes("```")) {
        text = text.split("```")[1]?.split("```")[0]?.trim() || text;
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("❌ Raw AI response:", text.substring(0, 500));
        // Попытка исправить "висячую запятую"
        if (text.trim().endsWith(",}")) {
             data = JSON.parse(text.replace(",}", "}"));
        } else {
             throw new Error("AI response is not valid JSON");
        }
    }

    // Normalize to array
    const items = Array.isArray(data) ? data : [data];

    console.log("✅ Success for word:", word);
    return new Response(JSON.stringify({ success: true, data: items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("💥 ERROR:", error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

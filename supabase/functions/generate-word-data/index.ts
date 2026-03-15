import { serve } from "std/http/server.ts";
import { getGeminiClient } from "shared/clients.ts";
import { selectBestModel } from "shared/gemini.ts";
import { createErrorResponse } from "shared/utils.ts";
import { corsHeaders, GEMINI_MODELS, VALID_TOPICS, VALID_CATEGORIES } from "shared/constants.ts";

/**
 * This function is a direct port of the Python worker's AIContentGenerator.
 * It builds a detailed prompt to get structured data about a Korean word from Gemini.
 */
function buildPrompt(word_kr: string): string {
  return `You are an expert Korean language teacher for Russian speakers.
Analyze the following Korean word: '${word_kr}' for use in TOPIK II exam preparation. The response should be in Russian. Also find frequency of use for this word (high, medium, low), and approximately to which TOPIK level this word corresponds (TOPIK I, TOPIK II level 3, TOPIK II level 4, TOPIK II level 5, TOPIK II level 6). Always explain Hanja component if it is available.

### 1. Identification & Correction
- Detect if the input is Korean, a typo (e.g. 'gks' -> '한'), or Romanization (e.g. 'annyeong' -> '안녕').
- Use the **corrected Korean word** for analysis.
- Provide frequency of use AND TOPIK Level
- If the input is gibberish or not a valid Korean word, return: {"error": "Invalid input"}
### 2. Hanja Explaination 
- Always explain hanja component if it is available.
### 2. Analysis Rules
- If the word has multiple distinct meanings (homonyms), return a JSON ARRAY of objects (max 3 most common).
- If it has a single meaning, return a single JSON object instead of an array.
- **Strictly** follow the JSON structure below. Do NOT use Markdown formatting (no \`\`\`json).

### 3. JSON Structure
Each object must have:
- "word_kr": string (The corrected Korean word)
- "translation": string (Concise Russian translation, MUST be less than 4 words)
- "frequency": string ("high" or "medium" or "low")
- "topik_level": string ("TOPIK I", "TOPIK II level 3", "TOPIK II level 4", "TOPIK II level 5", "TOPIK II level 6")
- "tone": string (Describe the tone/register. Options: Formal, Informal, Poetic, Technical, Slang. Be consistent with example sentences.)
- "word_hanja": string (Hanja characters ONLY if applicable. Empty string if native Korean)
- "topic": string (One from: ${VALID_TOPICS.join(", ")}. If unsure, use "기타 (Другое)")
- "category": string (One from: ${VALID_CATEGORIES.join(", ")}. If unsure, use "기타 (Другое)")
- "level": string (One of: "★★★" (Beginner), "★★☆" (Intermediate), "★☆☆" (Advanced))
- "example_kr": string (A simple, natural Korean sentence using the word in **polite informal style (해요체)**)
- "example_ru": string (Russian translation of the example)
- "synonyms": string (Comma-separated Korean synonyms **matching this specific meaning**, max 3. Empty if none)
- "antonyms": string (Comma-separated Korean antonyms **matching this specific meaning**, max 3. Empty if none)
- "collocations": string (Common word pairings, e.g. "make friends", max 3)
- "grammar_info": string (Brief usage note, conjugation tip, or Hanja meaning breakdown. E.g. "Irregular verb" or "學(learn) 校(school)")
- "type": string ("word" or "grammar")

### 4. Constraints
- Topic/Category MUST be exactly from the provided lists. If unsure, use "기타 (Другое)".
- Examples should be suitable for the word's difficulty level AND maintain consistent tone (formal, informal, etc.).
- Return ONLY a valid JSON string. No explanations or extra text.

Input: '${word_kr}'
`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();
    if (!word) {
      return createErrorResponse("Missing 'word' in request body", 400);
    }

    const genAI = getGeminiClient();
    const prompt = buildPrompt(word);
    
    const modelsToTry = [GEMINI_MODELS.FLASH, GEMINI_MODELS.PRO];
    const modelName = await selectBestModel(genAI, modelsToTry, GEMINI_MODELS.FLASH);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3).trim();
    }

    const sanitizedText = text.replace(/,\s*([}\]])/g, "$1");
    const data = JSON.parse(sanitizedText);

    if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'error' in data) {
      throw new Error(`AI Error: ${(data as {error: string}).error}`);
    }

    const items = Array.isArray(data) ? data : [data];

    return new Response(JSON.stringify({ success: true, data: items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
});
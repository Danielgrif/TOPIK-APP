// supabase/functions/ai-teacher/index.ts
import { serve } from "std/http/server.ts";
import { AI_TEACHER_ACTIONS, corsHeaders, GEMINI_MODELS } from "shared/constants.ts";
import { selectBestModel } from "shared/gemini.ts";
import { getGeminiClient } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, word } = await req.json();
    const genAI = getGeminiClient();
    const preferredModels = [GEMINI_MODELS.FLASH, GEMINI_MODELS.PRO];
    const modelName = await selectBestModel(genAI, preferredModels, GEMINI_MODELS.FLASH); // Already a good shared helper!
    const model = genAI.getGenerativeModel({ model: modelName });

    let prompt = "";
    let generationConfig: Record<string, string | { type: string; items?: Record<string, unknown>; properties?: Record<string, Record<string, string>>; required?: string[] }> = {};

    switch (action) {
      case AI_TEACHER_ACTIONS.EXPLAIN_GRAMMAR:
        prompt = `You are an expert Korean language teacher for Russian speakers.
Explain the Korean grammar point '${word}' in Russian.
Provide:
1. Meaning/Usage.
2. Construction rules (conjugation).
3. 2-3 simple example sentences with Russian translations.
Keep it concise and clear for a learner.
Output in Markdown format.`;
        break;

      case AI_TEACHER_ACTIONS.GENERATE_EXAMPLES:
        prompt = `You are a Korean language teacher.
Generate 3 simple, natural Korean example sentences using the word '${word}'. 
Each sentence should be distinct and demonstrate different usages of the word.
Provide a Russian translation for each sentence.`;
        generationConfig = {
            responseMimeType: "application/json",
            responseSchema:  {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        kr: { type: "string" },
                        ru: { type: "string" }
                    },
                    required: ["kr", "ru"]
                }
            }
        };
        break;

      case AI_TEACHER_ACTIONS.GENERATE_SYNONYMS:
        prompt = `You are a Korean language expert.
Provide 3-5 common synonyms for the Korean word '${word}'.
Output ONLY a comma-separated list of Korean words.`;
        break;

      default:
        throw new Error("Invalid action");
    }

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig
    });
    const response = await result.response;
    let text = response.text();

    let data;
    if ("responseMimeType" in generationConfig && generationConfig.responseMimeType === "application/json") {
      // Улучшенный парсинг: извлекаем JSON из блока ```json ... ```
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        text = jsonMatch[1];
      }
      try {
        // Убираем возможные висящие запятые перед парсингом
        text = text.replace(/,\s*([}\]])/g, "$1");
        data = JSON.parse(text);
        
        // Валидация схемы для примеров
        if (action === AI_TEACHER_ACTIONS.GENERATE_EXAMPLES && Array.isArray(data)) {
          data = data.map((item: { kr?: string; korean?: string; sentence?: string; ru?: string; russian?: string; translation?: string }) => ({
            kr: item.kr || item.korean || item.sentence || "",
            ru: item.ru || item.russian || item.translation || ""
          })).filter((item: { kr: string; ru: string }) => item.kr && item.ru);
        }
        
        if (action === AI_TEACHER_ACTIONS.GENERATE_EXAMPLES && (!data || data.length === 0)) {
          throw new Error("AI returned empty examples list");
        }

      } catch (e: unknown) {
        console.error("❌ JSON Parse Error:", text, (e instanceof Error) ? e.message : "Unknown error");
        throw new Error("Failed to parse AI response");
      }
    } else {
      data = text;
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    return createErrorResponse(error);
  }
})
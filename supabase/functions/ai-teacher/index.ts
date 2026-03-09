// supabase/functions/ai-teacher/index.ts
import { serve } from "https://deno.land/std@0.223.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface AIExampleItem {
  kr?: string;
  ru?: string;
  korean?: string;
  russian?: string;
  sentence?: string;
  translation?: string;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, word } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY missing");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = "";
    let generationConfig: Record<string, string | { type: string; items?: Record<string, unknown>; properties?: Record<string, Record<string, string>>; required?: string[] }> = {};

    switch (action) {
      case "explain-grammar":
        prompt = `You are an expert Korean language teacher for Russian speakers.
Explain the Korean grammar point '${word}' in Russian.
Provide:
1. Meaning/Usage.
2. Construction rules (conjugation).
3. 2-3 simple example sentences with Russian translations.
Keep it concise and clear for a learner.
Output in Markdown format.`;
        break;

      case "generate-examples":
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

      case "generate-synonyms":
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
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0].trim();
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0].trim();
      }
      try {
        data = JSON.parse(text);
        
        // Валидация схемы для примеров
        if (action === "generate-examples" && Array.isArray(data)) {
          data = data.map((item: AIExampleItem) => ({
            kr: item.kr || item.korean || item.sentence || "",
            ru: item.ru || item.russian || item.translation || ""
          })).filter((item: { kr: string; ru: string }) => item.kr && item.ru);
        }
        
        if (action === "generate-examples" && (!data || data.length === 0)) {
          throw new Error("AI returned empty examples list");
        }

      } catch (e) {
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})
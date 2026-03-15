// supabase/functions/ai-teacher/index.ts
import { serve } from "std/http/server.ts";
import { AI_TEACHER_ACTIONS, corsHeaders, GEMINI_MODELS, DB_TABLES } from "shared/constants.ts";
import { selectBestModel } from "shared/gemini.ts";
import { getGeminiClient, getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";
import { SchemaType } from "@google/generative-ai";

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
    if (!action || !word) {
      return createErrorResponse("Missing 'action' or 'word' in request body", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    // --- Caching Logic: Check for a valid cache entry first ---
    const cacheKey = `${action}:${word}`;
    try {
      const { data: cachedData, error: cacheError } = await supabaseAdmin
        .from(DB_TABLES.AI_CACHE)
        .select('response_data')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString()) // Ensure the cache entry is not expired
        .maybeSingle();

      if (cacheError) throw cacheError;

      if (cachedData) {
        console.log(`✅ Cache hit for key: ${cacheKey}`);
        return new Response(JSON.stringify({ success: true, data: cachedData.response_data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("Cache read error (will proceed without cache):", (e as Error).message);
    }

    const genAI = getGeminiClient();
    let model;

    let prompt = "";
    // deno-lint-ignore no-explicit-any
    let generationConfig: Record<string, any> = {};

    switch (action) {
      case AI_TEACHER_ACTIONS.EXPLAIN_GRAMMAR: {
        // Use a higher quality model for explanations.
        const modelName = await selectBestModel(
          genAI,
          [GEMINI_MODELS.PRO, GEMINI_MODELS.FLASH],
          GEMINI_MODELS.PRO,
        );
        model = genAI.getGenerativeModel({ model: modelName });
        prompt = `You are an expert Korean language teacher for Russian speakers.
Explain the Korean grammar point '${word}' in Russian.
Provide:
1. Meaning/Usage.
2. Construction rules (conjugation).
3. 2-3 simple example sentences with Russian translations.
Keep it concise and clear for a learner.
Output in Markdown format.`;
        break;
      }

      case AI_TEACHER_ACTIONS.GENERATE_EXAMPLES: {
        // Use the fastest available model that is good enough.
        const modelName = await selectBestModel(
          genAI,
          [GEMINI_MODELS.FLASH, GEMINI_MODELS.PRO],
          GEMINI_MODELS.FLASH,
        );
        model = genAI.getGenerativeModel({ model: modelName });
        prompt = `You are a Korean language teacher.
Generate 3 simple, natural Korean example sentences using the word '${word}'. 
Each sentence should be distinct and demonstrate different usages of the word.
Provide a Russian translation for each sentence.`;
        generationConfig = {
            responseMimeType: "application/json",
            responseSchema:  {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        kr: { type: SchemaType.STRING },
                        ru: { type: SchemaType.STRING }
                    },
                    required: ["kr", "ru"]
                }
            }
        };
        break;
      }

      case AI_TEACHER_ACTIONS.GENERATE_SYNONYMS: {
        // Use the fastest model and enforce JSON for this simple task.
        model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FLASH });
        prompt = `You are a Korean language expert.
Provide 3-5 common synonyms for the Korean word '${word}'.
Do not include the original word in the list.`;
        generationConfig = {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              synonyms: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ["synonyms"],
          },
        };
        break;
      }

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
    if (generationConfig.responseMimeType === "application/json") {
      // The response is already a JSON string, but might be wrapped in markdown.
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        text = jsonMatch[1];
      }
      try {
        // Clean up potential trailing commas before parsing.
        text = text.replace(/,\s*([}\]])/g, "$1");
        const parsedJson = JSON.parse(text);
        
        // Post-processing and validation based on action
        if (action === AI_TEACHER_ACTIONS.GENERATE_EXAMPLES && Array.isArray(data)) {
          if (!Array.isArray(parsedJson)) throw new Error("Expected an array of examples.");
          // This mapping handles cases where the model uses different keys (e.g., 'korean' instead of 'kr').
          data = parsedJson.map((item: { kr?: string; korean?: string; sentence?: string; ru?: string; russian?: string; translation?: string }) => ({
            kr: item.kr || item.korean || item.sentence || "",
            ru: item.ru || item.russian || item.translation || ""
          })).filter((item: { kr: string; ru: string }) => item.kr && item.ru);

          if (data.length === 0) throw new Error("AI returned empty or invalid examples.");
        } else if (action === AI_TEACHER_ACTIONS.GENERATE_SYNONYMS) {
          if (!parsedJson.synonyms || !Array.isArray(parsedJson.synonyms)) {
            throw new Error("Expected an object with a 'synonyms' array.");
          }
          // Convert back to a comma-separated string for compatibility with potential callers.
          data = parsedJson.synonyms.join(', ');
        } else {
          data = parsedJson;
        }

      } catch (e: unknown) {
        console.error("❌ JSON Parse Error:", text, (e instanceof Error) ? e.message : "Unknown error");
        throw new Error("Failed to parse AI response");
      }
    } else {
      data = text;
    }

    // --- Store the successful result in the cache ---
    if (data) {
      try {
        const { error: cacheInsertError } = await supabaseAdmin
          .from(DB_TABLES.AI_CACHE)
          .insert({ cache_key: cacheKey, response_data: data });

        if (cacheInsertError) throw cacheInsertError;
        console.log(`- Cache miss. Stored new entry for key: ${cacheKey}`);
      } catch (e) {
        console.error("Cache insert error:", (e as Error).message);
        // Do not fail the main request if caching fails.
      }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    return createErrorResponse(error);
  }
})
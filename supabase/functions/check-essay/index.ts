import { serve } from "std/http/server.ts";
import { corsHeaders, DB_TABLES, GEMINI_MODELS } from "shared/constants.ts";
import { getGeminiClient, getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";
import { SchemaType } from "@google/generative-ai";

/**
 * Builds a detailed, task-specific prompt for the Gemini API to evaluate a TOPIK essay.
 * @param taskType The TOPIK question number (e.g., "51", "54").
 * @param question The context or question for the essay.
 * @param answer The student's written answer.
 * @returns A detailed prompt string.
 */
function buildEssayPrompt(taskType: string, question: string, answer: string): string {
  let taskSpecificInstructions = "";

  switch (taskType) {
    case "51":
      taskSpecificInstructions = `
        - This is a practical writing task (e.g., email, notice).
        - The user is filling in blanks (ㄱ) and (ㄴ).
        - Evaluate the answer based on politeness level (usually -(스)ㅂ니다), contextual fit, and grammatical accuracy.
        - The 'question' field contains the context text.
      `;
      break;
    case "52":
      taskSpecificInstructions = `
        - This is a short descriptive task explaining a phenomenon.
        - The user is completing sentences based on the provided context.
        - Evaluate logical connection, coherence, and use of appropriate written-style grammar (e.g., -(ㄴ/는)다).
        - The 'question' field contains the context text.
      `;
      break;
    case "53":
      taskSpecificInstructions = `
        - This is a data description task (graph, chart). Length should be 200-300 characters.
        - The 'question' field describes the data to be summarized.
        - Evaluate the answer for:
          1. Accurate representation of the main trends and data points.
          2. Correct use of vocabulary for trends (e.g., 증가하다, 감소하다, 차지하다).
          3. Logical structure (introduction, body, conclusion/summary).
          4. Adherence to the character count.
      `;
      break;
    case "54":
      taskSpecificInstructions = `
        - This is a formal argumentative essay. Length should be 600-700 characters.
        - The 'question' field contains the essay prompt.
        - Evaluate the answer for:
          1. Clear structure (introduction, body paragraphs with arguments, conclusion).
          2. Logical and persuasive arguments that directly address the prompt.
          3. Use of advanced vocabulary and complex grammar.
          4. Overall coherence and task fulfillment.
      `;
      break;
    default:
      taskSpecificInstructions = "- Evaluate for general grammatical correctness and natural phrasing.";
  }

  return `You are an expert TOPIK writing examiner grading an essay written by a Russian-speaking student.

### Task Details
- **Task Type:** TOPIK II, Question ${taskType}
- **Task-Specific Rules:**
${taskSpecificInstructions}

### Student's Submission
- **Question/Context:** "${question}"
- **Student's Answer:** "${answer}"

### Your Instructions
1.  **Grade the essay** on a scale of 0 to 10, where 10 is a perfect native-level response.
2.  **Provide overall feedback** in Russian. Be encouraging but clear about areas for improvement.
3.  **Identify specific errors.** For each error, provide the original phrase, the corrected version, and a brief explanation in Russian.
4.  **Suggest an improved version** of the student's entire answer, demonstrating a more natural and advanced writing style.
5.  **Return your entire evaluation as a single, valid JSON object.** Do not use Markdown formatting.

### JSON Output Schema
{
  "score": number (0-10),
  "feedback": "string (Overall feedback in Russian)",
  "corrections": [
    {
      "original": "string (The incorrect phrase from the student's answer)",
      "corrected": "string (The corrected phrase)",
      "reason": "string (A brief explanation of the error in Russian)"
    }
  ],
  "improved_version": "string (A full, improved version of the answer)"
}
`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { taskType, question, answer } = await req.json();
    if (!taskType || !answer) {
      return createErrorResponse("Missing 'taskType' or 'answer' in request body", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    // --- Caching Logic ---
    // Create a hash for the cache key to handle long inputs securely and efficiently.
    const cacheKeySource = `check-essay:${taskType}:${question}:${answer}`;
    const cacheKeyBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheKeySource));
    const cacheKey = Array.from(new Uint8Array(cacheKeyBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    try {
      const { data: cachedData, error: cacheError } = await supabaseAdmin
        .from(DB_TABLES.AI_CACHE)
        .select('response_data')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cacheError) throw cacheError;

      if (cachedData) {
        console.log(`✅ Cache hit for essay check.`);
        return new Response(JSON.stringify({ success: true, ...cachedData.response_data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("Cache read error (will proceed without cache):", (e as Error).message);
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODELS.PRO_1_5,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.NUMBER },
            feedback: { type: SchemaType.STRING },
            corrections: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  original: { type: SchemaType.STRING },
                  corrected: { type: SchemaType.STRING },
                  reason: { type: SchemaType.STRING },
                },
                required: ["original", "corrected", "reason"],
              },
            },
            improved_version: { type: SchemaType.STRING },
          },
          required: ["score", "feedback", "corrections", "improved_version"],
        },
      },
    });

    const prompt = buildEssayPrompt(taskType, question, answer);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    const data = JSON.parse(responseText);

    // --- Store the successful result in the cache ---
    if (data) {
      try {
        await supabaseAdmin
          .from(DB_TABLES.AI_CACHE)
          .insert({ cache_key: cacheKey, response_data: data });
        console.log(`- Cache miss. Stored new essay evaluation.`);
      } catch (e) {
        console.error("Cache insert error:", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
});
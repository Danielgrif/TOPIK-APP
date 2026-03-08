// supabase/functions/check-essay/index.ts
import { serve } from "https://deno.land/std@0.223.0/http/server.ts"  // ✅ Добавили serve
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.20.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {  // ✅ Deno.serve
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📥 Request:", req.method, req.url);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Use POST with {taskType, question, answer}" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { taskType, question, answer } = await req.json().catch(() => ({}));
    if (!taskType || !question || !answer) {
      return new Response(
        JSON.stringify({ error: "Missing: taskType (51-54), question, answer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    console.log("🔑 API key:", !!apiKey);
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-exp" });  // ✅ Правильная 1.5 flash (или "gemini-1.5-flash")

    // ✅ ЕДИНЫЙ промпт (system + user)
    let prompt = "";
    switch (taskType) {
      case "51":
        prompt = `Ты экзаменатор TOPIK II Writing Task 51 (Practical Writing). Оцени контекстную уместность (почтительность), грамматику, релевантность содержания.

Вопрос: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО JSON: { "score": "X/10", "feedback": "Краткий отзыв на русском", "corrections": [{"original": "...", "corrected": "...", "reason": "..."}], "improved_version": "..." }`;
        break;
      case "52":
        prompt = `Ты экзаменатор TOPIK II Writing Task 52 (Explanatory Writing). Оцени логический поток, грамматику письменного стиля, словарь.

Вопрос: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО JSON: { "score": "X/10", "feedback": "Краткий отзыв на русском", "corrections": [...], "improved_version": "..." }`;
        break;
      case "53":
        prompt = `Ты экзаменатор TOPIK II Writing Task 53 (Data Analysis). Оцени точное описание данных, сравнения, соединители предложений.

Данные: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО JSON: { "score": "X/30", "feedback": "Краткий отзыв на русском", "corrections": [...], "improved_version": "..." }`;
        break;
      case "54":
        prompt = `Ты экзаменатор TOPIK II Writing Task 54 (Argumentative Essay). Оцени ясность тезиса, структуру, продвинутый словарь.

Тема: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО JSON: { "score": "X/50", "feedback": "Подробный отзыв на русском", "corrections": [...], "improved_version": "..." }`;
        break;
      default:
        throw new Error(`Invalid taskType: ${taskType}. Use 51-54`);
    }

    const result = await model.generateContent(prompt);  // ✅ Один промпт
    let text = await result.response.text();

    // ✅ Очистка JSON
    if (text.includes("```json")) text = text.split("```json")[1]?.split("```")?.trim() || text;
    else if (text.includes("```")) text = text.split("```")[11]?.split("```")[0]?.trim() || text;

    const data = JSON.parse(text);
    console.log("✅ Success for task:", taskType);

    return new Response(JSON.stringify({ success: true, ...data }), {
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

// supabase/functions/check-essay/index.ts
import { serve } from "std/http/server.ts";
import { corsHeaders, GEMINI_MODELS } from "shared/constants.ts";
import { selectBestModel } from "shared/gemini.ts";
import { getGeminiClient } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📥 Request:", req.method, new URL(req.url).pathname);

    if (req.method !== "POST") {
      return createErrorResponse("Method Not Allowed. Use POST.", 405);
    }

    // Parse Request Body с улучшенной обработкой
    const rawBody = await req.text();
    console.log("📦 Raw request body:", rawBody);

    interface RequestBody {
      taskType?: string;
      question?: string;
      answer?: string;
    }
    
    let body: RequestBody;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("❌ JSON parse error:", e);
      body = {};
    }
    
    const taskType = body.taskType as string | undefined;
    const question = body.question as string | undefined;
    const answer = body.answer as string | undefined;
    
    if (!taskType || !question || !answer) {
      return createErrorResponse("Missing required fields: taskType, question, answer", 400);
    }

    // Инициализация новой google-genai библиотеки
    console.log("🤖 Инициализация GoogleGenAI для проверки эссе...");
    const genai = getGeminiClient();
    
    // Проверка доступных моделей и выбор лучшей для эссе
    const preferredModels = [GEMINI_MODELS.PRO_1_5, GEMINI_MODELS.FLASH, GEMINI_MODELS.PRO];
    const selectedModel = await selectBestModel(genai, preferredModels, GEMINI_MODELS.FLASH);
    console.log("🎯 Используем модель для эссе:", selectedModel);

    // Создание модели с оптимальными настройками для проверки эссе
    const model = genai.getGenerativeModel({ 
      model: selectedModel,
      generationConfig: {
        temperature: 0.1,  // Низкая креативность для объективной оценки
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 4096,  // Больше токенов для детального анализа
      }
    });

    // ЕДИНЫЙ подробный промпт для всех типов заданий TOPIK II Writing
    let prompt = "";
    switch (taskType) {
      case "51":
        prompt = `Ты строгий экзаменатор TOPIK II Writing Task 51 (Practical Writing). Оцени по критериям:
- Контекстная уместность (использование honorifics, вежливости)
- Грамматическая правильность
- Релевантность содержания к заданию
- Лексическая точность

Вопрос: ${question}
Ответ ученика (максимум 100 символов): ${answer}

ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON БЕЗ МАРКДАУНА:
{
  "score": "X/10",
  "feedback": "Краткий отзыв на русском (макс 100 символов)",
  "corrections": [
    {"original": "оригинальный текст", "corrected": "исправленный текст", "reason": "причина на русском"}
  ],
  "improved_version": "Полная улучшенная версия ответа (100 символов)"
}`;
        break;

      case "52":
        prompt = `Ты строгий экзаменатор TOPIK II Writing Task 52 (Explanatory Writing). Оцени по критериям:
- Логический поток объяснения
- Грамматика письменного стиля
- Богатство словаря
- Соответствие объёму

Вопрос: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON БЕЗ МАРКДАУНА:
{
  "score": "X/10", 
  "feedback": "Краткий отзыв на русском (макс 100 символов)",
  "corrections": [
    {"original": "оригинальный текст", "corrected": "исправленный текст", "reason": "причина на русском"}
  ],
  "improved_version": "Полная улучшенная версия ответа"
}`;
        break;

      case "53":
        prompt = `Ты строгий экзаменатор TOPIK II Writing Task 53 (Data Analysis). Оцени по критериям:
- Точное описание данных из графика/таблицы
- Сравнения и контрасты
- Использование соединителей предложений
- Объём 200-300 символов

Данные: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON БЕЗ МАРКДАУНА:
{
  "score": "X/30",
  "feedback": "Краткий отзыв на русском (макс 120 символов)", 
  "corrections": [
    {"original": "оригинальный текст", "corrected": "исправленный текст", "reason": "причина на русском"}
  ],
  "improved_version": "Полная улучшенная версия анализа данных"
}`;
        break;

      case "54":
        prompt = `Ты строгий экзаменатор TOPIK II Writing Task 54 (Argumentative Essay). Оцени по критериям:
- Ясность тезиса и аргументации
- Логическая структура (введение-развитие-заключение)
- Продвинутый словарь и сложные конструкции
- Объём 600-700 символов

Тема: ${question}
Ответ ученика: ${answer}

ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON БЕЗ МАРКДАУНА:
{
  "score": "X/50",
  "feedback": "Подробный отзыв на русском (макс 150 символов)",
  "corrections": [
    {"original": "оригинальный текст", "corrected": "исправленный текст", "reason": "причина на русском"}
  ],
  "improved_version": "Полная улучшенная версия эссе"
}`;
        break;

      default:
        throw new Error(`Invalid taskType: ${taskType}. Use 51-54`);
    }

    console.log("✨ Отправляем промпт проверки эссе в модель...");

    // Generate Content с новой google-genai библиотекой
    const result = await model.generateContent(prompt);
    let text = await result.response.text();

    console.log("📄 Получен ответ от AI (длина:", text.length, "символов)");
    interface EssayResult {
      score: string;
      feedback: string;
      corrections: { original: string; corrected: string; reason: string; }[];
      improved_version: string;
    }
    
    // Улучшенная очистка JSON
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      text = jsonMatch[1];
    }

    // Удаляем висящие запятые
    text = text.replace(/,\s*([}\]])/g, "$1").trim();

    let data: EssayResult;
    try {
      data = JSON.parse(text);
            console.log("✅ JSON успешно распарсен для задания:", taskType);
    } catch (_parseError) {
      console.error("❌ JSON Parse Error. Raw response (500 chars):", text.substring(0, 500));

      return createErrorResponse(
        { message: "AI response is not valid JSON", rawResponse: text.substring(0, 1000) }, 502
      );
    }

    console.log("✅ Success for task:", taskType, "| Score:", data.score);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...data,
        taskType,
        modelUsed: selectedModel,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: Error | unknown) {
    return createErrorResponse(error);
  }
});

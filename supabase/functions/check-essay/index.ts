// supabase/functions/check-essay/index.ts
import { serve } from "https://deno.land/std@0.223.0/http/server.ts"
// ✅ НОВАЯ БИБЛИОТЕКА google-genai (замена @google/generative-ai)
import { GoogleGenerativeAI } from "npm:@google/genai@0.1.0"

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
    console.log("🔍 Получение списка доступных моделей для проверки эссе...");
    
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
    
    console.log("✅ Доступные модели для эссе:", models.map(m => m.name));
    return models;
  } catch (error) {
    console.error("❌ Ошибка при получении моделей:", error);
    return [];
  }
}

async function selectBestModelForEssay(genai: GoogleGenerativeAI): Promise<string> {
  // Приоритет для эссе: модели с хорошим пониманием грамматики и структуры
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
    
    // Ищем лучшую доступную модель для эссе
    for (const modelName of preferredModels) {
      const found = availableModels.find(m => m.name.includes(modelName));
      if (found) {
        console.log("✅ Выбрана модель для эссе:", modelName);
        return modelName;
      }
    }
    
    // Fallback на первую доступную
    if (availableModels.length > 0) {
      const fallback = availableModels[0].name;
      console.log("🔄 Fallback модель для эссе:", fallback);
      return fallback;
    }
    
    // Последний резерв
    console.log("⚠️ Используем gemini-pro (гарантированно доступна)");
    return "gemini-pro";
    
  } catch (error) {
    console.error("❌ Ошибка выбора модели для эссе, используем gemini-pro:", error);
    return "gemini-pro";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📥 Request:", req.method, req.url);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Use POST with {taskType, question, answer}" 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse Request Body с улучшенной обработкой
    const body = await req.json().catch((e) => {
      console.error("❌ JSON parse error:", e);
      return {};
    });
    
    const taskType = (body as any).taskType as string | undefined;
    const question = (body as any).question as string | undefined;
    const answer = (body as any).answer as string | undefined;
    
    if (!taskType || !question || !answer) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing: taskType (51-54), question, answer",
          received: { taskType, question: question?.substring(0, 50), answer: answer?.substring(0, 50) }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    console.log("🔑 API key loaded:", !!apiKey);
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY missing in Supabase secrets");
    }

    // Инициализация новой google-genai библиотеки
    console.log("🤖 Инициализация GoogleGenAI для проверки эссе...");
    const genai = new GoogleGenerativeAI(apiKey);
    
    // Проверка доступных моделей и выбор лучшей для эссе
    const selectedModel = await selectBestModelForEssay(genai);
    console.log("🎯 Используем модель для эссе:", selectedModel);

    // Создание модели с оптимальными настройками для проверки эссе
    const model = genai.getGenerativeModel({ 
      model: selectedModel,
      generationConfig: {
        temperature: 0.1,  // Низкая креативность для объективной оценки
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 1500,  // Больше токенов для детального анализа
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

    // Расширенная очистка JSON
    if (text.includes("```json")) {
      text = text.split("```json")[1]?.split("```")?.trim() || text;
    } else if (text.includes("```")) {
      text = text.split("```")[10]?.split("```")[0]?.trim() || text;
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
      console.log("✅ JSON успешно распарсен для задания:", taskType);
    } catch (parseError) {
      console.error("❌ JSON Parse Error. Raw response (500 chars):", text.substring(0, 500));
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "AI response is not valid JSON",
          rawResponse: text.substring(0, 1000),
          taskType,
          modelUsed: selectedModel
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
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

  } catch (error: any) {
    console.error("💥 ERROR в check-essay:", error.message || error);
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

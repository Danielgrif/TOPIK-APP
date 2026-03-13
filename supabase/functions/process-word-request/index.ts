import { serve } from "std/http/server.ts";
import { corsHeaders, DB_TABLES, FUNCTION_NAMES, PROCESSING_STEPS, WORD_REQUEST_STATUS } from "shared/constants.ts";
import { createAudioFile } from "shared/audio.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";

let currentStep = PROCESSING_STEPS.AI_PROCESSING;

serve(async (req: Request) => {
  // Обработка CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestId: string | number | null = null;
  try {
    const { record } = await req.json();

    if (!record || !record.word_kr) {
      throw new Error("Missing 'record' or 'word_kr' in request body");
    }

    requestId = record.id;
    console.log(`🚀 Processing request for: ${record.word_kr} (ID: ${record.id})`);

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Генерация данных о слове (AI)
    console.log("🤖 Calling generate-word-data...");
    currentStep = PROCESSING_STEPS.AI_PROCESSING;
    const { data: aiData, error: aiError } = await supabaseAdmin.functions.invoke(
      FUNCTION_NAMES.GENERATE_WORD_DATA,
      { body: { word: record.word_kr } }
    );

    if (aiError) throw new Error(`AI data generation failed: ${aiError.message}`);
    if (!aiData || !aiData.data || aiData.data.length === 0) {
        throw new Error("AI returned no data.");
    }

    const wordItem = aiData.data[0]; // Берем первый (наиболее вероятный) вариант

    // 2. Подготовка данных для вставки
    // Приоритет отдаем данным из заявки (если пользователь указал тему/категорию), иначе берем от AI
    const finalData = {
      ...wordItem,
      topic: record.topic || wordItem.topic,
      category: record.category || wordItem.category,
      level: record.level || wordItem.level,
      created_by: record.user_id,
      is_public: false, // Пользовательские слова по умолчанию приватные
    };

    // 3. Вставка в основную таблицу vocabulary
    console.log("💾 Inserting into vocabulary...");
    currentStep = PROCESSING_STEPS.DB_INSERT;
    const { data: insertedWord, error: insertError } = await supabaseAdmin
      .from(DB_TABLES.VOCABULARY)
      .insert(finalData)
      .select()
      .single();

    if (insertError) {
        throw new Error(`DB insert failed: ${insertError.message}`);
    }

    const insertedWordId = insertedWord.id;

    // 4. Генерация аудио (TTS)
    console.log("🔊 Generating audio...");
    currentStep = PROCESSING_STEPS.AUDIO_GENERATION;

    const audioPromises = [
      createAudioFile(supabaseAdmin, insertedWord.word_kr, 'female', `female/${insertedWordId}.mp3`),
      createAudioFile(supabaseAdmin, insertedWord.word_kr, 'male', `male/${insertedWordId}.mp3`),
    ];

    // Также генерируем аудио для примера, если он есть
    if (insertedWord.example_kr) {
      audioPromises.push(
        createAudioFile(supabaseAdmin, insertedWord.example_kr, 'female', `examples/${insertedWordId}.mp3`),
      );
    }

    const [femaleUrl, maleUrl, exampleUrl] = await Promise.all(audioPromises);

    const audioUpdates: { audio_url: string; audio_male: string; example_audio?: string } = {
      audio_url: femaleUrl,
      audio_male: maleUrl,
    };
    if (exampleUrl) {
      audioUpdates.example_audio = exampleUrl;
    }

    const { data: updatedWord, error: updateError } = await supabaseAdmin
      .from(DB_TABLES.VOCABULARY)
      .update(audioUpdates)
      .eq("id", insertedWordId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`DB update with audio URLs failed: ${updateError.message}`);
    }

    // 5. Обновление статуса заявки
    console.log("✅ Updating request status...");
    await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .update({ status: WORD_REQUEST_STATUS.PROCESSED })
      .eq("id", record.id);

    return new Response(JSON.stringify({ success: true, word: updatedWord }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error processing request:", errorMessage);
    
    // Пытаемся обновить статус заявки на 'error', если есть ID
    try {
        if (requestId) {
            await getSupabaseAdmin()
                .from(DB_TABLES.WORD_REQUESTS)
                .update({ status: WORD_REQUEST_STATUS.ERROR, my_notes: errorMessage, failed_step: currentStep })
                .eq("id", requestId);
        }
    } catch (_e: unknown) { /* ignore */ }

    return createErrorResponse(error);
  }
});
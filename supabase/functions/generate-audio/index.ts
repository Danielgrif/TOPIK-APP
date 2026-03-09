
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Обработка CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record || !record.word_kr) {
      throw new Error("Missing 'record' or 'word_kr' in request body");
    }

    console.log(`🚀 Processing request for: ${record.word_kr} (ID: ${record.id})`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Генерация данных о слове (AI)
    console.log("🤖 Calling generate-word-data...");
    const { data: aiData, error: aiError } = await supabaseAdmin.functions.invoke(
      "generate-word-data",
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
    const { data: insertedWord, error: insertError } = await supabaseAdmin
      .from("vocabulary")
      .insert(finalData)
      .select()
      .single();

    if (insertError) {
        throw new Error(`DB insert failed: ${insertError.message}`);
    }

    // 4. Генерация аудио (TTS)
    console.log("🔊 Generating audio...");
    await generateAndUploadAudio(supabaseAdmin, insertedWord);

    // 5. Обновление статуса заявки
    console.log("✅ Updating request status...");
    await supabaseAdmin
      .from("word_requests")
      .update({ status: "processed" })
      .eq("id", record.id);

    return new Response(JSON.stringify({ success: true, word: insertedWord }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error processing request:", errorMessage);
    
    // Пытаемся обновить статус заявки на 'error', если есть ID
    try {
        const clonedReq = await req.clone().json().catch(() => ({}));
        if (clonedReq.record?.id) {
             const supabaseAdmin = createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            );
            await supabaseAdmin
                .from("word_requests")
                .update({ status: "error", my_notes: errorMessage })
                .eq("id", clonedReq.record.id);
        }
    } catch (_e) { /* ignore */ }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateAndUploadAudio(supabaseAdmin: SupabaseClient, word: Record<string, unknown>) {
  try {
    const { data: audioBlob, error: audioError } = await supabaseAdmin.functions.invoke(
      "generate-audio",
      { 
        body: { text: word.word_kr, voice: "female" }
      }
    );

    if (audioError) throw audioError;

    const fileName = `${word.id}.mp3`;

    const { error: uploadError } = await supabaseAdmin.storage.from("audio-files").upload(fileName, audioBlob, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from("audio-files").getPublicUrl(fileName);
    await supabaseAdmin.from("vocabulary").update({ audio_url: urlData.publicUrl }).eq("id", word.id);
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`Audio generation failed for word ${word.id}:`, errMsg);
  }
}
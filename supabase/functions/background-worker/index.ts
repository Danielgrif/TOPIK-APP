// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageResult {
  finalUrl: string;
  source: string;
}


interface WordData {
    id: string;
    word_kr: string;
    translation: string;
    example_kr: string;
    audio_url: string | null;
    audio_male: string | null;
    example_audio: string | null;
    image: string | null;
}

const BATCH_SIZE = 10; // Обрабатываем по 10 записей за раз, чтобы избежать таймаутов

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Защита функции: проверяем секретный ключ
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin: SupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🛠️ Background worker started.");

    // --- Обработка слов из словаря ---
    const { data: words, error: wordsError } = await supabaseAdmin
      .from("vocabulary")
      .select("id, word_kr, translation, example_kr, audio_url, audio_male, example_audio, image")
      .or("audio_url.is.null,audio_male.is.null,image.is.null") // Ищем записи, где чего-то не хватает
      .limit(BATCH_SIZE);

    if (wordsError) {
      console.error("Error fetching words:", wordsError.message);
    } else if (words && words.length > 0) {  
      console.log(`🔥 Found ${words.length} words to process.`);
      for (const word of words as any) {
        const updates: { [key: string]: string | null | undefined } = {}; 

        // Генерация аудио (женский голос)
        if (!word.audio_url) {
          try {
            const { data: audioBlob, error } = await supabaseAdmin.functions.invoke("generate-audio", { body: { text: word.word_kr, voice: "female" } });
            if (error) throw error;

            const filePath = `${word.id}.mp3`;
            const { error: uploadError } = await supabaseAdmin.storage.from("audio-files").upload(filePath, audioBlob, { contentType: 'audio/mpeg', upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseAdmin.storage.from("audio-files").getPublicUrl(filePath);
            updates.audio_url = urlData.publicUrl;
            console.log(`✅ Audio (female) for "${word.word_kr}"`);
          } catch (e: any) {
            console.error(`❌ Failed female audio for "${word.word_kr}":`, e.message);
          }
        }

        // Генерация аудио (мужской голос)
        if (!word.audio_male) {
           try {
            const { data: audioBlob, error } = await supabaseAdmin.functions.invoke("generate-audio", { body: { text: word.word_kr, voice: "male" } });
            if (error) throw error;

            const filePath = `${word.id}_M.mp3`;
            const { error: uploadError } = await supabaseAdmin.storage.from("audio-files").upload(filePath, audioBlob, { contentType: 'audio/mpeg', upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseAdmin.storage.from("audio-files").getPublicUrl(filePath);
            updates.audio_male = urlData.publicUrl;
            console.log(`✅ Audio (male) for "${word.word_kr}"`);
          } catch (e: any) {
            console.error(`❌ Failed male audio for "${word.word_kr}":`, e.message);
          }
        }

        // Генерация изображения
        if (!word.image) {
          try {
            const { data: imageData, error: imageError } = await supabaseAdmin.functions.invoke("regenerate-image", { body: { mode: "auto", id: word.id, word: word.word_kr, translation: word.translation } });
            if (imageError) throw imageError;
            
            updates.image = (imageData as ImageResult).finalUrl;
            updates.image_source = (imageData as ImageResult).source;
            console.log(`✅ Image for "${word.word_kr}" from ${ (imageData as ImageResult).source}`);
          } catch (e: any) {
            console.error(`❌ Failed image for "${word.word_kr}":`, e.message);
          }
        }

        // Применяем обновления к записи в БД
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabaseAdmin.from("vocabulary").update(updates).eq("id", word.id);
          if (updateError) {
            console.error(`❌ Failed to update word ${word.word_kr}:`, updateError.message);
          }
        }
      }
    }

    // --- Обработка цитат ---
    // Code for processing quotes would go here (omitted for brevity)

    console.log("✅ Background worker finished.");
    return new Response(JSON.stringify({ success: true, message: "Worker finished." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("💥 Background worker error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ImageResult {
  finalUrl: string;
  source: string;
}
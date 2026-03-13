import { serve } from "std/http/server.ts";
import { corsHeaders, DB_TABLES, FUNCTION_NAMES, WORKER_CONSTANTS } from "shared/constants.ts";
import type { ImageResult, WordData } from "shared/types.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createAudioFile } from "shared/audio.ts";
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

  // 1. Защита функции: проверяем секретный ключ
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return createErrorResponse("Unauthorized", 401);
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log("🛠️ Background worker started.");

    // --- Обработка слов из словаря ---
    const { data: words, error: wordsError } = await supabaseAdmin
      .from(DB_TABLES.VOCABULARY)
      .select("id, word_kr, translation, example_kr, audio_url, audio_male, example_audio, image")
      .or("audio_url.is.null,audio_male.is.null,image.is.null") // Ищем записи, где чего-то не хватает
      .limit(WORKER_CONSTANTS.BATCH_SIZE);

    if (wordsError) {
      console.error("Error fetching words:", wordsError.message);
    } else if (words && words.length > 0) {  
      console.log(`🔥 Found ${words.length} words to process.`);

      const processingPromises = words.map(async (word: WordData) => {
        try {
            const updates: Partial<WordData> = {};
            const promises = [];

            // Генерация аудио
            if (!word.audio_url && word.word_kr) {
                promises.push(
                    createAudioFile(supabaseAdmin, word.word_kr, 'female', `female/${word.id}.mp3`)
                        .then(url => { updates.audio_url = url; })
                        .catch(e => console.error(`❌ Failed female audio for "${word.word_kr}":`, (e as Error).message))
                );
            }
            if (!word.audio_male && word.word_kr) {
                promises.push(
                    createAudioFile(supabaseAdmin, word.word_kr, 'male', `male/${word.id}.mp3`)
                        .then(url => { updates.audio_male = url; })
                        .catch(e => console.error(`❌ Failed male audio for "${word.word_kr}":`, (e as Error).message))
                );
            }
            if (word.example_kr && !word.example_audio) {
                promises.push(
                    createAudioFile(supabaseAdmin, word.example_kr, 'female', `examples/${word.id}.mp3`)
                        .then(url => { updates.example_audio = url; })
                        .catch(e => console.error(`❌ Failed example audio for "${word.word_kr}":`, (e as Error).message))
                );
            }

            // Генерация изображения
            if (!word.image) {
                promises.push(
                    supabaseAdmin.functions.invoke<ImageResult>(FUNCTION_NAMES.REGENERATE_IMAGE, { body: { mode: "auto", id: word.id, word: word.word_kr, translation: word.translation } })
                        .then(({ data, error }) => {
                            if (error) throw error;
                            if (data) {
                                updates.image = data.finalUrl;
                                updates.image_source = data.source;
                                console.log(`✅ Image for "${word.word_kr}" from ${data.source}`);
                            }
                        })
                        .catch(e => console.error(`❌ Failed image for "${word.word_kr}":`, (e as Error).message))
                );
            }

            await Promise.all(promises);

            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabaseAdmin.from(DB_TABLES.VOCABULARY).update(updates).eq("id", word.id);
              if (updateError) {
                console.error(`❌ Failed to update word ${word.word_kr}:`, updateError.message);
              } else {
                console.log(`💾 Updated word ${word.word_kr} with ${Object.keys(updates).join(', ')}.`);
              }
            }
        } catch (e: unknown) {
            console.error(`💥 Unhandled error processing word ${word.id}:`, (e as Error).message);
        }
      });
      await Promise.all(processingPromises);
    }

    // --- Обработка цитат ---
    // Code for processing quotes would go here (omitted for brevity)

    console.log("✅ Background worker finished.");
    return new Response(JSON.stringify({ success: true, message: "Worker finished." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("💥 Background worker error:", (error as Error).message);
    return createErrorResponse(error);
  }
});
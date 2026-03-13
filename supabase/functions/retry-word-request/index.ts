import { serve } from "std/http/server.ts";
import { corsHeaders, DB_TABLES, PROCESSING_STEPS, WORD_REQUEST_STATUS } from "shared/constants.ts";
import { createAudioFile } from "shared/audio.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";

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
    const { request_id } = await req.json();
    if (!request_id) {
      throw new Error("Missing 'request_id' in request body");
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Получаем сбойную заявку
    const { data: request, error: requestError } = await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError) throw new Error(`Failed to fetch request: ${requestError.message}`);
    if (!request) throw new Error("Request not found.");

    console.log(`♻️ Retrying request for "${request.word_kr}", failed at: ${request.failed_step}`);

    // 2. Выбираем стратегию повтора
    if (request.failed_step === PROCESSING_STEPS.AUDIO_GENERATION) {
      // Слово уже должно быть в базе. Находим его, чтобы получить ID.
      const { data: word, error: wordError } = await supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .select("*")
        .eq("word_kr", request.word_kr)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (wordError || !word) {
        // Если слово не найдено, что-то пошло не так. Безопаснее перезапустить весь процесс.
        throw new Error(`Word "${request.word_kr}" not found in vocabulary for audio retry. Resetting...`);
      }

      console.log(`🔊 Retrying only audio generation for word ID: ${word.id}`);
      
      // Обновляем статус, чтобы UI показал, что идет работа
      await supabaseAdmin.from(DB_TABLES.WORD_REQUESTS).update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: WORD_REQUEST_STATUS.AUDIO_RETRY }).eq('id', request_id);

      // Повторяем генерацию обоих голосов
      const [femaleUrl, maleUrl] = await Promise.all([
        createAudioFile(supabaseAdmin, word.word_kr, 'female', `female/${word.id}.mp3`),
        createAudioFile(supabaseAdmin, word.word_kr, 'male', `male/${word.id}.mp3`),
      ]);

      // Обновляем запись в vocabulary
      await supabaseAdmin.from(DB_TABLES.VOCABULARY).update({
        audio_url: femaleUrl,
        audio_male: maleUrl,
      }).eq("id", word.id);

      // Если все прошло успешно, помечаем заявку как выполненную
      await supabaseAdmin.from(DB_TABLES.WORD_REQUESTS).update({ status: WORD_REQUEST_STATUS.PROCESSED, my_notes: null, failed_step: null }).eq('id', request_id);
      
      console.log(`✅ Audio retry successful for "${request.word_kr}"`);

    } else {
      // Для более ранних сбоев (ai_processing, db_insert) безопаснее просто поставить заявку в очередь заново.
      console.log(`🔄 Re-queueing full request for "${request.word_kr}"`);
      await supabaseAdmin
        .from(DB_TABLES.WORD_REQUESTS)
        .update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: null, failed_step: null })
        .eq("id", request_id);
    }

    return new Response(JSON.stringify({ success: true, message: "Retry initiated." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("❌ Error in retry-word-request:", (error as Error).message);
    // Если даже повтор не удался, снова помечаем заявку как ошибочную
    const { request_id } = await req.clone().json().catch(() => ({}));
    if (request_id) {
        await getSupabaseAdmin().from(DB_TABLES.WORD_REQUESTS).update({ status: WORD_REQUEST_STATUS.ERROR, my_notes: `Retry failed: ${(error as Error).message}` }).eq("id", request_id);
    }
    return createErrorResponse(error);
  }
});
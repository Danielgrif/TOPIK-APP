import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
    
  args: string[];
  cwd: () => string;
  exit: (code?: number) => never;
  readFile: (filename: string) => Promise<Uint8Array>;

  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WordRequest {
  id: string | number;
  word_kr: string;
  user_id: string;
  status: string;
  target_list_id?: string | null;
  topic?: string | null;
  category?: string | null;
  level?: string | null;
}

interface Vocabulary {
  id: string | number;
  word_kr: string;
  audio_url?: string | null;
}

// Эта функция является копией из `process-word-request`.
// Поддерживайте их в синхронизированном состоянии
async function generateAndUploadAudio(supabaseAdmin: SupabaseClient, word: Vocabulary) {
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
    console.error(`Audio retry failed for word ${word.id}:`, errMsg);
    // Перебрасываем ошибку, чтобы главный обработчик мог ее поймать и снова пометить заявку как ошибочную.
    throw new Error(`Audio generation failed during retry: ${errMsg}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { request_id } = await req.json();
    if (!request_id) {
      throw new Error("Missing 'request_id' in request body");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Получаем сбойную заявку
    const { data: request, error: requestError } = await supabaseAdmin
      .from("word_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError) throw new Error(`Failed to fetch request: ${requestError.message}`);
    if (!request) throw new Error("Request not found.");

    console.log(`♻️ Retrying request for "${request.word_kr}", failed at: ${request.failed_step}`);

    // 2. Выбираем стратегию повтора
    if (request.failed_step === 'audio_generation') {
      // Слово уже должно быть в базе. Находим его.
      const { data: word, error: wordError } = await supabaseAdmin
        .from("vocabulary")
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
      await supabaseAdmin.from("word_requests").update({ status: 'pending', my_notes: 'audio_retry' }).eq('id', request_id);

      await generateAndUploadAudio(supabaseAdmin, word);

      // Если все прошло успешно, помечаем заявку как выполненную
      await supabaseAdmin.from("word_requests").update({ status: 'processed', my_notes: null, failed_step: null }).eq('id', request_id);
      
      console.log(`✅ Audio retry successful for "${request.word_kr}"`);

    } else {
      // Для более ранних сбоев (ai_processing, db_insert) безопаснее просто поставить заявку в очередь заново.
      console.log(`🔄 Re-queueing full request for "${request.word_kr}"`);
      await supabaseAdmin
        .from("word_requests")
        .update({ status: "pending", my_notes: null, failed_step: null })
        .eq("id", request_id);
    }

    return new Response(JSON.stringify({ success: true, message: "Retry initiated." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in retry-word-request:", errorMessage);
    // Если даже повтор не удался, снова помечаем заявку как ошибочную
    const { request_id } = await req.clone().json().catch(() => ({}));
    if (request_id) {
        const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        await supabaseAdmin.from("word_requests").update({ status: "error", my_notes: `Retry failed: ${errorMessage}` }).eq("id", request_id);
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})
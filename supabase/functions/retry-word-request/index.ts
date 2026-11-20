import { serve } from "std/http/server.ts";
import { corsHeaders, DB_TABLES, PROCESSING_STEPS, WORD_REQUEST_STATUS } from "shared/constants.ts";
import { createAudioFile } from "shared/audio.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { createErrorResponse, HttpError, jsonResponse } from "shared/utils.ts";
import { readJsonObject } from "shared/validation.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestId: string | number | null = null;
  let authenticatedUserId: string | null = null;

  try {
    // [SECURITY] Владелец заявки определяется по JWT, а не по телу запроса.
    const { user } = await getAuthenticatedUser(req);
    authenticatedUserId = user.id;

    const body = await readJsonObject(req);
    const rawId = body.request_id;
    if (
      typeof rawId !== "string" && typeof rawId !== "number"
    ) {
      throw new HttpError("Missing or invalid 'request_id' in request body", 400);
    }
    requestId = rawId;

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Получаем сбойную заявку и проверяем владельца.
    const { data: request, error: requestError } = await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .select("*")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!request) throw new HttpError("Request not found or access denied", 404);

    console.log(`♻️ Retrying request for "${request.word_kr}", failed at: ${request.failed_step}`);

    // 2. Выбираем стратегию повтора
    if (request.failed_step === PROCESSING_STEPS.AUDIO_GENERATION) {
      // Слово уже должно быть в базе. Находим его, чтобы получить ID.
      const { data: word, error: wordError } = await supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .select("*")
        .eq("word_kr", request.word_kr)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (wordError || !word) {
        // Если слово не найдено, что-то пошло не так. Безопаснее перезапустить весь процесс.
        throw new HttpError(
          `Word "${request.word_kr}" not found in vocabulary for audio retry`,
          404,
        );
      }

      console.log(`🔊 Retrying only audio generation for word ID: ${word.id}`);

      // Обновляем статус, чтобы UI показал, что идет работа
      await supabaseAdmin
        .from(DB_TABLES.WORD_REQUESTS)
        .update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: WORD_REQUEST_STATUS.AUDIO_RETRY })
        .eq("id", requestId)
        .eq("user_id", user.id);

      // Повторяем генерацию обоих голосов
      const [femaleUrl, maleUrl] = await Promise.all([
        createAudioFile(supabaseAdmin, word.word_kr, "female", `female/${word.id}.mp3`),
        createAudioFile(supabaseAdmin, word.word_kr, "male", `male/${word.id}.mp3`),
      ]);

      // Обновляем запись в vocabulary
      await supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .update({
          audio_url: femaleUrl,
          audio_male: maleUrl,
        })
        .eq("id", word.id)
        .eq("created_by", user.id);

      // Если все прошло успешно, помечаем заявку как выполненную
      await supabaseAdmin
        .from(DB_TABLES.WORD_REQUESTS)
        .update({ status: WORD_REQUEST_STATUS.PROCESSED, my_notes: null, failed_step: null })
        .eq("id", requestId)
        .eq("user_id", user.id);

      console.log(`✅ Audio retry successful for "${request.word_kr}"`);
    } else {
      // Для более ранних сбоев (ai_processing, db_insert) безопаснее просто поставить заявку в очередь заново.
      console.log(`🔄 Re-queueing full request for "${request.word_kr}"`);
      await supabaseAdmin
        .from(DB_TABLES.WORD_REQUESTS)
        .update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: null, failed_step: null })
        .eq("id", requestId)
        .eq("user_id", user.id);
    }

    return jsonResponse({ success: true, message: "Retry initiated." });
  } catch (error: unknown) {
    console.error("❌ Error in retry-word-request:", error instanceof Error ? error.message : error);

    // Если даже повтор не удался, снова помечаем заявку как ошибочную.
    if (requestId && authenticatedUserId) {
      try {
        await getSupabaseAdmin()
          .from(DB_TABLES.WORD_REQUESTS)
          .update({
            status: WORD_REQUEST_STATUS.ERROR,
            my_notes: `Retry failed: ${error instanceof Error ? error.message.slice(0, 200) : "Unknown error"}`,
          })
          .eq("id", requestId)
          .eq("user_id", authenticatedUserId);
      } catch (updateError: unknown) {
        console.error("Failed to mark retry as failed:", updateError);
      }
    }
    return createErrorResponse(error);
  }
});

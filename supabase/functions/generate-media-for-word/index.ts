import { serve } from "std/http/server.ts";
import { createErrorResponse, HttpError, jsonResponse } from "shared/utils.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { bearerHeaders, getAuthenticatedUser } from "shared/auth.ts";
import { createAudioFile } from "shared/audio.ts";
import { DB_TABLES, FUNCTION_NAMES, LIMITS } from "shared/constants.ts";
import { readJsonObject } from "shared/validation.ts";
import type { ImageResult, WordData } from "shared/types.ts";

/**
 * This function is invoked asynchronously to generate all media files for a given word.
 * It handles audio generation for the word and its example, and invokes another function for image generation.
 *
 * [SECURITY] пользователь берётся из JWT; слово для обработки загружается из БД
 * и проверяется на принадлежность этому пользователю.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    const { user, token } = await getAuthenticatedUser(req);
    const payload = await readJsonObject(req);

    const rawId = payload.word_id ?? (payload.word as { id?: unknown } | null)?.id;
    if (
      typeof rawId !== "string" && typeof rawId !== "number"
    ) {
      throw new HttpError("Request must contain a valid 'word_id'", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Всегда читаем слово из БД, не доверяя переданному клиентом объекту.
    const { data: word, error: fetchError } = await supabaseAdmin
      .from(DB_TABLES.VOCABULARY)
      .select("id, word_kr, translation, example_kr, created_by, user_id, is_public")
      .eq("id", rawId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!word) throw new HttpError("Word not found", 404);

    const isOwner = word.created_by === user.id || word.user_id === user.id;
    if (!isOwner) {
      throw new HttpError("Word does not belong to the authenticated user", 403);
    }

    const wordData = word as WordData;
    if (
      !wordData.word_kr ||
      wordData.word_kr.length > LIMITS.MAX_WORD_LENGTH ||
      (wordData.example_kr && wordData.example_kr.length > 500)
    ) {
      throw new HttpError("Invalid word data for media generation", 400);
    }

    // Generate all media files in parallel for efficiency.
    // Внутренний вызов также использует JWT пользователя.
    const results = await Promise.allSettled([
      createAudioFile(supabaseAdmin, wordData.word_kr, "female", `female/${wordData.id}.mp3`),
      createAudioFile(supabaseAdmin, wordData.word_kr, "male", `male/${wordData.id}_M.mp3`),
      wordData.example_kr
        ? createAudioFile(
            supabaseAdmin,
            wordData.example_kr,
            "female",
            `examples/${wordData.id}.mp3`,
          )
        : Promise.resolve(null),
      supabaseAdmin.functions.invoke<ImageResult>(FUNCTION_NAMES.REGENERATE_IMAGE, {
        body: {
          mode: "auto",
          id: wordData.id,
          word: wordData.word_kr,
          translation: wordData.translation,
        },
        headers: bearerHeaders(token),
      }),
    ]);

    const updates: Record<string, string | null> = {};
    const [femaleAudioRes, maleAudioRes, exampleAudioRes, imageRes] = results;

    if (femaleAudioRes.status === "fulfilled") updates.audio_url = femaleAudioRes.value;
    if (maleAudioRes.status === "fulfilled") updates.audio_male = maleAudioRes.value;
    if (exampleAudioRes.status === "fulfilled") updates.example_audio = exampleAudioRes.value;
    if (imageRes.status === "fulfilled" && imageRes.value.data) {
      updates.image = imageRes.value.data.finalUrl;
      updates.image_source = imageRes.value.data.source;
    }

    // Log any errors that occurred during media generation
    results.forEach((p) => {
      if (p.status === "rejected") {
        console.error(`Media generation for word ${wordData.id} failed:`, p.reason);
      }
    });

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .update(updates)
        .eq("id", wordData.id)
        .eq("created_by", user.id);
      if (updateError) throw updateError;
    }

    return jsonResponse({ success: true, updates });
  } catch (error) {
    return createErrorResponse(error);
  }
});

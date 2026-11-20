import { serve } from "std/http/server.ts";
import {
  corsHeaders,
  DB_TABLES,
  FUNCTION_NAMES,
  PROCESSING_STEPS,
  WORD_REQUEST_STATUS,
} from "shared/constants.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { bearerHeaders, getAuthenticatedUser } from "shared/auth.ts";
import { createErrorResponse, HttpError, jsonResponse } from "shared/utils.ts";
import { readJsonObject, requireString } from "shared/validation.ts";
import type { WordData } from "shared/types.ts";

/**
 * Defines the columns that are allowed to be inserted into the 'vocabulary' table.
 * This prevents errors if the AI returns extra fields not present in the database schema.
 */
const VOCABULARY_ALLOWED_KEYS = new Set([
  "word_kr",
  "translation",
  "word_hanja",
  "topic",
  "category",
  "level",
  "type",
  "example_kr",
  "example_ru",
  "synonyms",
  "antonyms",
  "collocations",
  "grammar_info",
  "created_by",
  "is_public",
  // These are included for compatibility with different data structures
  "topic_ru",
  "category_ru",
]);

/**
 * Orchestrates the entire process of adding a new word from a user request.
 * User identity always comes from the JWT, never from the request body.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestId: string | number | null = null;
  let authenticatedUserId: string | null = null;

  try {
    // [SECURITY] JWT пользователя — единственный источник user_id.
    const { user, token } = await getAuthenticatedUser(req);
    authenticatedUserId = user.id;

    const body = await readJsonObject(req);
    const wordRequest = body.record;
    if (!wordRequest || typeof wordRequest !== "object" || Array.isArray(wordRequest)) {
      throw new HttpError("Missing 'record' in request body", 400);
    }
    const record = wordRequest as Record<string, unknown>;

    // [SECURITY] Sanitization & Validation
    const inputWord = requireString(record.word_kr, "word_kr", 60);
    const validPattern = /^[a-zA-Z\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F0-9\s.,?!~-]+$/;
    if (!validPattern.test(inputWord)) {
      throw new HttpError("Validation failed: contains invalid characters", 400);
    }

    if (record.user_id !== undefined && record.user_id !== user.id) {
      throw new HttpError("user_id does not match the authenticated user", 403);
    }

    if (
      (typeof record.id !== "string" && typeof record.id !== "number") ||
      record.id === ""
    ) {
      throw new HttpError("Missing or invalid 'record.id'", 400);
    }
    requestId = record.id;
    console.log(`🚀 Processing request for: ${inputWord} (ID: ${requestId})`);

    const supabaseAdmin = getSupabaseAdmin();

    // [SECURITY] Проверяем владельца заявки в БД, а не в теле запроса.
    const { data: ownedRequest, error: ownerError } = await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .select("user_id")
      .eq("id", requestId)
      .maybeSingle();

    if (ownerError || !ownedRequest || ownedRequest.user_id !== user.id) {
      throw new HttpError("Request not found or access denied", 403);
    }

    // [SECURITY] Целевой список должен принадлежать тому же пользователю.
    let targetListId: string | null = null;
    if (record.target_list_id !== undefined && record.target_list_id !== null && record.target_list_id !== "") {
      if (
        typeof record.target_list_id !== "string" &&
        typeof record.target_list_id !== "number"
      ) {
        throw new HttpError("Invalid 'target_list_id'", 400);
      }
      const { data: ownedList, error: listError } = await supabaseAdmin
        .from(DB_TABLES.USER_LISTS)
        .select("id")
        .eq("id", record.target_list_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (listError || !ownedList) {
        throw new HttpError("Target list not found or access denied", 403);
      }
      targetListId = ownedList.id;
    }

    // [SECURITY] Rate Limiting (15 req/min per authenticated user)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);
    if (count !== null && count > 15) {
      throw new HttpError("Rate limit exceeded. Please wait.", 429);
    }

    // 1. Generate word data from AI
    await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .update({ status: WORD_REQUEST_STATUS.AI, my_notes: PROCESSING_STEPS.AI_PROCESSING })
      .eq("id", requestId)
      .eq("user_id", user.id);

    const { data: aiResponse, error: aiError } = await supabaseAdmin.functions.invoke(
      FUNCTION_NAMES.GENERATE_WORD_DATA,
      { body: { word: inputWord }, headers: bearerHeaders(token) },
    );

    console.log("📦 AI RESPONSE:", aiResponse);

    // ✅ СТРОГАЯ ПРОВЕРКА
    if (
      aiError ||
      !aiResponse ||
      !aiResponse.success ||
      !Array.isArray(aiResponse.data) ||
      aiResponse.data.length === 0
    ) {
      console.error("❌ AI FAIL:", aiError);
      throw new Error("AI processing failed: invalid AI response structure");
    }

    const wordItems: WordData[] = aiResponse.data;

    // --- Optimization: Batch database operations ---
    const progressToUpsert: { user_id: string; word_id: string | number; is_learned: boolean }[] =
      [];
    const listItemsToUpsert: { list_id: string; word_id: string | number }[] = [];
    let processedCount = 0;

    // --- Optimization: Run duplicate checks in parallel ---
    const duplicateCheckPromises = wordItems.map((item) =>
      supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .select("id, word_kr, translation")
        .eq("word_kr", item.word_kr)
        .eq("translation", item.translation)
        .maybeSingle(),
    );
    const duplicateResults = await Promise.all(duplicateCheckPromises);
    const existingWordsMap = new Map<string, string | number>();
    duplicateResults.forEach((res) => {
      if (res.data) {
        const key = `${res.data.word_kr}:${res.data.translation}`;
        existingWordsMap.set(key, res.data.id);
      }
    });

    // 2. Process each word meaning (handles homonyms) using the pre-fetched duplicate data
    for (const item of wordItems) {
      if (!item.word_kr || !item.translation) continue;

      const cacheKey = `${item.word_kr}:${item.translation}`;
      const existingWordId = existingWordsMap.get(cacheKey);

      let wordId: string | number;

      if (existingWordId) {
        console.log(
          `ℹ️ Word "${item.word_kr}" already exists with ID ${existingWordId}. Skipping insertion.`,
        );
        wordId = existingWordId;
      } else {
        // Append TOPIK level to grammar_info if available
        if (item.topik_level) {
          const g_info = item.grammar_info || "";
          item.grammar_info = g_info ? `${g_info}\n[${item.topik_level}]` : `[${item.topik_level}]`;
        }

        // Prepared data: created_by comes from the verified JWT only.
        const insertData = {
          ...item,
          topic: record.topic || item.topic,
          category: record.category || item.category,
          level: record.level || item.level,
          user_id: user.id,
          created_by: user.id,
          is_public: false,
        };

        // --- Optimization: Filter out keys that are not in the vocabulary table ---
        const finalData = Object.fromEntries(
          Object.entries(insertData).filter(([key]) =>
            VOCABULARY_ALLOWED_KEYS.has(key as keyof WordData),
          ),
        ) as unknown as WordData;

        // Insert into vocabulary
        const { data: insertedWord, error: insertError } = await supabaseAdmin
          .from(DB_TABLES.VOCABULARY)
          .insert(finalData)
          .select("id, word_kr, translation, example_kr") // Select all needed data for media generation
          .single();

        if (insertError) {
          console.error(`DB insert failed for "${item.word_kr}": ${insertError.message}`);
          continue; // Skip to next homonym
        }
        wordId = insertedWord.id; // Keep wordId for progress/list items
        console.log(`✅ Word "${item.word_kr}" inserted with ID: ${wordId}`);

        // Asynchronously generate media files; pass the user's JWT downstream.
        supabaseAdmin.functions
          .invoke(FUNCTION_NAMES.GENERATE_MEDIA, {
            body: { word_id: insertedWord.id },
            headers: bearerHeaders(token),
          })
          .catch((err: unknown) =>
            console.error(`- Media generation for word ${wordId} failed to invoke:`, err),
          );
      }

      // Collect rows for batch upsert
      if (wordId !== undefined && wordId !== null) {
        progressToUpsert.push({ user_id: user.id, word_id: wordId, is_learned: false });
      }
      if (wordId !== undefined && targetListId) {
        listItemsToUpsert.push({ list_id: targetListId, word_id: wordId });
      }

      processedCount++;
    }

    // --- Optimization: Perform batch upserts after the loop ---
    if (progressToUpsert.length > 0) {
      const { error } = await supabaseAdmin.from(DB_TABLES.USER_PROGRESS).upsert(progressToUpsert);
      if (error) {
        console.error(
          "Batch upsert to user_progress failed in process-word-request:",
          error.message,
        );
      }
    }
    if (listItemsToUpsert.length > 0) {
      const { error } = await supabaseAdmin.from(DB_TABLES.LIST_ITEMS).upsert(listItemsToUpsert);
      if (error) {
        console.error("Batch upsert to list_items failed in process-word-request:", error.message);
      }
    }

    if (processedCount === 0) {
      throw new HttpError("All word meanings failed to process or were duplicates", 409);
    }

    // 3. Update request status to processed
    await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .update({
        status: WORD_REQUEST_STATUS.PROCESSED,
        my_notes: `Processed ${processedCount} of ${wordItems.length} meanings.`,
      })
      .eq("id", requestId)
      .eq("user_id", user.id);

    return jsonResponse({
      success: true,
      message: `Successfully processed ${processedCount} word(s).`,
    });
  } catch (error: unknown) {
    console.error("❌ Error processing request:", error instanceof Error ? error.message : error);

    try {
      if (requestId && authenticatedUserId) {
        await getSupabaseAdmin()
          .from(DB_TABLES.WORD_REQUESTS)
          .update({
            status: WORD_REQUEST_STATUS.ERROR,
            my_notes: error instanceof Error ? error.message.slice(0, 200) : "Processing failed",
          })
          .eq("id", requestId)
          .eq("user_id", authenticatedUserId);
      }
    } catch (updateError: unknown) {
      console.error("❌ Failed to update request status to ERROR:", updateError);
    }
    return createErrorResponse(error);
  }
});

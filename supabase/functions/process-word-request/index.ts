import { serve } from "std/http/server.ts";
import { corsHeaders, DB_TABLES, FUNCTION_NAMES, PROCESSING_STEPS, WORD_REQUEST_STATUS } from "shared/constants.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";
import type { WordData } from "shared/types.ts";

/**
 * Defines the columns that are allowed to be inserted into the 'vocabulary' table.
 * This prevents errors if the AI returns extra fields not present in the database schema.
 */
const VOCABULARY_ALLOWED_KEYS: Set<string> = new Set([
  'word_kr', 'translation', 'word_hanja', 'topic', 'category', 
  'level', 'type', 'example_kr', 'example_ru', 'synonyms', 'antonyms',
  'collocations', 'grammar_info', 'created_by', 'is_public',
  // These are included for compatibility with different data structures
  'topic_ru', 'category_ru'
]);


/**
 * Orchestrates the entire process of adding a new word from a user request.
 * This function replaces the core logic of the Python worker's `ai_handler.py`.
 */
serve(async (req: Request) => {
  // Обработка CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  } 

  let requestId: string | number | null = null; // To update status on final error
  try {
    const { record: wordRequest } = await req.json();

    if (!wordRequest || !wordRequest.word_kr) {
      throw new Error("Missing 'record' or 'word_kr' in request body");
    }

    requestId = wordRequest.id;
    console.log(`🚀 Processing request for: ${wordRequest.word_kr} (ID: ${requestId})`);

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Generate word data from AI
    await supabaseAdmin.from(DB_TABLES.WORD_REQUESTS).update({ status: WORD_REQUEST_STATUS.AI, my_notes: PROCESSING_STEPS.AI_PROCESSING }).eq('id', requestId);
    
    const { data: aiResponse, error: aiError } = await supabaseAdmin.functions.invoke(
      FUNCTION_NAMES.GENERATE_WORD_DATA,
      { body: { word: wordRequest.word_kr } }
    );

    if (aiError || !aiResponse || !aiResponse.data || aiResponse.data.length === 0) {
        console.error("❌ AI Service invocation failed. Details:", aiError);
        throw new Error(`AI processing failed: ${aiError?.message || 'AI returned no data.'}`);
    }

    const wordItems: WordData[] = aiResponse.data;
    
    // --- Optimization: Batch database operations ---
    const progressToUpsert: { user_id: string; word_id: string | number; is_learned: boolean }[] = [];
    const listItemsToUpsert: { list_id: string; word_id: string | number }[] = [];
    let processedCount = 0;

    // --- Optimization: Run duplicate checks in parallel ---
    const duplicateCheckPromises = wordItems.map(item => 
      supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .select("id, word_kr, translation")
        .eq("word_kr", item.word_kr)
        .eq("translation", item.translation)
        .maybeSingle()
    );
    const duplicateResults = await Promise.all(duplicateCheckPromises);
    const existingWordsMap = new Map<string, string | number>();
    duplicateResults.forEach(res => {
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
          console.log(`ℹ️ Word "${item.word_kr}" already exists with ID ${existingWordId}. Skipping insertion.`);
          wordId = existingWordId;
      } else {
          // Append TOPIK level to grammar_info if available
          if (item.topik_level) {
            const g_info = item.grammar_info || '';
            item.grammar_info = g_info ? `${g_info}\n[${item.topik_level}]` : `[${item.topik_level}]`;
          }

          // Prepare data for insertion
          const insertData = {
              ...item,
              topic: wordRequest.topic || item.topic,
              category: wordRequest.category || item.category,
              level: wordRequest.level || item.level,
              created_by: wordRequest.user_id, 
              is_public: false,
          };
          
          // --- Optimization: Filter out keys that are not in the vocabulary table ---
          const finalData = Object.fromEntries(
            Object.entries(insertData).filter(([key]) => VOCABULARY_ALLOWED_KEYS.has(key as keyof WordData))
          );

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

          // Asynchronously generate media files to avoid timeouts
          supabaseAdmin.functions.invoke(FUNCTION_NAMES.GENERATE_MEDIA, {
              body: { word: insertedWord }, // Pass the full word object for optimization
          }).catch(err => console.error(`- Media generation for word ${wordId} failed to invoke:`, err));
      }

      // Collect rows for batch upsert
      if (wordRequest.user_id) {
          progressToUpsert.push({ user_id: wordRequest.user_id, word_id: wordId, is_learned: false });
      }
      if (wordRequest.target_list_id) {
          listItemsToUpsert.push({ list_id: wordRequest.target_list_id, word_id: wordId });
      }
      
      processedCount++;
    }

    // --- Optimization: Perform batch upserts after the loop ---
    if (progressToUpsert.length > 0) {
      const { error } = await supabaseAdmin.from(DB_TABLES.USER_PROGRESS).upsert(progressToUpsert);
      if (error) console.error("Batch upsert to user_progress failed:", error.message);
    }
    if (listItemsToUpsert.length > 0) {
      const { error } = await supabaseAdmin.from(DB_TABLES.LIST_ITEMS).upsert(listItemsToUpsert);
      if (error) console.error("Batch upsert to list_items failed:", error.message);
    }

    if (processedCount === 0) {
      throw new Error("All word meanings failed to process or were duplicates.");
    }

    // 3. Update request status to processed
    await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .update({ status: WORD_REQUEST_STATUS.PROCESSED, my_notes: `Processed ${processedCount} of ${wordItems.length} meanings.` })
      .eq("id", requestId);

    return new Response(JSON.stringify({ success: true, message: `Successfully processed ${processedCount} word(s).` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error processing request:", errorMessage);

    try {
        if (requestId) {
             await getSupabaseAdmin()
                .from(DB_TABLES.WORD_REQUESTS) // double check
                .update({ status: WORD_REQUEST_STATUS.ERROR, my_notes: errorMessage })
                .eq("id", requestId);
        }
    } catch (_e: unknown) { /* ignore */ }

    return createErrorResponse(error);
  }
});
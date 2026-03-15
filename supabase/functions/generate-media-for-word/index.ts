import { serve } from "std/http/server.ts";
import { createErrorResponse } from "shared/utils.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createAudioFile } from "shared/audio.ts";
import { DB_TABLES, FUNCTION_NAMES, corsHeaders } from "shared/constants.ts";
import type { WordData } from "shared/types.ts";

/**
 * This function is invoked asynchronously to generate all media files for a given word.
 * It handles audio generation for the word and its example, and invokes another function for image generation.
 */
serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        let word: WordData | null = payload.word;
        const word_id = payload.word_id || word?.id;

        if (!word_id) {
            throw new Error("Request must contain either a 'word' object or a 'word_id'.");
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Optimization: If the full word object isn't passed, fetch it.
        // This maintains compatibility with callers that only provide an ID (like pg_cron).
        if (!word) {
            const { data: fetchedWord, error: fetchError } = await supabaseAdmin
                .from(DB_TABLES.VOCABULARY)
                .select("id, word_kr, translation, example_kr")
                .eq('id', word_id)
                .single();
            if (fetchError) throw fetchError;
            word = fetchedWord;
        }

        if (!word) throw new Error(`Word with id ${word_id} not found.`);

        // Generate all media files in parallel for efficiency
        const results = await Promise.allSettled([
            createAudioFile(supabaseAdmin, word.word_kr, 'female', `female/${word.id}.mp3`),
            createAudioFile(supabaseAdmin, word.word_kr, 'male', `male/${word.id}_M.mp3`),
            word.example_kr ? createAudioFile(supabaseAdmin, word.example_kr, 'female', `examples/${word.id}.mp3`) : Promise.resolve(null),
            supabaseAdmin.functions.invoke(FUNCTION_NAMES.REGENERATE_IMAGE, {
                body: { mode: "auto", id: word.id, word: word.word_kr, translation: word.translation }
            })
        ]);

        const updates: Record<string, string | null> = {};
        const [femaleAudioRes, maleAudioRes, exampleAudioRes, imageRes] = results;

        if (femaleAudioRes.status === 'fulfilled') updates.audio_url = femaleAudioRes.value;
        if (maleAudioRes.status === 'fulfilled') updates.audio_male = maleAudioRes.value;
        if (exampleAudioRes.status === 'fulfilled') updates.example_audio = exampleAudioRes.value;
        if (imageRes.status === 'fulfilled' && imageRes.value.data) {
            updates.image = imageRes.value.data.finalUrl;
            updates.image_source = imageRes.value.data.source;
        }

        // Log any errors that occurred during media generation
        results.forEach(p => {
            if (p.status === 'rejected') console.error(`Media generation for word ${word.id} failed:`, p.reason);
        });

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from(DB_TABLES.VOCABULARY)
                .update(updates)
                .eq('id', word.id);
            if (updateError) throw updateError;
        }

        return new Response(JSON.stringify({ success: true, updates }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return createErrorResponse(error, 500);
    }
});
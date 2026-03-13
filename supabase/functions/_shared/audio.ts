import type { SupabaseClient } from "@supabase/supabase-js";
import { DB_BUCKETS, FUNCTION_NAMES } from "./constants.ts";

/**
 * Generates an audio file from text, uploads it to storage, and returns the public URL.
 * This function does NOT interact with the database.
 * @param supabaseAdmin The Supabase admin client.
 * @param text The text to synthesize.
 * @param voice The voice to use ('female' or 'male').
 * @param filePath The full path in storage for the new file (e.g., 'female/word_id.mp3').
 * @returns The public URL of the uploaded audio file.
 */
export async function createAudioFile(
  supabaseAdmin: SupabaseClient,
  text: string,
  voice: "female" | "male",
  filePath: string,
) {
  try {
    // 1. Generate audio by invoking the dedicated function.
    const { data: audioData, error: audioError } = await supabaseAdmin.functions.invoke(
      FUNCTION_NAMES.GENERATE_AUDIO,
      { body: { text, voice } },
    );

    if (audioError) {
      throw new Error(`Audio generation failed for text "${text}": ${audioError.message}`);
    }
    if (!(audioData instanceof Blob)) {
      throw new Error(`Expected audio data to be a Blob, but got ${typeof audioData}`);
    }

    // 2. Upload audio to storage.
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DB_BUCKETS.AUDIO)
      .upload(filePath, audioData, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      throw new Error(`Audio upload failed for "${text}" to path "${filePath}": ${uploadError.message}`);
    }

    // 3. Get public URL and return it.
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(DB_BUCKETS.AUDIO)
      .getPublicUrl(filePath);

    console.log(`✅ Successfully created and stored ${voice} audio at ${filePath}`);
    return publicUrl;
  } catch (error) {
    console.error(`❌ Audio process failed for text "${text}" (${voice}):`, (error as Error).message);
    throw error; // Re-throw to let the caller handle it.
  }
}
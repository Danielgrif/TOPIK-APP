import { DB_BUCKETS } from "./constants.ts";
import { generateSpeech } from "./tts.ts";

/**
 * Минимальный структурный контракт вместо `SupabaseClient`.
 * Разные функции тянут supabase-js через npm/esm.sh; номинальные типы
 * классов из разных копий несовместимы, хотяvoke APIstorage одинаков.
 */
interface AudioStorageClient {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Blob,
        options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ error: { message: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
}

/**
 * Generates an audio file from text, uploads it to storage, and returns the public URL.
 * This function does NOT interact with the database.
 * @param supabaseAdmin The Supabase admin client (or any compatible storage client).
 * @param text The text to synthesize.
 * @param voice The voice to use ('female' or 'male').
 * @param filePath The full path in storage for the new file (e.g., 'female/word_id.mp3').
 * @returns The public URL of the uploaded audio file.
 */
export async function createAudioFile(
  supabaseAdmin: AudioStorageClient,
  text: string,
  voice: "female" | "male",
  filePath: string,
) {
  console.debug(`Starting audio process for text "${text}" (${voice}) at ${filePath}`);
  try {
    // 1. Generate audio directly using the shared helper function.
    const audioBuffer = await generateSpeech(text, voice);

    if (!audioBuffer || audioBuffer.byteLength < 500) {
      throw new Error(
        `Generated audio is too small (${audioBuffer?.byteLength} bytes). The TTS service might have failed silently.`,
      );
    }

    // Convert ArrayBuffer to Blob for uploading
    const audioData = new Blob([audioBuffer], { type: "audio/mpeg" });

    // 2. Upload audio to storage.
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DB_BUCKETS.AUDIO)
      .upload(filePath, audioData, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      console.error(`Upload error details:`, uploadError);
      throw new Error(
        `Audio upload failed for "${text}" to path "${filePath}": ${uploadError.message}`,
      );
    }

    // 3. Get public URL and return it.
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(DB_BUCKETS.AUDIO).getPublicUrl(filePath);

    console.log(`✅ Successfully created and stored ${voice} audio at ${filePath}`);
    return publicUrl;
  } catch (error) {
    console.error(
      `❌ Audio process failed for text "${text}" (${voice}):`,
      (error as Error).message,
    );
    throw error; // Re-throw to let the caller handle it.
  }
}

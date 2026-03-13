
import { serve } from "std/http/server.ts";
import { createErrorResponse } from "shared/utils.ts";
import { API_URLS, corsHeaders, TTS_VOICES } from "shared/constants.ts";

// Эта функция теперь корректно выполняет только одну задачу: генерацию аудио.
// Она использует Google Text-to-Speech API. Убедитесь, что этот API включен в вашем Google Cloud проекте.

serve(async (req: Request) => {
  // Обработка CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { text, voice } = await req.json();
    if (!text) {
      return createErrorResponse("Missing 'text' in request body", 400);
    }
    
    // Сопоставление голоса: 'female' -> 'ko-KR-Wavenet-A', 'male' -> 'ko-KR-Wavenet-D'
    const voiceName = voice === 'male' ? TTS_VOICES.MALE : TTS_VOICES.FEMALE;
    const GOOGLE_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GOOGLE_API_KEY) {
        throw new Error("Google API Key is not configured in environment variables.");
    }

    const ttsResponse = await fetch(`${API_URLS.GOOGLE_TTS}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text: text },
            voice: { languageCode: 'ko-KR', name: voiceName, ssmlGender: voice === 'male' ? 'MALE' : 'FEMALE' },
            audioConfig: { audioEncoding: 'MP3' }
        })
    });

    if (!ttsResponse.ok) {
        const errorBody = await ttsResponse.json();
        console.error("Google TTS API Error:", errorBody);
        throw new Error(`TTS API request failed: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const responseData = await ttsResponse.json();
    if (!responseData.audioContent) {
        throw new Error("TTS API did not return audio content.");
    }
    
    // Декодируем Base64 в бинарные данные
    const audioBytes = atob(responseData.audioContent);
    const audioArray = new Uint8Array(audioBytes.length);
    for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
    }
    
    return new Response(audioArray.buffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      status: 200,
    });

  } catch (error: unknown) {
    return createErrorResponse(error);
  }
});
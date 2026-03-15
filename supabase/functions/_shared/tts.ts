import { API_URLS, TTS_VOICES } from "./constants.ts";

/**
 * Generates high-quality, natural-sounding audio using the Microsoft Edge TTS service.
 * This is the core logic, communicating via WebSocket.
 * @param text The text to synthesize.
 * @param voice The voice to use ('female' or 'male').
 * @returns An ArrayBuffer containing the MP3 audio data.
 */
export async function generateSpeech(text: string, voice: "female" | "male"): Promise<ArrayBuffer> {
  const voiceName = voice === "male" ? TTS_VOICES.MALE : TTS_VOICES.FEMALE;
  const audioFormat = "audio-24khz-48kbitrate-mono-mp3";

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const ws = new WebSocket(API_URLS.EDGE_TTS);
    const audioChunks: Uint8Array[] = [];
    let hasResolved = false;

    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        ws.close();
        reject(new Error("TTS WebSocket connection timed out after 15 seconds."));
      }
    }, 15000);

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      const configMessage =
        `X-Timestamp:${Date.now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"${audioFormat}"}}}}`;
      ws.send(configMessage);

      const requestId = crypto.randomUUID().replaceAll("-", "");
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'><voice name='${voiceName}'><prosody rate='-4.00%'>${text}</prosody></voice></speak>`;
      const ssmlMessage =
        `X-Timestamp:${Date.now()}\r\nX-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMessage);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        const messageParts = event.data.split("\r\n");
        const headers: Record<string, string> = {};
        for (const part of messageParts) {
          if (part.includes(":")) {
            const [key, value] = part.split(":", 2);
            headers[key.trim()] = value.trim();
          }
        }

        if (headers["Path"] === "turn.end" && !hasResolved) {
          hasResolved = true;
          clearTimeout(timeout);
          ws.close();

          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(combined.buffer);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const data = new Uint8Array(event.data);
        const headerEndMarker = "\r\n\r\n";
        const headerEndIndex = new TextDecoder().decode(data).indexOf(headerEndMarker);

        if (headerEndIndex !== -1) {
          const audioData = data.slice(headerEndIndex + headerEndMarker.length);
          audioChunks.push(audioData);
        }
      }
    };

    ws.onerror = (event) => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeout);
        console.error("TTS WebSocket error:", event);
        reject(new Error("TTS WebSocket connection failed."));
      }
    };

    ws.onclose = () => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeout);
        reject(new Error("TTS WebSocket closed unexpectedly."));
      }
    };
  });
}
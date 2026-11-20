import { showToast, levenshtein, generateDiffHtml } from "../utils/utils.ts";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  abort(): void;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

let recognition: ISpeechRecognition | null = null;

function getRecognition(): ISpeechRecognition | null {
  if (recognition) return recognition;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("❌ Распознавание речи не поддерживается в этом браузере.");
    return null;
  }

  recognition = new (SpeechRecognition as {
    new (): ISpeechRecognition;
  })() as ISpeechRecognition;
  recognition.lang = "ko-KR";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  return recognition;
}

export function checkPronunciation(
  correctWord: string,
  btn?: HTMLElement,
  onResult?: (similarity: number, text: string, audioUrl?: string, diffHtml?: string) => void,
  visualizerCanvas?: HTMLCanvasElement,
  onInterim?: (text: string) => void,
  onVolume?: (volume: number) => void,
) {
  const rec = getRecognition();
  if (!rec) return;

  try {
    rec.abort();
  } catch {
    // Ignore
  }

  let mediaRecorder: MediaRecorder | null = null;
  const audioChunks: Blob[] = [];

  // Visualization state
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationId: number | null = null;
  let stream: MediaStream | null = null;

  const startRecording = async () => {
    if (
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    ) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Setup Visualizer
        if ((visualizerCanvas || onVolume) && stream) {
          try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048; // Increased resolution
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const canvasCtx = visualizerCanvas?.getContext("2d");

            const draw = () => {
              if (!analyser) return;
              animationId = requestAnimationFrame(draw);
              analyser.getByteTimeDomainData(dataArray);

              // Calculate Volume (RMS)
              if (onVolume) {
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                  const x = (dataArray[i] - 128) / 128.0;
                  sum += x * x;
                }
                const rms = Math.sqrt(sum / bufferLength);
                onVolume(rms);
              }

              if (canvasCtx && visualizerCanvas) {
                canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

                const width = visualizerCanvas.width;
                const height = visualizerCanvas.height;

                canvasCtx.lineWidth = 3 * (window.devicePixelRatio || 1);
                const style = getComputedStyle(document.body);
                canvasCtx.strokeStyle = style.getPropertyValue("--primary") || "#7c3aed";
                canvasCtx.lineCap = "round";
                canvasCtx.lineJoin = "round";
                canvasCtx.beginPath();

                const sliceWidth = (width * 1.0) / bufferLength;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                  const v = dataArray[i] / 128.0;
                  const y = (v * height) / 2;
                  if (i === 0) canvasCtx.moveTo(x, y);
                  else canvasCtx.lineTo(x, y);
                  x += sliceWidth;
                }
                canvasCtx.lineTo(width, height / 2);
                canvasCtx.stroke();
              }
            };
            draw();
          } catch (e) {
            console.warn("Visualizer setup failed:", e);
          }
        }

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.start();
      } catch (e) {
        console.warn("Recording failed:", e);
      }
    }
  };

  startRecording();

  if (btn) {
    btn.textContent = "🎤";
    (btn as HTMLButtonElement).disabled = true;
  }
  showToast("🎤 Говорите...");

  const cleanup = () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    if (visualizerCanvas) {
      const ctx = visualizerCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
  };

  const stopRecordingAndGetUrl = (cb: (url?: string) => void) => {
    cleanup();
    let handled = false;
    const safeCb = (url?: string) => {
      if (handled) return;
      handled = true;
      cb(url);
    };

    const timer = setTimeout(() => {
      stream?.getTracks().forEach((t) => t.stop());
      safeCb(undefined);
    }, 1500);

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = () => {
        clearTimeout(timer);
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        stream?.getTracks().forEach((t) => t.stop());
        safeCb(url);
      };
      try {
        mediaRecorder.stop();
      } catch {
        clearTimeout(timer);
        stream?.getTracks().forEach((t) => t.stop());
        safeCb(undefined);
      }
    } else {
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      safeCb(undefined);
    }
  };

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex || 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (interimTranscript && onInterim) {
      onInterim(interimTranscript);
    }

    if (!finalTranscript) return;

    const spokenText = finalTranscript.trim();

    const normalize = (s: string) =>
      s
        .normalize("NFC")
        .replace(/[^\p{L}\p{N}]/gu, "")
        .toLowerCase();
    const spokenNorm = normalize(spokenText);
    const correctNorm = normalize(correctWord);

    const distance = levenshtein(spokenNorm, correctNorm);
    const similarity = Math.max(
      0,
      // Use length of the longer string for denominator to avoid division by zero or inflated scores
      Math.round((1 - distance / Math.max(1, spokenNorm.length, correctNorm.length)) * 100),
    );

    const feedback = `Вы сказали: "${spokenText}"`;
    const toastMessage =
      similarity < 60 ? `🤔 ${similarity}% | ${feedback}` : `✅ ${similarity}% | ${feedback}`;

    showToast(toastMessage, 5000);

    // Generate visual diff
    const diffHtml = generateDiffHtml(spokenText, correctWord);

    stopRecordingAndGetUrl((url) => {
      if (onResult) onResult(similarity, spokenText, url, diffHtml);
    });
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    let errorMessage = "Ошибка распознавания";
    if (event.error === "no-speech") errorMessage = "Не удалось распознать речь. Попробуйте снова.";
    else if (event.error === "not-allowed" || event.error === "service-not-allowed")
      errorMessage = "Доступ к микрофону запрещен.";
    showToast(`❌ ${errorMessage}`);
    console.error("Speech recognition error:", event.error);
    stopRecordingAndGetUrl(() => {
      if (onResult) onResult(0, "");
    });
  };

  rec.onend = () => {
    if (btn) {
      btn.textContent = "🗣️";
      (btn as HTMLButtonElement).disabled = false;
    }
    cleanup();
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
  };

  rec.start();
}

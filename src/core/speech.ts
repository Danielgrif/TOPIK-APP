import { showToast, levenshtein } from "../utils/utils.ts";

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
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
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

let recognition: ISpeechRecognition | null = null;

function getRecognition(): ISpeechRecognition | null {
  if (recognition) return recognition;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("❌ Распознавание речи не поддерживается в этом браузере.");
    return null;
  }

  recognition = new (SpeechRecognition as {
    new (): ISpeechRecognition;
  })() as ISpeechRecognition;
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  return recognition;
}

export function checkPronunciation(
  correctWord: string,
  btn?: HTMLElement,
  onResult?: (similarity: number, text: string, audioUrl?: string) => void,
) {
  const rec = getRecognition();
  if (!rec) return;

  try {
    rec.stop();
  } catch {
    // Ignore
  }

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  const startRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  const stopRecordingAndGetUrl = (cb: (url?: string) => void) => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
        cb(url);
      };
      mediaRecorder.stop();
    } else {
      cb(undefined);
    }
  };

  rec.onresult = (event: SpeechRecognitionEvent) => {
    if (!event.results || !event.results[0] || !event.results[0][0]) return;
    const spokenText = event.results[0][0].transcript.trim();

    const normalize = (s: string) =>
      s
        .replace(new RegExp("[.,/#!$%^&*;:{}=\\-_`~()]", "g"), "")
        .replace(/\s+/g, "");
    const spokenNorm = normalize(spokenText);
    const correctNorm = normalize(correctWord);

    const distance = levenshtein(spokenNorm, correctNorm);
    const similarity = Math.max(
      0,
      Math.round(
        (1 - distance / Math.max(1, spokenNorm.length, correctNorm.length)) *
          100,
      ),
    );

    const feedback = `Вы сказали: "${spokenText}"`;
    const toastMessage =
      similarity < 60
        ? `🤔 ${similarity}% | ${feedback}`
        : `✅ ${similarity}% | ${feedback}`;

    showToast(toastMessage, 5000);

    stopRecordingAndGetUrl((url) => {
      if (onResult) onResult(similarity, spokenText, url);
    });
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    let errorMessage = "Ошибка распознавания";
    if (event.error === "no-speech")
      errorMessage = "Не удалось распознать речь. Попробуйте снова.";
    else if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    )
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
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
  };

  rec.start();
}

import { state } from "../core/state.ts";
import { duckBackgroundMusic } from "../ui/ui_settings.ts";

/**
 * Creates a debounced function that delays invoking `fn` until after `wait` milliseconds.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number = 200,
): (...args: Parameters<T>) => void {
  let t: number | undefined;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(t);
    t = window.setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Displays a toast notification.
 */
export function showToast(msg: string, timeout: number = 3500): void {
  try {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast-item";
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(
      () => {
        el.classList.add("toast-hide");
      },
      Math.max(1200, timeout - 600),
    );
    setTimeout(() => {
      try {
        container.removeChild(el);
      } catch {
        // Ignore
      }
    }, timeout);
  } catch (_e) {
    console.warn("showToast error", _e);
  }
}

/**
 * Shows a combo effect popup (e.g. for Sprint mode).
 */
export function showComboEffect(text: string): void {
  const el = document.createElement("div");
  el.className = "effect-popup show";
  el.innerText = text;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 500);
  }, 800);
}

/**
 * Parses a bilingual string like "Topic (Тема)" into parts.
 */
export function parseBilingualString(str: string | null | undefined): {
  kr: string;
  ru: string;
} {
  if (!str) return { kr: "기타", ru: "Общее" };
  const match = str.match(/^(.*?)\s*[(（]([^)）]+)[)）]$/);
  if (match) return { ru: match[1].trim(), kr: match[2].trim() };
  return { ru: str, kr: str };
}

/**
 * Calculates Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }
  for (let i = 0; i <= b.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      tmp[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? tmp[i - 1][j - 1]
          : Math.min(
              tmp[i - 1][j - 1] + 1,
              tmp[i][j - 1] + 1,
              tmp[i - 1][j] + 1,
            );
    }
  }
  return tmp[b.length][a.length];
}

/**
 * Generates HTML showing differences between user input and correct answer.
 */
export function generateDiffHtml(user: string, correct: string): string {
  let html: string = "";
  const len = Math.max(user.length, correct.length);
  for (let i = 0; i < len; i++) {
    const u = user[i];
    const c = correct[i];
    if (u === c) {
      html += `<span class="diff-same">${u}</span>`;
    } else {
      if (u !== undefined) html += `<span class="diff-del">${u}</span>`;
      if (c !== undefined) html += `<span class="diff-ins">${c}</span>`;
    }
  }
  return html;
}

let _audioCtx: AudioContext | null = null;
let _osc: OscillatorNode | null = null;
function _ensureAudio(): AudioContext | null {
  try {
    if (!_audioCtx)
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a synthesized tone using Web Audio API.
 */

type ToneType = "success" | "failure" | "survival-success" | "life-lost" | "cash-register" | "achievement-unlock";

export function playTone(
  type: ToneType = "success",
  duration: number = 120,
): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const ctx = _ensureAudio();
      if (!ctx) return resolve();
      try {
        if (_osc) _osc.stop();
      } catch {
        // Ignore
      }
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "success") {
        o.type = "sine";
        o.frequency.setValueAtTime(587, now);
        o.frequency.exponentialRampToValueAtTime(1174, now + 0.1);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      } else if (type === "cash-register") {
        o.type = "square";
        o.frequency.setValueAtTime(800, now);
        o.frequency.setValueAtTime(1600, now + 0.1); // Скачок частоты (дзынь-дзынь)
        g.gain.setValueAtTime(0.05, now);
        g.gain.setValueAtTime(0.05, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      } else if (type === "survival-success") {
        o.type = "square";
        o.frequency.setValueAtTime(880, now);
        o.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      } else if (type === "life-lost") {
        o.type = "triangle";
        o.frequency.setValueAtTime(300, now);
        o.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      } else if (type === "achievement-unlock") {
        o.type = "sine";
        o.frequency.setValueAtTime(523.25, now); // C5
        o.frequency.setValueAtTime(659.25, now + 0.1); // E5
        o.frequency.setValueAtTime(783.99, now + 0.2); // G5
        o.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        g.gain.setValueAtTime(0.1, now);
        g.gain.linearRampToValueAtTime(0.1, now + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        duration = 800;
      } else {
        o.type = "sawtooth";
        o.frequency.setValueAtTime(200, now);
        o.frequency.linearRampToValueAtTime(50, now + 0.15);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      }

      o.start();
      _osc = o;
      setTimeout(() => {
        try {
          o.stop();
        } catch {
          // Ignore
        }
        _osc = null;
        resolve();
      }, duration);
    } catch {
      resolve();
    }
  });
}

/**
 * Simulates a typewriter effect on an element.
 */
export function typeText(element: HTMLElement, text: string, speed: number = 40): Promise<void> {
  return new Promise((resolve) => {
    element.textContent = "";
    element.classList.add("typing-effect");
    let i = 0;
    
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        element.classList.remove("typing-effect");
        resolve();
      }
    }
    
    type();
  });
}

/**
 * Speaks text using TTS (Audio URL or SpeechSynthesis).
 */
export function speak(
  t: string | null,
  url: string | null | undefined,
): Promise<void> {
  // Приглушаем музыку в начале
  duckBackgroundMusic(true);

  const promise = new Promise<void>((resolve) => {
    if (url) {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => {
        // При ошибке файла пробуем озвучить через TTS
        if (t) {
          speak(t, null).then(resolve);
        } else {
          showToast("Ошибка аудио файла");
          resolve();
        }
      };
      audio.play().catch((e) => {
        console.warn("Audio play error", e);
        if (t) {
          speak(t, null).then(resolve);
        } else {
          showToast("Ошибка аудио файла");
          resolve();
        }
      });
      return;
    }

    if (!t) {
      resolve();
      return;
    }
    if (!("speechSynthesis" in window)) {
      showToast("Голосовой вывод недоступен в этом браузере");
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "ko-KR";
      u.rate = state.audioSpeed || 0.9;
      u.onend = () => resolve();
      u.onerror = (e) => {
        console.warn("SpeechSynthesis error", e);
        resolve(); // Всегда разрешаем промис, чтобы восстановить громкость
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("SpeechSynthesis error", e);
      showToast("Ошибка голосового воспроизведения");
      resolve();
    }
  });

  // Когда озвучка завершена (успешно или с ошибкой), восстанавливаем громкость
  promise.finally(() => {
    duckBackgroundMusic(false);
  });

  return promise;
}

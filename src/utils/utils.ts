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

// Helper: Выполнить функцию при первом взаимодействии пользователя
let interactionListeners: { type: string, handler: EventListener }[] = [];

function cleanupInteractionListeners() {
  interactionListeners.forEach(({ type, handler }) => {
    document.removeEventListener(type, handler, { capture: true });
  });
  interactionListeners = [];
}

function onUserInteraction(fn: () => void) {
  cleanupInteractionListeners();
  const handler = (_e: Event) => {
    cleanupInteractionListeners();
    fn();
  };
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, handler, { capture: true, once: true });
    interactionListeners.push({ type: evt, handler });
  });
}

let _audioCtx: AudioContext | null = null;
let _currentAudio: HTMLAudioElement | null = null; // Глобальная переменная для отслеживания активного аудио
const audioCache = new Map<string, HTMLAudioElement>();
const MAX_AUDIO_CACHE = 50;
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

export function cancelSpeech() {
  cleanupInteractionListeners();
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Plays a synthesized tone using Web Audio API.
 */

type ToneType = "success" | "failure" | "survival-success" | "life-lost" | "cash-register" | "achievement-unlock" | "pop" | "flip" | "tick";

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
      } else if (type === "pop") {
        o.type = "sine";
        o.frequency.setValueAtTime(800, now);
        o.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        duration = 100;
      } else if (type === "flip") {
        o.type = "triangle";
        o.frequency.setValueAtTime(150, now);
        o.frequency.linearRampToValueAtTime(300, now + 0.1);
        g.gain.setValueAtTime(0.05, now);
        g.gain.linearRampToValueAtTime(0.001, now + 0.15);
        duration = 150;
      } else if (type === "tick") {
        o.type = "triangle";
        o.frequency.setValueAtTime(800, now);
        o.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        duration = 100;
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
 * Plays a tone that increases in pitch based on the streak.
 */
export function playComboSound(streak: number): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const ctx = _ensureAudio();
      if (!ctx) return resolve();
      
      // C Major Scale frequencies
      const scale = [
        261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, // 4th octave
        523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, // 5th octave
        1046.50 // C6
      ];
      
      const index = Math.min(streak - 1, scale.length - 1);
      const freq = scale[Math.max(0, index)];
      
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, now);
      o.frequency.linearRampToValueAtTime(freq * 1.05, now + 0.1); // Slight slide up
      
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      o.start();
      o.stop(now + 0.3);
      
      setTimeout(resolve, 300);
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

  // FIX: Останавливаем любое предыдущее аудио перед запуском нового
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
    _currentAudio = null;
  }

  const promise = new Promise<void>((resolve) => {
    if (url) {
      // Также отменяем TTS, если он говорил
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();

      let audio = audioCache.get(url);
      if (audio) {
        audio.currentTime = 0;
        // Обновляем LRU (удаляем и добавляем в конец)
        audioCache.delete(url);
        audioCache.set(url, audio);
      } else {
        audio = new Audio(url);
        if (audioCache.size >= MAX_AUDIO_CACHE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
        audioCache.set(url, audio);
      }

      _currentAudio = audio; // Запоминаем текущее аудио
      audio.volume = state.ttsVolume;
      audio.onended = () => {
        if (_currentAudio === audio) _currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        audioCache.delete(url); // Удаляем из кэша при ошибке
        if (_currentAudio === audio) _currentAudio = null;
        // При ошибке файла пробуем озвучить через TTS
        if (t) {
          speak(t, null).then(resolve);
        } else {
          showToast("Ошибка аудио файла");
          resolve();
        }
      };
      audio.play().catch((e) => {
        if (_currentAudio === audio) _currentAudio = null;

        const isAutoplayBlock = e.name === "NotAllowedError";
        if (isAutoplayBlock) {
          console.warn("🔊 Autoplay blocked (Audio). Attempting TTS fallback...");
          // Если нет текста для фоллбэка, ставим аудио в очередь на клик
          if (!t) {
             // FIX: Не резолвим промис сразу, а ждем взаимодействия
             onUserInteraction(() => speak(null, url).then(resolve));
             return;
          }
        } else {
          console.warn("Audio play error", e);
        }
        if (t) {
          speak(t, null).then(resolve);
        } else {
          if (!isAutoplayBlock) showToast("Ошибка аудио файла");
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
      // FIX: Chrome/Android bug workaround - resume synthesis if paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "ko-KR";
      u.rate = state.audioSpeed || 0.9;
      u.volume = state.ttsVolume;
      u.onend = () => resolve();
      u.onerror = (e) => {
        // FIX: Игнорируем ошибку автовоспроизведения для TTS
        if (e.error === 'not-allowed') {
           console.warn("🔊 TTS Autoplay blocked. Queuing retry on interaction.");
           // FIX: Ждем взаимодействия
           onUserInteraction(() => speak(t, null).then(resolve));
           return;
        }
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

/**
 * Simple LZW compression for strings (to save localStorage space).
 */
export function compress(s: string): string {
  const dict: Record<string, number> = {};
  const data = (s + "").split("");
  const out: number[] = [];
  let currChar;
  let phrase = data[0];
  let code = 256;
  for (let i = 1; i < data.length; i++) {
    currChar = data[i];
    if (dict[phrase + currChar] != null) {
      phrase += currChar;
    } else {
      out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
      dict[phrase + currChar] = code;
      code++;
      phrase = currChar;
    }
  }
  out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
  return out.map((c) => String.fromCharCode(c)).join("");
}

/**
 * Simple LZW decompression.
 */
export function decompress(s: string): string {
  const dict: Record<number, string> = {};
  const data = (s + "").split("");
  let currChar = data[0];
  let oldPhrase = currChar;
  const out = [currChar];
  let code = 256;
  let phrase;
  for (let i = 1; i < data.length; i++) {
    const currCode = data[i].charCodeAt(0);
    if (currCode < 256) phrase = data[i];
    else phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
    out.push(phrase);
    currChar = phrase.charAt(0);
    dict[code] = oldPhrase + currChar;
    code++;
    oldPhrase = phrase;
  }
  return out.join("");
}

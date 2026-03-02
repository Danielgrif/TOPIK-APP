import { state } from "../core/state.ts";

/**
 * Icons mapping for topics and categories
 */
export function escapeHtml(unsafe: string | number | null | undefined): string {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#96;");
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if the user has a slow internet connection (2g or slow-2g).
 */
export function isConnectionSlow(): boolean {
  // @ts-expect-error Navigator connection API is experimental
  const conn = navigator.connection;
  if (!conn) return false;
  return conn.saveData || ["slow-2g", "2g"].includes(conn.effectiveType);
}

/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wrap.
 * @param ms The timeout in milliseconds.
 * @param timeoutError The error to throw on timeout.
 * @returns The result of the promise.
 */
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error(`Promise timed out after ${ms}ms`),
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(timeoutError);
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

export const ICONS_MAP: Record<string, string> = {
  daily: "🏠",
  life: "🏠",
  жизнь: "🏠",
  economics: "💰",
  economy: "💰",
  экономика: "💰",
  politics: "🏛️",
  политика: "🏛️",
  society: "👥",
  social: "👥",
  общество: "👥",
  culture: "🎭",
  культура: "🎭",
  health: "🏥",
  здоровье: "🏥",
  environment: "🌳",
  nature: "🌳",
  природа: "🌳",
  экология: "🌳",
  science: "🔬",
  наука: "🔬",
  education: "🎓",
  school: "🎓",
  образование: "🎓",
  школа: "🎓",
  history: "📜",
  история: "📜",
  art: "🎨",
  искусство: "🎨",
  sports: "⚽",
  спорт: "⚽",
  weather: "🌤️",
  погода: "🌤️",
  shopping: "🛍️",
  покупки: "🛍️",
  travel: "✈️",
  путешествия: "✈️",
  food: "🍔",
  cooking: "🍳",
  еда: "🍔",
  work: "💼",
  job: "💼",
  работа: "💼",
  feelings: "😊",
  emotion: "😊",
  чувства: "😊",
  personality: "🧠",
  характер: "🧠",
  appearance: "👀",
  внешность: "👀",
  hobbies: "🎮",
  хобби: "🎮",
  noun: "📦",
  существительное: "📦",
  verb: "🏃",
  глагол: "🏃",
  adjective: "💎",
  прилагательное: "💎",
  adverb: "🚀",
  наречие: "🚀",
  particle: "🔗",
  частица: "🔗",
  suffix: "📎",
  суффикс: "📎",
  pronoun: "👈",
  местоимение: "👈",
  number: "🔢",
  числительное: "🔢",
  interjection: "❗",
  междометие: "❗",
};

export function getIconForValue(
  value: string,
  defaultIcon: string = "🔹",
): string {
  if (!value || value === "all") return "🌍";
  const lower = value.toLowerCase();
  for (const key in ICONS_MAP) {
    if (lower.includes(key)) return ICONS_MAP[key];
  }
  return defaultIcon;
}

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
 * Shows a toast with an Undo button.
 * Executes onCommit after timeout if not undone.
 */
export function showUndoToast(
  msg: string,
  onUndo: () => void,
  onCommit: () => void,
  timeout: number = 5000,
) {
  const container = document.getElementById("toast-container");
  if (!container) {
    onCommit();
    return;
  }

  const el = document.createElement("div");
  el.className = "toast-item";
  // Стили теперь в CSS, но для Undo-тоста нужна специфическая структура
  el.style.paddingRight = "10px"; // Немного меньше паддинг справа для кнопки

  el.innerHTML = `
    <span>${msg}</span>
    <button class="toast-undo-btn">↩ Отмена</button>
    <div class="toast-undo-bar" style="transition: width ${timeout}ms linear;"></div>
  `;

  container.appendChild(el);

  // Запуск анимации полоски
  requestAnimationFrame(() => {
    const bar = el.querySelector("div") as HTMLElement;
    if (bar) bar.style.width = "0%";
  });

  let isUndone = false;
  const undoBtn = el.querySelector("button") as HTMLElement;

  const timer = setTimeout(() => {
    if (!isUndone) {
      onCommit();
      el.classList.add("toast-hide");
      setTimeout(() => el.remove(), 300);
    }
  }, timeout);

  undoBtn.onclick = () => {
    isUndone = true;
    clearTimeout(timer);
    onUndo();
    el.classList.add("toast-hide");
    setTimeout(() => el.remove(), 300);
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
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure 'a' is the shorter string to minimize memory usage
  if (a.length > b.length) [a, b] = [b, a];

  const row: number[] = [];
  for (let i = 0; i <= a.length; i++) row[i] = i;

  for (let i = 1; i <= b.length; i++) {
    let prev = i;
    let diagonal = i - 1;
    for (let j = 1; j <= a.length; j++) {
      const val = row[j];
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        row[j] = diagonal;
      } else {
        row[j] = Math.min(diagonal, prev, val) + 1;
      }
      diagonal = val;
      prev = row[j];
    }
  }
  return row[a.length];
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
let interactionListeners: { type: string; handler: EventListener }[] = [];

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
  ["click", "touchstart", "keydown"].forEach((evt) => {
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

type ToneType =
  | "success"
  | "failure"
  | "survival-success"
  | "life-lost"
  | "cash-register"
  | "achievement-unlock"
  | "pop"
  | "flip"
  | "tick";

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
        o.frequency.setValueAtTime(1046.5, now + 0.3); // C6
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
        261.63,
        293.66,
        329.63,
        349.23,
        392.0,
        440.0,
        493.88, // 4th octave
        523.25,
        587.33,
        659.25,
        698.46,
        783.99,
        880.0,
        987.77, // 5th octave
        1046.5, // C6
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
export function typeText(
  element: HTMLElement,
  text: string,
  speed: number = 40,
): Promise<void> {
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
  document.dispatchEvent(
    new CustomEvent("duck-music", { detail: { duck: true } }),
  );

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
          console.warn(
            "🔊 Autoplay blocked (Audio). Attempting TTS fallback...",
          );
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

      // Попытка выбрать голос в соответствии с настройками
      const voices = window.speechSynthesis.getVoices();
      const koreanVoices = voices.filter((v) => v.lang.includes("ko"));

      if (koreanVoices.length > 0) {
        let targetVoice = null;
        if (state.currentVoice === "male") {
          targetVoice = koreanVoices.find((v) =>
            v.name.toLowerCase().includes("male"),
          );
        } else {
          targetVoice = koreanVoices.find((v) =>
            v.name.toLowerCase().includes("female"),
          );
        }
        if (targetVoice) u.voice = targetVoice;
      }

      u.rate = state.audioSpeed || 0.9;
      u.volume = state.ttsVolume;
      u.onend = () => resolve();
      u.onerror = (e) => {
        // FIX: Игнорируем ошибку автовоспроизведения для TTS
        if (e.error === "not-allowed") {
          console.warn(
            "🔊 TTS Autoplay blocked. Queuing retry on interaction.",
          );
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
    document.dispatchEvent(
      new CustomEvent("duck-music", { detail: { duck: false } }),
    );
  });

  return promise;
}

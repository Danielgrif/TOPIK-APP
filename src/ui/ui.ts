import { state } from "../core/state.ts";
import { speak } from "../utils/utils.ts";
import { scheduleSaveState } from "../core/db.ts";
import { updateStats, updateSRSBadge } from "../core/stats.ts";
import { render } from "./ui_card.ts";
export {
  ensureSessionStarted,
  toggleSessionTimer,
  endSession,
} from "../core/session.ts";
import { Word } from "../types/index.ts";

/**
 * Saves state to DB/LocalStorage and re-renders the UI.
 */
export function saveAndRender() {
  scheduleSaveState();
  updateSRSBadge();
  updateStats();
  render();
  // setupScrollObserver is called inside render in ui_card.js
}

/**
 * Plays audio for a word and handles TTS fallback.
 */
export function playAndSpeak(word: Word): Promise<void> {
  return new Promise((resolve) => {
    try {
      try {
        window.speechSynthesis.cancel();
      } catch (_e) {
        // Ignore
      }
      const text =
        word && (word.word_kr || word.translation) ? word.word_kr : "";
      let url = word.audio_url;
      if (state.currentVoice === "male" && word.audio_male)
        url = word.audio_male;
      if (text) speak(text, url).then(resolve);
      else resolve();
    } catch (e) {
      console.warn("playAndSpeak error", e);
      resolve();
    }
  });
}

/**
 * Toggles between Grid and List view modes.
 * @param {string} mode - 'grid' or 'list'.
 */
export function toggleViewMode(mode: string) {
  if (state.viewMode === mode) return;
  state.viewMode = mode;
  localStorage.setItem("view_mode_v1", mode);

  document
    .querySelectorAll(".view-btn")
    .forEach((btn) =>
      btn.classList.toggle(
        "active",
        (btn as HTMLElement).dataset.mode === mode,
      ),
    );
  render();
}

export function shuffleWords() {
  state.dataStore.sort(() => Math.random() - 0.5);
  render();
}

export function showError(m: string) {
  const msg = document.getElementById("error-msg");
  if (msg) msg.innerText = m;
  const overlay = document.getElementById("error-overlay");
  if (overlay) overlay.style.display = "flex";
}

const keyHandlers = new WeakMap<HTMLElement, EventListener>();

/**
 * Enables keyboard navigation for quiz options.
 */
export function enableQuizKeyboard(container: HTMLElement) {
  if (!container) return;

  if (keyHandlers.has(container)) {
    const oldHandler = keyHandlers.get(container);
    if (oldHandler) container.removeEventListener("keydown", oldHandler);
    keyHandlers.delete(container);
  }

  const options = Array.from(container.querySelectorAll(".quiz-option")).map(
    (el) => el as HTMLElement,
  );
  // if (!options.length) return; // Allow keyboard even if no options (for text inputs)
  let idx = -1;
  options.forEach((o, i) => {
    o.tabIndex = 0;
    o.dataset._qi = String(i);
    o.classList.remove("selected");
  });
  function update() {
    options.forEach((o, i) => o.classList.toggle("selected", i === idx));
    try {
      if (idx >= 0) options[idx].focus();
    } catch (_e) {
      // Ignore
    }
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      idx = idx < 0 ? 0 : (idx + 1) % options.length;
      update();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      idx =
        idx < 0
          ? options.length - 1
          : (idx - 1 + options.length) % options.length;
      update();
      e.preventDefault();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (idx >= 0) options[idx].click();
    }
  }
  // FIX: Не перехватывать пробел, если фокус в поле ввода
  if (
    document.activeElement &&
    (document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA")
  ) {
    return;
  }
  container.addEventListener("keydown", onKey);
  keyHandlers.set(container, (e: Event) => onKey(e as KeyboardEvent));
  options.forEach((o) =>
    o.addEventListener("click", () => {
      options.forEach((x) => x.classList.remove("selected"));
    }),
  );
  container.tabIndex = 0;
}

/**
 * Sorts the word list by accuracy (weakest first).
 */
export function sortByWeakWords() {
  const sortedCopy = [...state.dataStore].sort((a, b) => {
    const getAcc = (id: string | number) => {
      const stats = state.wordHistory[id] || { attempts: 0, correct: 0 };
      if (stats.attempts === 0) return 0;
      return stats.correct / stats.attempts;
    };
    const accA = getAcc(a.id);
    const accB = getAcc(b.id);

    if (accA !== accB) return accA - accB;
    // const attA = state.wordHistory[a.id]?.attempts || 0;
    // const attB = state.wordHistory[b.id]?.attempts || 0;
    return (a.word_kr || "").localeCompare(b.word_kr || "");
  });
  state.dataStore = sortedCopy;
  render();
}

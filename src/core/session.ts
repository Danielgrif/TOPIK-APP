import { state } from "./state.ts";
import { showToast } from "../utils/utils.ts";
import { updateStreak, scheduleSaveState } from "./db.ts";
import { calculateOverallAccuracy, checkAchievements } from "./stats.ts";

let idleTimer: number | null = null;
let isPaused = false;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 минут бездействия → пауза, НЕ завершение

function updateTimerDisplay() {
  const tDisplay = document.getElementById("timer-display");
  if (!tDisplay) return;
  const mins = Math.floor(state.sessionSeconds / 60);
  const secs = state.sessionSeconds % 60;
  tDisplay.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  tDisplay.style.color = isPaused ? "var(--warning, #f39c12)" : "";
}

function startInterval() {
  if (state.sessionInterval) clearInterval(state.sessionInterval);
  state.sessionInterval = window.setInterval(() => {
    state.sessionSeconds++;
    updateTimerDisplay();
  }, 1000);
}

/** Старт новой сессии. */
export function startSession() {
  state.sessionActive = true;
  isPaused = false;
  state.sessionSeconds = 0;
  state.sessionWordsReviewed = 0;
  updateTimerDisplay();

  const timerEl = document.getElementById("session-timer");
  if (timerEl) timerEl.style.display = "block";

  startInterval();
  updateStreak();
  resetIdleTimer();
}

/** Пауза: счётчик останавливается, но сессия НЕ записывается в историю. */
export function pauseSession() {
  if (!state.sessionActive || isPaused) return;
  isPaused = true;
  if (state.sessionInterval) clearInterval(state.sessionInterval);
  state.sessionInterval = null;
  updateTimerDisplay();
  showToast("⏸️ Сессия на паузе (нет активности)");
}

/** Возобновление той же сессии с сохранённым временем и счётчиками. */
export function resumeSession() {
  if (!state.sessionActive || !isPaused) return;
  isPaused = false;
  startInterval();
  updateTimerDisplay();
  showToast("▶️ Сессия возобновлена");
  resetIdleTimer();
}

/** Финализация сессии: запись в историю и сброс состояния. */
export function endSession() {
  if (!state.sessionActive) return;
  if (state.sessionInterval) clearInterval(state.sessionInterval);
  state.sessionInterval = null;
  state.sessionActive = false;
  isPaused = false;

  const timerEl = document.getElementById("session-timer");
  if (timerEl) timerEl.style.display = "none";
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;

  const sessionData = {
    date: new Date().toISOString(),
    duration: state.sessionSeconds,
    wordsReviewed: state.sessionWordsReviewed,
    accuracy: calculateOverallAccuracy() || 0,
  };
  state.sessions.push(sessionData);
  if (state.sessions.length > 1000) state.sessions = state.sessions.slice(-1000);
  checkAchievements();
  scheduleSaveState();
  showToast(`✅ Сессия завершена! ${state.sessionSeconds}с`);
}

/**
 * Кнопка в UI: запустить, если сессии нет, и завершить, если она идёт.
 * Пауза/возобновление управляются только idle-таймером.
 */
export function toggleSessionTimer() {
  if (!state.sessionActive) {
    startSession();
    showToast("⏱ Сессия запущена");
  } else {
    endSession();
  }
}

/** Автозапуск сессии перед тренировкой; возобновляет паузу, если она была. */
export function ensureSessionStarted() {
  if (!state.sessionActive) {
    startSession();
    showToast("⏱ Сессия автоматически запущена");
  } else if (isPaused) {
    resumeSession();
  }
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;

  if (!state.sessionActive) return;

  if (isPaused) {
    resumeSession();
    return;
  }

  idleTimer = window.setTimeout(() => {
    idleTimer = null;
    if (state.sessionActive && !isPaused) pauseSession();
  }, IDLE_TIMEOUT);
}

function setupIdleListeners() {
  const events = ["mousedown", "keydown", "touchstart", "scroll"];
  events.forEach((evt) => document.addEventListener(evt, resetIdleTimer, { passive: true }));
}

// Инициализация слушателей один раз
setupIdleListeners();

export function editSessionTime() {
  if (!state.sessionActive) {
    showToast("Сначала запустите сессию");
    return;
  }

  const currentMins = Math.floor(state.sessionSeconds / 60);
  const newMinsStr = prompt("Введите время сессии (в минутах):", String(currentMins));

  if (newMinsStr !== null) {
    const newMins = parseInt(newMinsStr, 10);
    if (!isNaN(newMins) && newMins >= 0) {
      state.sessionSeconds = newMins * 60;
      updateTimerDisplay();
      showToast(`⏱ Время изменено на ${newMins} мин.`);
    } else {
      showToast("Некорректное значение");
    }
  }
}

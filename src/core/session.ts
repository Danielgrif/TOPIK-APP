import { state } from "./state.ts";
import { showToast } from "../utils/utils.ts";
import { updateStreak } from "./db.ts";
import { calculateOverallAccuracy } from "./stats.ts";

let idleTimer: number | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 минут бездействия для паузы

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  if (state.sessionActive && !state.sessionInterval) {
    // Если была пауза, возобновляем
    toggleSessionTimer(); 
    showToast("▶️ Сессия возобновлена");
  }
  
  if (state.sessionActive) {
    idleTimer = window.setTimeout(() => {
      if (state.sessionActive && state.sessionInterval) {
        toggleSessionTimer(); // Ставим на паузу
        showToast("⏸️ Сессия на паузе (нет активности)");
      }
    }, IDLE_TIMEOUT);
  }
}

function setupIdleListeners() {
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive: true }));
}

// Инициализация слушателей один раз
setupIdleListeners();

export function ensureSessionStarted() {
  if (!state.sessionActive) {
    toggleSessionTimer();
    showToast("⏱ Сессия автоматически запущена");
  } else if (!state.sessionInterval) {
    // Если на паузе - возобновляем
    toggleSessionTimer();
  }
}

export function toggleSessionTimer() {
  if (state.sessionActive) {
    endSession();
  } else {
    // Start Session
    state.sessionActive = true;
    state.sessionSeconds = 0;
    state.sessionWordsReviewed = 0;
    if (state.sessionInterval) clearInterval(state.sessionInterval);
    const tDisplay = document.getElementById("timer-display");
    if (tDisplay) {
      tDisplay.innerText = "00:00";
      tDisplay.style.color = "";
    }
    const timerEl = document.getElementById("session-timer");
    if (timerEl) timerEl.style.display = "block";

    state.sessionInterval = window.setInterval(() => {
      state.sessionSeconds++;
      const mins = Math.floor(state.sessionSeconds / 60);
      const secs = state.sessionSeconds % 60;
      if (tDisplay)
        tDisplay.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }, 1000);
    updateStreak();
    resetIdleTimer();
  }
}

export function endSession() {
  state.sessionActive = false;
  if (state.sessionInterval) clearInterval(state.sessionInterval);
  state.sessionInterval = null;
  const timerEl = document.getElementById("session-timer");
  if (timerEl) timerEl.style.display = "none";

  const sessionData = {
    date: new Date().toISOString(),
    duration: state.sessionSeconds,
    wordsReviewed: state.sessionWordsReviewed,
    accuracy: calculateOverallAccuracy(),
  };
  state.sessions.push(sessionData);
  if (state.sessions.length > 1000)
    state.sessions = state.sessions.slice(-1000);
  localStorage.setItem("sessions_v5", JSON.stringify(state.sessions));
  showToast(`✅ Сессия завершена! ${state.sessionSeconds}с`);
  if (idleTimer) clearTimeout(idleTimer);
}

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
      const tDisplay = document.getElementById("timer-display");
      if (tDisplay) {
        const mins = Math.floor(state.sessionSeconds / 60);
        const secs = state.sessionSeconds % 60;
        tDisplay.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      }
      showToast(`⏱ Время изменено на ${newMins} мин.`);
    } else {
      showToast("Некорректное значение");
    }
  }
}

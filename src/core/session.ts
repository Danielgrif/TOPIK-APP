import { state } from "./state.ts";
import { showToast } from "../utils/utils.ts";
import { updateStreak } from "./db.ts";
import { calculateOverallAccuracy } from "./stats.ts";

export function ensureSessionStarted() {
  if (!state.sessionActive) {
    toggleSessionTimer();
    showToast("⏱ Сессия автоматически запущена");
  }
}

export function toggleSessionTimer() {
  if (state.sessionActive) {
    endSession();
  } else {
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
  }
}

export function endSession() {
  state.sessionActive = false;
  if (state.sessionInterval) clearInterval(state.sessionInterval);
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
}

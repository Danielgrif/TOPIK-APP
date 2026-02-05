import { state } from "../core/state.ts";
import { Scheduler } from "../core/scheduler.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { openModal } from "./ui_modal.ts"; // closeModal используется в HTML строке
import { ensureSessionStarted } from "./ui.ts";
import { updateSRSBadge, checkAchievements } from "../core/stats.ts";
import { scheduleSaveState } from "../core/db.ts";
import { Word } from "../types/index.ts";

export function openReviewMode() {
  try {
    Scheduler.init({
      dataStore: state.dataStore,
      wordHistory: state.wordHistory,
    });
    const queue = Scheduler.getQueue({ limit: 50 });
    if (!queue || queue.length === 0) {
      showToast("Нет слов для повторения.");
      return;
    }
    buildReviewModal(queue);
  } catch (e) {
    console.error(e);
    showToast("Ошибка при запуске режима повторения");
  }
}

function buildReviewModal(queue: Word[]) {
  const modalId = "review-modal";
  let modalEl = document.getElementById(modalId);
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = modalId;
    modalEl.className = "modal";
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.innerHTML = `<div class="modal-content"><div class="modal-header"><span>🔁 Режим повторения <span id="review-counter" style="font-size:0.6em; opacity:0.7; margin-left:10px;"></span></span><button class="close-modal" onclick="closeModal('${modalId}')">✕</button></div><div id="review-container"></div></div>`;
    document.body.appendChild(modalEl);
  }

  let counter = modalEl.querySelector("#review-counter");
  if (!counter) {
    const header = modalEl.querySelector(".modal-header");
    if (header) {
      counter = document.createElement("span");
      counter.id = "review-counter";
      (counter as HTMLElement).style.cssText =
        "font-size:0.6em; opacity:0.7; margin-left:10px;";
      const btn = header.querySelector(".close-modal");
      if (btn) header.insertBefore(counter, btn);
      else header.appendChild(counter);
    }
  }

  const container = modalEl.querySelector("#review-container");
  if (!container) return;
  container.innerHTML = "";
  let idx = 0;
  const stats = { remembered: 0, forgotten: 0 };

  function renderOne() {
    const w = queue[idx];
    if (counter) counter.textContent = `(Осталось: ${queue.length - idx})`;
    if (container) container.innerHTML = "";
    const title = document.createElement("div");
    title.className = "quiz-question";
    title.textContent = w.word_kr || "—";
    const info = document.createElement("div");
    info.style.margin = "8px 0";
    info.textContent = w.translation || "";
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    const previews = Scheduler.previewNextIntervals(w.id);
    const fmt = (d: number) => {
      if (d === 0) return "сейчас";
      if (d >= 365) return (d / 365).toFixed(1) + " г";
      if (d >= 30) return (d / 30).toFixed(1) + " мес";
      return d + " д";
    };
    const handleReview = (grade: number) => {
      ensureSessionStarted();
      const res = Scheduler.submitReview(w.id, grade);

      state.dirtyWordIds.add(w.id);

      if (grade >= 3) {
        stats.remembered++;
        if (state.mistakes.has(w.id)) {
          state.mistakes.delete(w.id);
        }
        playTone("success");
      } else {
        stats.forgotten++;
        state.mistakes.add(w.id);
        state.learned.delete(w.id);
        showToast("⚠️ Добавлено в ошибки", 900);
        playTone("failure");
      }

      checkAchievements();
      scheduleSaveState();

      const d = Math.round(res.interval * 10) / 10;
      if (d > 1) showToast(`📅 Увидимся через ${d} дн.`, 1000);
      setTimeout(next, 50);
    };
    const mkBtn = (text: string, sub: string, cls: string, grade: number) => {
      const b = document.createElement("button");
      b.className = cls;
      b.innerHTML = `${text}<br><span style="font-size:10px; opacity:0.7; font-weight:normal">${sub}</span>`;
      b.style.lineHeight = "1.2";
      b.onclick = () => handleReview(grade);
      return b;
    };
    actions.appendChild(mkBtn("Знаю", fmt(previews.easy), "btn btn-quiz", 5));
    actions.appendChild(mkBtn("Сомневаюсь", fmt(previews.hard), "btn", 3));
    actions.appendChild(
      mkBtn("Забыл", fmt(previews.fail), "btn action-mistake", 0),
    );
    if (container) {
      container.appendChild(title);
      container.appendChild(info);
      container.appendChild(actions);
    }
  }
  function next() {
    idx++;
    updateSRSBadge();
    if (idx >= queue.length) {
      renderSummary();
      return;
    }
    renderOne();
  }

  function renderSummary() {
    if (counter) counter.textContent = "";
    if (container) {
      container.innerHTML = `
            <div style="text-align:center; padding: 20px; animation: fadeIn 0.5s;">
                <div style="font-size: 50px; margin-bottom: 10px;">🎉</div>
                <div style="font-size: 22px; font-weight: 800; margin-bottom: 20px;">Сессия завершена!</div>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 30px;">
                    <div style="background:var(--bg-learned); color:var(--success); padding:15px; border-radius:16px; flex:1; border: 1px solid var(--success);"><div style="font-size:28px; font-weight:900;">${stats.remembered}</div><div style="font-size:13px; font-weight:600;">Вспомнил</div></div>
                    <div style="background:var(--bg-mistake); color:var(--danger); padding:15px; border-radius:16px; flex:1; border: 1px solid var(--danger);"><div style="font-size:28px; font-weight:900;">${stats.forgotten}</div><div style="font-size:13px; font-weight:600;">Забыл</div></div>
                </div>
                <button class="btn btn-quiz" style="width:100%; padding:15px; font-size:16px;" onclick="closeModal('${modalId}')">Закрыть</button>
            </div>
        `;
    }
    if (
      stats.remembered > stats.forgotten &&
      typeof window.confetti === "function"
    )
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 20005,
      });
  }

  renderOne();
  openModal(modalId);
}

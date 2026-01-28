import { state } from "../core/state.ts";
import { openModal, closeModal } from "./ui_modal.ts";
import { Word } from "../types/index.ts";
import { parseBilingualString } from "../utils/utils.ts";
import { setStarFilter } from "./ui_filters.ts";

export function openMistakesModal() {
  const modalId = "mistakes-modal";
  let modal = document.getElementById(modalId);
  
  if (!modal) {
    // Create modal if it doesn't exist
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("data-close-modal", modalId);
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>⚠️ Анализ ошибок</h3>
          <div class="header-actions">
            <button class="btn btn-icon close-modal-btn" data-close-modal="${modalId}">✕</button>
          </div>
        </div>
        <div id="mistakes-content" class="modal-body-container"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  renderMistakesContent();
  openModal(modalId);
}

function renderMistakesContent() {
  const container = document.getElementById("mistakes-content");
  if (!container) return;

  const mistakeIds = Array.from(state.mistakes);
  
  if (mistakeIds.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-sub);">
        <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
        <div style="font-size: 18px; font-weight: bold;">Ошибок нет!</div>
        <div style="font-size: 14px; margin-top: 5px;">Вы отлично справляетесь.</div>
      </div>
    `;
    return;
  }

  const words = mistakeIds
    .map(id => state.dataStore.find(w => w.id === id))
    .filter((w): w is Word => !!w);

  // Aggregation
  const byTopic: Record<string, number> = {};
  const byPart: Record<string, number> = {};

  words.forEach(w => {
    const topic = w.topic || w.topic_ru || w.topic_kr || "Other";
    const part = w.category || w.category_ru || w.category_kr || "Other";
    
    byTopic[topic] = (byTopic[topic] || 0) + 1;
    byPart[part] = (byPart[part] || 0) + 1;
  });

  const sortedTopics = Object.entries(byTopic).sort((a, b) => b[1] - a[1]);
  const sortedParts = Object.entries(byPart).sort((a, b) => b[1] - a[1]);

  let html = `
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      <div class="stat-card-primary" style="flex: 1; border-bottom: 3px solid var(--danger);">
        <div class="stat-value-primary">${mistakeIds.length}</div>
        <div class="stat-label-primary">Всего ошибок</div>
      </div>
      <button class="btn btn-quiz" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="window.startMistakeQuiz()">
        <span style="font-size: 20px;">🩹</span>
        <span style="font-size: 12px; font-weight: bold;">Работа над ошибками</span>
      </button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 20px;">
      
      <!-- By Topic -->
      <div style="background: var(--surface-2); padding: 15px; border-radius: 16px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--text-sub);">По темам</h4>
        ${sortedTopics.slice(0, 5).map(([topic, count]) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
            <span>${parseBilingualString(topic).ru}</span>
            <span style="font-weight: bold; color: var(--danger);">${count}</span>
          </div>
          <div style="height: 4px; background: var(--surface-3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: var(--danger); width: ${(count / mistakeIds.length) * 100}%"></div>
          </div>
          <div style="margin-bottom: 8px;"></div>
        `).join("")}
      </div>

      <!-- By Part of Speech -->
      <div style="background: var(--surface-2); padding: 15px; border-radius: 16px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--text-sub);">По частям речи</h4>
        ${sortedParts.slice(0, 5).map(([part, count]) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
            <span>${parseBilingualString(part).ru}</span>
            <span style="font-weight: bold; color: var(--warning);">${count}</span>
          </div>
          <div style="height: 4px; background: var(--surface-3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: var(--warning); width: ${(count / mistakeIds.length) * 100}%"></div>
          </div>
          <div style="margin-bottom: 8px;"></div>
        `).join("")}
      </div>
    </div>

    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--text-sub);">Список слов</h4>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${words.slice(0, 20).map(w => `
        <div class="list-item mistake">
          <div class="list-col-main">
            <div class="list-word">${w.word_kr}</div>
            <div class="list-trans">${w.translation}</div>
          </div>
          <div class="list-col-meta">
            <span class="list-badge">${w.level || "★☆☆"}</span>
          </div>
        </div>
      `).join("")}
      ${words.length > 20 ? `<div style="text-align: center; font-size: 12px; color: var(--text-sub); margin-top: 5px;">...и еще ${words.length - 20}</div>` : ""}
    </div>
  `;

  container.innerHTML = html;
}

// Expose for inline onclick
(window as any).startMistakeQuiz = () => {
  closeModal("mistakes-modal");
  closeModal("stats-modal");
  
  // Configure quiz to show mistakes
  const mistakeBtn = document.querySelector(".mistake-chip") as HTMLElement;
  if (mistakeBtn) setStarFilter("mistakes", mistakeBtn);
  
  // Open quiz modal
  openModal("quiz-modal");
};

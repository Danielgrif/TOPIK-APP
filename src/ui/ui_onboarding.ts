import { showToast } from "../utils/utils.ts";
import { LS_KEYS } from "../core/constants.ts";
import { Scheduler } from "../core/scheduler.ts";
import { state } from "../core/state.ts";
import { closeModal, openModal } from "./ui_modal.ts";
import { renderDetailedStats } from "../core/stats.ts";

// --- Styles (Injected dynamically) ---
const ONBOARDING_STYLES = `
    #custom-onboarding-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: 99999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        /* Убираем блокировку событий, чтобы можно было кликать сквозь оверлей */
        pointer-events: none !important; 
    }
    #custom-onboarding-overlay.active {
        opacity: 1;
    }
    
    /* Рамка-фокус вместо затемнения */
    .onboarding-spotlight {
        position: absolute;
        border-radius: 12px;
        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        pointer-events: none;
        z-index: 21001; /* Поверх всего, даже модалок */
        border-width: 3px;
        border-style: solid;
        animation: ob-pulse 4s infinite linear;
    }

    @keyframes ob-pulse {
        0% { border-color: #7c3aed; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2), 0 0 20px rgba(124, 58, 237, 0.4); transform: scale(1); }
        14% { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 20px rgba(37, 99, 235, 0.4); }
        28% { border-color: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.2), 0 0 20px rgba(5, 150, 105, 0.4); }
        42% { border-color: #ea580c; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2), 0 0 20px rgba(234, 88, 12, 0.4); transform: scale(1.02); }
        57% { border-color: #db2777; box-shadow: 0 0 0 4px rgba(219, 39, 119, 0.2), 0 0 20px rgba(219, 39, 119, 0.4); }
        71% { border-color: #e11d48; box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.2), 0 0 20px rgba(225, 29, 72, 0.4); }
        85% { border-color: #9333ea; box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.2), 0 0 20px rgba(147, 51, 234, 0.4); }
        100% { border-color: #7c3aed; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2), 0 0 20px rgba(124, 58, 237, 0.4); transform: scale(1); }
    }

    .onboarding-card {
        position: absolute;
        background: var(--surface-1);
        color: var(--text-main);
        padding: 0;
        border-radius: 20px;
        width: 320px;
        max-width: 90vw;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        border: 1px solid var(--border-color);
        z-index: 21002; /* Поверх спотлайта и модалок */
        overflow: hidden;
        display: flex; flex-direction: column;
        pointer-events: auto; /* Карточка должна быть кликабельной */
        max-height: 85vh; /* Ограничение высоты для мобильных экранов */
    }
    .onboarding-card:not(.dragging) {
        transition: top 0.4s cubic-bezier(0.25, 1, 0.5, 1), left 0.4s cubic-bezier(0.25, 1, 0.5, 1), right 0.4s cubic-bezier(0.25, 1, 0.5, 1), width 0.3s ease, height 0.3s ease;
    }
    .onboarding-card.dragging {
        transition: none !important;
        box-shadow: 0 15px 50px rgba(0,0,0,0.3);
        cursor: grabbing;
    }
    .onboarding-card.minimized {
        width: auto !important;
        max-width: 220px !important;
        padding: 10px 16px !important;
        border-radius: 30px !important;
    }
    .onboarding-card.minimized .ob-body,
    .onboarding-card.minimized .ob-footer,
    .onboarding-card.minimized .ob-progress-container,
    .onboarding-card.minimized .ob-close {
        display: none !important;
    }
    .onboarding-card.minimized .ob-header {
        margin-bottom: 0;
        padding-right: 24px;
        gap: 8px;
    }
    .onboarding-card.minimized .ob-title {
        font-size: 14px;
        margin-bottom: 0;
    }
    .onboarding-card.minimized .ob-emoji {
        font-size: 20px;
        animation: none;
    }
    .onboarding-card.minimized .ob-minimize-btn {
        right: 8px; top: 50%; transform: translateY(-50%);
    }

    .ob-header {
        display: flex; align-items: center; gap: 12px;
        margin-bottom: 12px; padding-right: 24px;
        cursor: grab;
        touch-action: none; /* Важно: отключает скролл страницы при перетаскивании карточки */
    }
    .ob-header:active { cursor: grabbing; }

    .ob-emoji { font-size: 28px; animation: bounce 2s infinite; }
    .ob-title { font-weight: 800; font-size: 18px; line-height: 1.2; }
    .ob-body {
        font-size: 15px; line-height: 1.6;
        color: var(--text-sub); margin-bottom: 24px;
        overflow-y: auto; /* Разрешаем скролл текста, если он не влезает */
    }
    .ob-footer {
        display: flex; justify-content: space-between;
        align-items: center; margin-top: 10px;
    }
    .ob-progress-container {
        width: 100%; height: 4px; background: var(--surface-2);
    }
    .ob-progress-bar {
        height: 100%; background: var(--primary);
        transition: width 0.3s ease;
    }

    .ob-content { 
        padding: 20px 24px 24px 24px; position: relative;
        display: flex; flex-direction: column;
        height: 100%; overflow: hidden; /* Фиксируем структуру для скролла */
    }

    .ob-btn {
        background: var(--primary); color: white; border: none;
        padding: 10px 20px; border-radius: 12px;
        font-weight: 600; cursor: pointer; font-size: 14px;
        transition: transform 0.1s;
    }
    .ob-btn:active { transform: scale(0.95); }
    .ob-skip {
        background: transparent; color: var(--text-tertiary);
        border: none; cursor: pointer; font-size: 13px; padding: 5px;
    }
    .ob-skip:hover { color: var(--text-main); }

    .ob-close {
        position: absolute; top: 10px; right: 10px;
        background: transparent; border: none;
        color: var(--text-tertiary); cursor: pointer;
        font-size: 18px; padding: 5px; line-height: 1;
    }
    .ob-close:hover { color: var(--text-main); background: var(--surface-2); border-radius: 50%; }

    .ob-minimize-btn {
        position: absolute; top: 10px; right: 40px;
        background: transparent; border: none;
        color: var(--text-tertiary); cursor: pointer;
        font-size: 18px; padding: 5px; line-height: 1;
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
    }
    .ob-minimize-btn:hover { color: var(--text-main); background: var(--surface-2); }

    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
        40% {transform: translateY(-6px);}
        60% {transform: translateY(-3px);}
    }
`;

// --- Logic ---

interface Step {
  target?: string;
  title: string;
  text: string;
  explanation?: string; // Текст после клика
  emoji: string;
  interactive?: boolean;
  cleanup?: () => void; // Функция очистки перед следующим шагом
  skipInteractionIf?: () => boolean; // Условие пропуска интерактива
  requiresModal?: string;
}

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Добро пожаловать!",
    text: "Я твой гид. Покажу, что где находится.<br><br><small>💡 Меня можно перетаскивать и сворачивать.</small>",
    explanation: "Поехали! 🚀",
  },
  // --- Toolbar ---
  {
    target: ".search-container",
    emoji: "🔎",
    title: "Поиск",
    text: "Мгновенный поиск слов.",
    explanation: "Работает даже офлайн.",
    interactive: true,
  },
  {
    target: ".view-toggle",
    emoji: "👀",
    title: "Вид",
    text: "Переключение: плитка или список.",
    explanation: "Выбирай, как удобнее.",
    interactive: true,
  },
  {
    target: ".tool-btn[data-action='toggle-filter-panel']",
    emoji: "🌪️",
    title: "Фильтры",
    text: "Настройки фильтрации и сортировки.",
    explanation: "Найди нужные слова.",
    interactive: true,
  },
  {
    target: ".filter-group:nth-of-type(2)", // Target the whole "Difficulty and Status" group
    emoji: "✨",
    title: "Статус",
    text: "Фильтр по сложности или статусу.",
    explanation: "Например, только 'Избранное'.",
    interactive: false, // Just highlight
    cleanup: () => {
      const btn = document.querySelector(
        "[data-action='toggle-filter-panel']",
      ) as HTMLElement;
      if (
        btn &&
        document.getElementById("filter-panel")?.classList.contains("show")
      )
        btn.click();
    },
  },
  // --- Header ---
  {
    target: "#xp-level-widget",
    emoji: "📈",
    title: "Прогресс",
    text: "Твой текущий уровень и опыт.",
    explanation: "Нажми для полной статистики.",
    interactive: true,
  },
  {
    target: "#stats-details", // Inside stats modal
    requiresModal: "stats-modal",
    emoji: "📊",
    title: "Статистика",
    text: "Графики активности и кривая забывания.",
    explanation: "Следи за успехами.",
    interactive: false,
    cleanup: () => closeModal("stats-modal"),
  },
  {
    target: ".coin-pill",
    emoji: "💰",
    title: "Магазин",
    text: "Монеты и ежедневные награды.",
    explanation: "Покупай темы и бонусы.",
    interactive: true,
    cleanup: () => closeModal("shop-modal"),
  },
  // --- Actions ---
  {
    target: "#bottom-nav [data-action='open-collections-filter']",
    emoji: "📂",
    title: "Списки",
    text: "Твои личные словари.",
    explanation: "Управляй подборками слов.",
    interactive: true,
  },
  {
    target: "#collections-list", // Inside collections
    requiresModal: "collections-modal",
    emoji: "📝",
    title: "Коллекции",
    text: "Личные и общие списки.",
    explanation: "Для дорам, песен и учебы.",
    interactive: false,
    cleanup: () => closeModal("collections-modal"),
  },
  {
    target: "[data-modal-target='quiz-modal']",
    emoji: "🎮",
    title: "Тренировки",
    text: "15+ режимов для запоминания.",
    explanation: "Игры и тесты.",
    interactive: true,
  },
  {
    target: "#quiz-mode-selector", // Inside quiz
    requiresModal: "quiz-modal",
    emoji: "🕹️",
    title: "Режимы",
    text: "Выбирай игру под настроение.",
    explanation: "Спринт, Выживание и другие.",
    interactive: false,
    cleanup: () => closeModal("quiz-modal"),
  },
  {
    target: "[data-action='open-review']",
    emoji: "🧠",
    title: "SRS",
    text: "Умное интервальное повторение.",
    explanation: "Алгоритм подскажет, что повторить.",
    interactive: true,
    cleanup: () => closeModal("review-modal"),
    skipInteractionIf: () => {
      try {
        Scheduler.init({
          dataStore: state.dataStore,
          wordHistory: state.wordHistory,
        });
        const q = Scheduler.getQueue({ limit: 1 });
        return q.length === 0;
      } catch {
        return true;
      }
    },
  },
  {
    target: "#profile-button",
    emoji: "⚙️",
    title: "Профиль",
    text: "Настройки и аккаунт.",
    explanation: "Синхронизация и персонализация.",
    interactive: true,
  },
  {
    target: ".settings-section:first-of-type", // Inside profile
    requiresModal: "profile-modal",
    emoji: "🎨",
    title: "Опции",
    text: "Темы, звук, скорость речи.",
    explanation: "Настрой приложение под себя.",
    interactive: false,
    cleanup: () => closeModal("profile-modal"),
  },
  {
    emoji: "🚀",
    title: "Готово!",
    text: "Теперь ты знаешь всё необходимое.",
    explanation: "Удачи в обучении! 화이팅!",
    interactive: false,
    cleanup: () => {},
  },
];

let currentStepIndex = 0;
let overlay: HTMLElement | null = null;
let card: HTMLElement | null = null;
let spotlight: HTMLElement | null = null;
let resizeObserver: ResizeObserver | null = null;
let hasUserMovedCard = false;
let isMinimized = false;

function injectStyles() {
  if (document.getElementById("custom-onboarding-styles")) return;
  const style = document.createElement("style");
  style.id = "custom-onboarding-styles";
  style.textContent = ONBOARDING_STYLES;
  document.head.appendChild(style);
}

function createOverlay() {
  const existing = document.getElementById("custom-onboarding-overlay");
  if (existing) {
    overlay = existing;
    card = existing.querySelector(".onboarding-card");
    spotlight = existing.querySelector(".onboarding-spotlight");
    return;
  }

  overlay = document.createElement("div");
  overlay.id = "custom-onboarding-overlay";

  // Prevent closing when clicking on the background
  overlay.addEventListener("click", (e) => {
    // If the click target is the overlay itself, but not the card or its children, stop the event.
    if (card && !card.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Spotlight Div (вместо SVG)
  spotlight = document.createElement("div");
  spotlight.className = "onboarding-spotlight";
  overlay.appendChild(spotlight);

  // Card
  card = document.createElement("div");
  card.className = "onboarding-card";
  overlay.appendChild(card);

  setupDrag(card);

  // Double click to toggle minimize
  card.addEventListener("dblclick", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest(".ob-header")) {
      toggleMinimize();
    }
  });

  // Double tap for mobile
  let lastTap = 0;
  card.addEventListener("touchend", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      if ((e.target as HTMLElement).closest(".ob-header")) {
        e.preventDefault();
        toggleMinimize();
      }
    }
    lastTap = currentTime;
  });

  document.body.appendChild(overlay);

  // Handle resize & scroll to keep UI in sync
  const updateUI = () => {
    if (overlay?.classList.contains("active")) {
      const step = STEPS[currentStepIndex];
      const targetEl = getTargetEl(step.target);
      const rect = targetEl ? targetEl.getBoundingClientRect() : null;
      updateSpotlight(rect);
      updateCardPosition(rect);
    }
  };

  window.addEventListener("resize", updateUI);
  window.addEventListener("scroll", updateUI, { capture: true, passive: true });
}

function setupDrag(el: HTMLElement) {
  let startX = 0,
    startY = 0,
    initialLeft = 0,
    initialTop = 0;

  const onMouseDown = (e: MouseEvent | TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (!(e.target as HTMLElement).closest(".ob-header")) return;

    hasUserMovedCard = true;
    el.classList.add("dragging");

    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    startX = clientX;
    startY = clientY;

    const rect = el.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    el.style.bottom = "auto";
    el.style.right = "auto";
    el.style.transform = "none";
    el.style.left = `${initialLeft}px`;
    el.style.top = `${initialTop}px`;
  };

  const onMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!el.classList.contains("dragging")) return;
    e.preventDefault();

    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    el.style.left = `${initialLeft + dx}px`;
    el.style.top = `${initialTop + dy}px`;
  };

  const onMouseUp = () => el.classList.remove("dragging");

  el.addEventListener("mousedown", onMouseDown);
  el.addEventListener("touchstart", onMouseDown, { passive: false });
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("touchmove", onMouseMove, { passive: false });
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("touchend", onMouseUp);
}

function getTargetEl(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const elements = document.querySelectorAll(selector);
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    if (el.offsetParent !== null) return el;
  }
  return null;
}

function updateSpotlight(rect: DOMRect | null) {
  if (!spotlight) return;

  if (!rect) {
    // Скрываем рамку, если элемента нет
    spotlight.style.width = "0px";
    spotlight.style.height = "0px";
    spotlight.style.top = "50%";
    spotlight.style.left = "50%";
    spotlight.style.opacity = "0";
    spotlight.style.boxShadow = "none";
    spotlight.style.border = "none";
    return;
  }

  const pad = 5;

  // Позиционируем "дырку"
  spotlight.style.width = `${rect.width + pad * 2}px`;
  spotlight.style.height = `${rect.height + pad * 2}px`;
  spotlight.style.top = `${rect.top - pad}px`;
  spotlight.style.left = `${rect.left - pad}px`;

  // Восстанавливаем стили
  spotlight.style.opacity = "1";
  spotlight.style.borderWidth = "3px";
  spotlight.style.borderStyle = "solid";
  spotlight.style.borderColor = ""; // Let animation handle color
  spotlight.style.boxShadow = ""; // Let animation handle shadow
  spotlight.style.borderRadius = "12px";
}

function updateCardPosition(rect: DOMRect | null) {
  if (!card || hasUserMovedCard) return;

  // Сброс стилей позиционирования
  card.style.top = "";
  card.style.bottom = "";
  card.style.left = "";
  card.style.right = "";
  card.style.transform = "";

  if (!rect) {
    // Если нет цели — по центру
    card.style.top = "50%";
    card.style.left = "50%";
    card.style.transform = "translate(-50%, -50%)";
    return;
  }

  const viewportH = window.innerHeight;

  // Определяем, в какой половине экрана находится целевой элемент
  const targetCenterY = rect.top + rect.height / 2;
  const isTopHalf = targetCenterY < viewportH / 2;

  // Горизонтальное центрирование
  card.style.left = "50%";
  card.style.transform = "translateX(-50%)";

  // Вертикальное позиционирование: всегда в противоположной половине
  if (isTopHalf) {
    // Цель сверху -> Карточка снизу (отступ 100px для учета нижней навигации)
    card.style.bottom = "100px";
  } else {
    // Цель снизу -> Карточка сверху (отступ 90px для учета хедера)
    card.style.top = "90px";
  }
}

async function renderStep() {
  if (!card || !overlay) return;

  hasUserMovedCard = false;
  isMinimized = false;
  card.classList.remove("minimized");

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Сбрасываем маску в дефолтное состояние (центр) перед поиском
  updateSpotlight(null);
  updateCardPosition(null);
  // Убираем старую подсветку, если она была (хотя теперь мы не меняем z-index)

  const step = STEPS[currentStepIndex];

  // NEW: Ensure required modal is open
  if (step.requiresModal) {
    const modal = document.getElementById(step.requiresModal);
    if (modal && !modal.classList.contains("active")) {
      console.info(
        `[Onboarding] Step requires modal '${step.requiresModal}', opening it.`,
      );
      openModal(step.requiresModal);
      if (step.requiresModal === "stats-modal") {
        renderDetailedStats();
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  // Wait for element if it's inside a modal that might be animating
  let targetEl = getTargetEl(step.target);
  if (step.target && !targetEl) {
    // Retry a few times
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 100));
      targetEl = getTargetEl(step.target);
      if (targetEl) break;
    }
  }

  const rect = targetEl ? targetEl.getBoundingClientRect() : null;

  // Проверяем, нужно ли пропускать интерактив (например, если нет слов для повторения)
  let skipInteraction = false;
  if (step.skipInteractionIf && step.skipInteractionIf()) {
    skipInteraction = true;
  }

  // Scroll target into view if needed
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // Observe element size changes
    resizeObserver = new ResizeObserver(() => {
      const newRect = targetEl!.getBoundingClientRect();
      updateSpotlight(newRect);
      updateCardPosition(newRect);
    });
    resizeObserver.observe(targetEl);
  }

  // Текст карточки зависит от фазы
  const title = step.title;
  let body = step.text;
  // Объединяем текст и объяснение, так как теперь нет фаз
  if (skipInteraction) {
    body += `<br><br><span style="color: var(--warning); font-size: 0.9em;">⚠️ Пока недоступно (нет данных)</span>`;
  } else if (step.explanation) {
    body += `<br><br><span style="opacity: 0.8; font-size: 0.9em;">💡 ${step.explanation}</span>`;
  }

  // Всегда показываем кнопку "Далее"
  const showNextBtn = true;

  // Update Content
  const progressPct = ((currentStepIndex + 1) / STEPS.length) * 100;

  card.innerHTML = `
    <div class="ob-progress-container">
      <div class="ob-progress-bar" style="width: ${progressPct}%"></div>
    </div>
    <div class="ob-content">
      <button class="ob-minimize-btn" id="ob-min-btn" title="Свернуть">_</button>
      <button class="ob-close" id="ob-skip-btn" title="Закрыть обучение">✕</button>
      <div class="ob-header">
        <div class="ob-emoji">${step.emoji}</div>
        <div class="ob-title">${title}</div>
      </div>
      <div class="ob-body">${body}</div>
      <div class="ob-footer">
        <div>${currentStepIndex > 0 ? `<button class="ob-skip" id="ob-prev-btn">← Назад</button>` : ""}</div>
        <div>${
          showNextBtn
            ? `<button class="ob-btn" id="ob-next-btn">${currentStepIndex === STEPS.length - 1 ? "Поехали! 🚀" : "Далее"}</button>`
            : `<div style="font-size:12px; color:var(--primary); font-weight:bold;">👇 Нажми на элемент</div>`
        }
        </div>
      </div>
    </div>
  `;

  // Bind events
  const nextBtn = document.getElementById("ob-next-btn");
  if (nextBtn) nextBtn.onclick = nextStep;
  const skipBtn = document.getElementById("ob-skip-btn");
  if (skipBtn) skipBtn.onclick = finishOnboarding;
  const prevBtn = document.getElementById("ob-prev-btn");
  if (prevBtn) prevBtn.onclick = prevStep;

  const minBtn = document.getElementById("ob-min-btn");
  if (minBtn) minBtn.onclick = toggleMinimize;

  // Update Visuals
  updateSpotlight(rect);

  requestAnimationFrame(() => {
    // Recalculate rect after scroll might have happened (smooth scroll)
    const newRect = targetEl ? targetEl.getBoundingClientRect() : null;
    updateSpotlight(newRect);
    updateCardPosition(newRect);
  });
}

function toggleMinimize() {
  if (!card) return;
  isMinimized = !isMinimized;
  card.classList.toggle("minimized", isMinimized);
  const btn = document.getElementById("ob-min-btn");
  if (btn) btn.textContent = isMinimized ? "□" : "_";
  if (isMinimized) {
    snapToEdge();
  }
}

function nextStep() {
  if (currentStepIndex < STEPS.length - 1) {
    // Выполняем очистку предыдущего шага (закрываем модалки)
    const prevStep = STEPS[currentStepIndex];
    if (prevStep.cleanup) {
      try {
        prevStep.cleanup();
      } catch (e) {
        console.error("Onboarding cleanup error:", e);
      }
    }

    currentStepIndex++;
    // Небольшая задержка, чтобы UI успел обновиться (например, закрыться модалка)
    setTimeout(() => renderStep(), 50);
  } else {
    finishOnboarding();
  }
}

function prevStep() {
  if (currentStepIndex > 0) {
    const currStep = STEPS[currentStepIndex];
    if (currStep.cleanup) {
      try {
        currStep.cleanup();
      } catch (e) {
        console.error("Onboarding cleanup error:", e);
      }
    }

    currentStepIndex--;
    setTimeout(() => renderStep(), 50);
  }
}

function finishOnboarding() {
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => {
      overlay?.remove();
      overlay = null;
    }, 300);
  }
  localStorage.setItem(LS_KEYS.ONBOARDING, "true");
  showToast("Удачи в обучении! 🍀");
}

export function startOnboarding() {
  // Close any open modals first to ensure clean state
  document.querySelectorAll(".modal.active").forEach((m) => {
    m.classList.remove("active");
  });
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  localStorage.removeItem(LS_KEYS.ONBOARDING);
  injectStyles();
  createOverlay();
  currentStepIndex = 0;
  if (overlay) overlay.classList.add("active");
  renderStep();
}

export function checkAndShowOnboarding() {
  // Check if already completed
  if (localStorage.getItem(LS_KEYS.ONBOARDING)) return;
  setTimeout(() => startOnboarding(), 1000);
}

function snapToEdge() {
  if (!card) return;
  hasUserMovedCard = true;

  const rect = card.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const centerX = rect.left + rect.width / 2;

  // Clamp vertical position
  let top = rect.top;
  top = Math.max(80, Math.min(top, viewportH - 120));

  card.style.transform = "none";
  card.style.top = `${top}px`;

  if (centerX > viewportW / 2) {
    card.style.left = "auto";
    card.style.right = "20px";
  } else {
    card.style.left = "20px";
    card.style.right = "auto";
  }
}

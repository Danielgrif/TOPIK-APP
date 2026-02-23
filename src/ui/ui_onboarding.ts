import { showToast, playTone } from "../utils/utils.ts";
import { LS_KEYS } from "../core/constants.ts";
import { Scheduler } from "../core/scheduler.ts";
import { state } from "../core/state.ts";
import { closeModal } from "./ui_modal.ts";

// --- Styles (Injected dynamically) ---
const ONBOARDING_STYLES = `
  #custom-onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99999;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-family: 'Pretendard Variable', sans-serif;
  }
  #custom-onboarding-overlay.active {
    opacity: 1;
    pointer-events: auto;
  }
  
  .onboarding-mask {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
  .onboarding-mask path {
    fill: rgba(0, 0, 0, 0.75);
    fill-rule: evenodd;
    transition: d 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  
  .onboarding-focus-border {
    fill: none;
    stroke: var(--primary, #6c5ce7);
    stroke-width: 4px;
    transition: d 0.2s ease-out; /* Faster transition for responsiveness */
    filter: drop-shadow(0 0 8px rgba(108, 92, 231, 0.6));
    animation: ob-pulse 2s infinite ease-in-out;
    pointer-events: none;
  }

  @keyframes ob-pulse {
    0% { stroke-width: 3px; filter: drop-shadow(0 0 5px rgba(108, 92, 231, 0.4)); stroke-opacity: 0.8; }
    50% { stroke-width: 5px; filter: drop-shadow(0 0 15px rgba(108, 92, 231, 0.9)); stroke-opacity: 1; }
    100% { stroke-width: 3px; filter: drop-shadow(0 0 5px rgba(108, 92, 231, 0.4)); stroke-opacity: 0.8; }
  }

  .onboarding-card {
    position: absolute;
    background: var(--surface-1, #ffffff);
    color: var(--text-main, #000000);
    padding: 0; /* Padding moved to inner wrapper */
    border-radius: 20px;
    width: 320px;
    max-width: 90vw;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    border: 1px solid var(--border-color, rgba(0,0,0,0.1));
    transition: top 0.4s cubic-bezier(0.25, 1, 0.5, 1), left 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    z-index: 100002;
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  
  .ob-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-right: 24px; /* Space for close button */
  }
  .ob-emoji { font-size: 28px; animation: bounce 2s infinite; }
  .ob-title { font-weight: 800; font-size: 18px; line-height: 1.2; }
  
  .ob-body {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-sub, #555);
    margin-bottom: 24px;
  }
  
  .ob-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }
  
  .ob-progress-container {
    width: 100%;
    height: 4px;
    background: var(--surface-2, #eee);
  }
  .ob-progress-bar {
    height: 100%;
    background: var(--primary, #6c5ce7);
    transition: width 0.3s ease;
  }

  .ob-content {
    padding: 20px 24px 24px 24px;
    position: relative;
  }

  
  .ob-btn {
    background: var(--primary, #6c5ce7);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    transition: transform 0.1s;
  }
  .ob-btn:active { transform: scale(0.95); }
  
  .ob-skip {
    background: transparent;
    color: var(--text-tertiary, #999);
    border: none;
    cursor: pointer;
    font-size: 13px;
    padding: 5px;
  }
  .ob-skip:hover { color: var(--text-main); }

  .ob-close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 18px;
    padding: 5px;
    line-height: 1;
  }
  .ob-close:hover { color: var(--text-main); background: var(--surface-2); border-radius: 50%; }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-6px);}
    60% {transform: translateY(-3px);}
  }

  .ob-click-catcher {
    position: absolute;
    z-index: 100001; /* Above highlighted element (100000) but below card (100002) */
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s ease;
    box-shadow: 0 0 0 0px rgba(108, 92, 231, 0.7);
    animation: pulse-border 2s infinite;
  }
  .ob-click-catcher:hover {
    background-color: rgba(108, 92, 231, 0.1);
  }
  @keyframes pulse-border {
    0% { box-shadow: 0 0 0 0px rgba(108, 92, 231, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(108, 92, 231, 0); }
    100% { box-shadow: 0 0 0 0px rgba(108, 92, 231, 0); }
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
}

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Добро пожаловать!",
    text: "Я твой личный тренер по корейскому. Давай быстренько пробежимся по кнопкам, чтобы ты не тыкал наугад!",
    explanation: "Поехали! 🚀",
  },
  // --- Toolbar ---
  {
    target: ".search-container",
    emoji: "🔎",
    title: "Поиск",
    text: "Ищешь конкретное слово? Вводи сюда на корейском или русском.",
    explanation: "Поиск работает мгновенно, даже офлайн.",
    interactive: true,
  },
  {
    target: ".view-toggles",
    emoji: "👀",
    title: "Вид",
    text: "Плитка или список? Переключай, как тебе удобнее.",
    explanation: "В списке больше деталей, а в плитке — красивые карточки.",
    interactive: true,
  },
  {
    target: "[data-action='toggle-filter-panel']",
    emoji: "🌪️",
    title: "Фильтры и Сортировка",
    text: "Нужно найти только глаголы или слова 3 уровня? Жми сюда.",
    explanation: "Тут куча настроек фильтрации и сортировки.",
    interactive: true,
    // No cleanup, we want to show inside
  },
  {
    target: "#level-filters",
    emoji: "✨",
    title: "Сложность",
    text: "Внутри фильтров можно выбрать уровень сложности или показать только 'Избранное'.",
    explanation: "Очень удобно для повторения сложных слов.",
    interactive: false, // Just highlight
    cleanup: () => {
      const btn = document.querySelector("[data-action='toggle-filter-panel']") as HTMLElement;
      if (btn && document.getElementById("filter-panel")?.classList.contains("show")) btn.click();
    },
  },
  {
    target: "#focus-mode-btn",
    emoji: "🧘",
    title: "Дзен-режим",
    text: "Отвлекает интерфейс? Нажми на глаз, чтобы скрыть всё лишнее.",
    explanation: "Дзен-режим для глубокого погружения.",
    interactive: true,
    cleanup: () => {
      if (document.body.classList.contains("focus-mode")) {
        const btn = document.getElementById("focus-mode-btn");
        if (btn) btn.click();
      }
    },
  },
  // --- Header ---
  {
    target: "#xp-level-widget",
    emoji: "📈",
    title: "Твой прогресс",
    text: "Это твой уровень. Нажми на шкалу, чтобы открыть полную статистику.",
    explanation: "Тут вся твоя статистика. Чем больше учишь, тем выше уровень. Всё просто, как хангыль!",
    interactive: true,
    // No cleanup, show inside
  },
  {
    target: "#stats-details", // Inside stats modal
    emoji: "📊",
    title: "Детали",
    text: "Здесь живут графики активности и кривая забывания.",
    explanation: "Следи за тем, чтобы кривая шла вверх!",
    interactive: false,
    cleanup: () => closeModal("stats-modal"),
  },
  {
    target: ".coin-pill",
    emoji: "💰",
    title: "Магазин наград",
    text: "Твои монеты. Нажми, чтобы потратить.",
    explanation: "Покупай темы и заморозку серии.",
    interactive: true,
    // No cleanup
  },
  {
    target: ".shop-tabs", // Inside shop
    emoji: "🛍️",
    title: "Витрина",
    text: "Темы оформления и полезные бонусы.",
    explanation: "Не копи, трать!",
    interactive: false,
    cleanup: () => closeModal("shop-modal"),
  },
  // --- Actions ---
  {
    target: ".fire-btn",
    emoji: "📅",
    title: "Ежедневный вызов",
    text: "Твой стрик. Нажми, чтобы увидеть задание на сегодня.",
    explanation: "Заходи каждый день, иначе огонек погаснет!",
    interactive: true,
    cleanup: () => {
      closeModal("quiz-modal");
      closeModal("daily-status-modal");
      const quitBtn = document.querySelector('[data-action="quit-quiz"]') as HTMLElement;
      if (quitBtn) quitBtn.click();
    },
  },
  {
    target: "[data-action='open-collections-filter']",
    emoji: "📂",
    title: "Списки",
    text: "Все слова по темам (TOPIK I, II). Нажми, чтобы открыть.",
    explanation: "Выбирай готовые списки или создавай свои.",
    interactive: true,
    // No cleanup
  },
  {
    target: "#collections-list", // Inside collections
    emoji: "📝",
    title: "Твои списки",
    text: "Здесь будут твои личные подборки и общие списки.",
    explanation: "Создавай списки для дорам, k-pop песен или учебника.",
    interactive: false,
    cleanup: () => closeModal("collections-modal"),
  },
  {
    target: "[data-modal-target='quiz-modal']",
    emoji: "🎮",
    title: "Тренировки",
    text: "15 режимов игры для запоминания. Жми!",
    explanation: "Спринт, Выживание, Аудирование... 15 способов помучить свой мозг и выучить слова. Выбирай любой!",
    interactive: true,
    // No cleanup
  },
  {
    target: "#quiz-mode-selector", // Inside quiz
    emoji: "🕹️",
    title: "Режимы",
    text: "Выбирай любой режим под настроение.",
    explanation: "Попробуй 'Выживание', если смелый!",
    interactive: false,
    cleanup: () => closeModal("quiz-modal"),
  },
  {
    target: "[data-action='open-review']",
    emoji: "🧠",
    title: "SRS Повторение",
    text: "Умное повторение. Нажми, если есть слова.",
    explanation: "Алгоритм сам решит, что тебе пора повторить.",
    interactive: true,
    cleanup: () => closeModal("review-modal"),
    skipInteractionIf: () => {
      try {
        Scheduler.init({ dataStore: state.dataStore, wordHistory: state.wordHistory });
        const q = Scheduler.getQueue({ limit: 1 });
        return q.length === 0;
      } catch { return true; }
    }
  },
  {
    target: ".fab-btn",
    emoji: "➕",
    title: "Добавить слово",
    text: "Не нашел слово? Добавь своё!",
    explanation: "AI поможет с переводом и озвучкой.",
    interactive: true,
    cleanup: () => closeModal("add-word-modal"),
  },
  {
    target: "#profile-button",
    emoji: "⚙️",
    title: "Профиль",
    text: "Настройки и синхронизация.",
    explanation: "Загляни сюда, чтобы настроить приложение под себя.",
    interactive: true,
    // No cleanup
  },
  {
    target: ".settings-group", // Inside profile
    emoji: "🎛️",
    title: "Опции",
    text: "Темная тема, скорость речи, музыка...",
    explanation: "Настрой всё как нравится.",
    interactive: false,
    cleanup: () => closeModal("profile-modal"),
  },
  {
    emoji: "🚀",
    title: "Финиш!",
    text: "Теперь ты знаешь абсолютно всё. Пора учиться!",
    explanation: "Удачи! 화이팅!",
    interactive: false,
    cleanup: () => {},
  },
];

let currentStepIndex = 0;
let overlay: HTMLElement | null = null;
let card: HTMLElement | null = null;
let maskPath: SVGPathElement | null = null;
let clickCatcher: HTMLElement | null = null;
let isExplanationPhase = false; // Флаг: показываем объяснение или ждем клика
let resizeObserver: ResizeObserver | null = null;

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
    const svg = existing.querySelector(".onboarding-mask");
    clickCatcher = existing.querySelector(".ob-click-catcher");
    if (svg) maskPath = svg.querySelector("path");
    isExplanationPhase = false;
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

  // SVG Mask
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("onboarding-mask");
  maskPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  maskPath.setAttribute("fill-rule", "evenodd");
  maskPath.setAttribute("clip-rule", "evenodd");
  svg.appendChild(maskPath);
  
  // Add Border Path
  const borderPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  borderPath.classList.add("onboarding-focus-border");
  svg.appendChild(borderPath);
  overlay.appendChild(svg);

  // Card
  card = document.createElement("div");
  card.className = "onboarding-card";
  overlay.appendChild(card);

  // Click Catcher (Interactive Element)
  clickCatcher = document.createElement("div");
  clickCatcher.className = "ob-click-catcher";
  clickCatcher.style.display = "none";
  overlay.appendChild(clickCatcher);

  document.body.appendChild(overlay);

  // Handle resize & scroll to keep UI in sync
  const updateUI = () => {
    if (overlay?.classList.contains("active")) {
      const step = STEPS[currentStepIndex];
      const targetEl = getTargetEl(step.target);
      const rect = targetEl ? targetEl.getBoundingClientRect() : null;
      updateMask(rect);
      updateCardPosition(rect);

      if (clickCatcher && clickCatcher.style.display !== "none" && rect) {
        clickCatcher.style.top = `${rect.top}px`;
        clickCatcher.style.left = `${rect.left}px`;
      }
    }
  };

  window.addEventListener("resize", updateUI);
  window.addEventListener("scroll", updateUI, { capture: true, passive: true });
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

function updateMask(rect: DOMRect | null) {
  if (!maskPath) return;
  const borderPath = overlay?.querySelector(".onboarding-focus-border");
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (!rect) {
    // Full screen mask (no hole)
    maskPath.setAttribute("d", `M0,0 H${w} V${h} H0 Z`);
    return;
  }

  const pad = 5;
  const rw = rect.width + pad * 2;
  const rh = rect.height + pad * 2;
  // Динамический радиус: не больше 12px, но и не больше половины стороны (чтобы не было артефактов на мелких кнопках)
  const r = Math.min(12, rw / 2, rh / 2);
  const x = rect.left - pad;
  const y = rect.top - pad;

  // Path with hole (Counter-Clockwise for inner rect to ensure hole is cut)
  // Outer: Clockwise
  // Inner: Counter-Clockwise
  const path = `
    M0,0 H${w} V${h} H0 Z
    M${x + r},${y} 
    a${r},${r} 0 0 0 -${r},${r} 
    v${rh - 2 * r} 
    a${r},${r} 0 0 0 ${r},${r} 
    h${rw - 2 * r} 
    a${r},${r} 0 0 0 ${r},-${r} 
    v-${rh - 2 * r} 
    a${r},${r} 0 0 0 -${r},-${r} 
    h-${rw - 2 * r} 
    z
  `;
  maskPath.setAttribute("d", path);
  
  if (borderPath) {
      // Border path (just the inner shape)
      const borderD = `
        M${x + r},${y} 
        a${r},${r} 0 0 0 -${r},${r} 
        v${rh - 2 * r} 
        a${r},${r} 0 0 0 ${r},${r} 
        h${rw - 2 * r} 
        a${r},${r} 0 0 0 ${r},-${r} 
        v-${rh - 2 * r} 
        a${r},${r} 0 0 0 -${r},-${r} 
        h-${rw - 2 * r} 
        z`;
      borderPath.setAttribute("d", borderD);
  }
}

function updateCardPosition(rect: DOMRect | null) {
  if (!card) return;

  if (!rect) {
    // Center
    card.style.top = "50%";
    card.style.left = "50%";
    card.style.transform = "translate(-50%, -50%)";
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const margin = 20;
  const gap = 15;

  // Horizontal positioning
  let left = rect.left + rect.width / 2 - cardRect.width / 2;
  left = Math.max(margin, Math.min(left, viewportW - cardRect.width - margin));

  // Vertical positioning
  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;

  let top: number;

  // Logic: Prefer bottom. If not enough space, try top.
  // If neither fits perfectly, pick the side with more space and clamp.

  if (spaceBelow >= cardRect.height + gap + margin) {
    // Fits below
    top = rect.bottom + gap;
  } else if (spaceAbove >= cardRect.height + gap + margin) {
    // Fits above
    top = rect.top - cardRect.height - gap;
  } else {
    // Doesn't fit perfectly anywhere. Pick larger space.
    if (spaceBelow > spaceAbove) {
      top = rect.bottom + gap;
      // Clamp to viewport bottom if it overflows
      if (top + cardRect.height > viewportH - margin) {
        top = viewportH - cardRect.height - margin;
      }
    } else {
      top = rect.top - cardRect.height - gap;
      // Clamp to viewport top if it overflows
      if (top < margin) {
        top = margin;
      }
    }
  }

  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
  card.style.transform = "none";
}

async function renderStep() {
  if (!card || !overlay) return;

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Cleanup previous highlight
  document.querySelectorAll(".onboarding-highlighted-element").forEach(el => {
      el.classList.remove("onboarding-highlighted-element");
      (el as HTMLElement).style.zIndex = "";
      (el as HTMLElement).style.position = "";
  });

  const step = STEPS[currentStepIndex];
  
  // Wait for element if it's inside a modal that might be animating
  let targetEl = getTargetEl(step.target);
  if (step.target && !targetEl) {
      // Retry a few times
      for(let i=0; i<5; i++) {
          await new Promise(r => setTimeout(r, 100));
          targetEl = getTargetEl(step.target);
          if(targetEl) break;
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
    
    // Elevate element to sit above the mask
    targetEl.classList.add("onboarding-highlighted-element");
    const computedStyle = window.getComputedStyle(targetEl);
    if (computedStyle.position === "static") {
        targetEl.style.position = "relative";
    }
    targetEl.style.zIndex = "100000";

    // Observe element size changes
    resizeObserver = new ResizeObserver(() => {
      const newRect = targetEl!.getBoundingClientRect();
      updateMask(newRect);
      updateCardPosition(newRect);
      
      if (clickCatcher && clickCatcher.style.display !== "none") {
        clickCatcher.style.top = `${newRect.top}px`;
        clickCatcher.style.left = `${newRect.left}px`;
        clickCatcher.style.width = `${newRect.width}px`;
        clickCatcher.style.height = `${newRect.height}px`;
      }
    });
    resizeObserver.observe(targetEl);
  }

  // Текст карточки зависит от фазы
  let title = step.title;
  let body = step.text;
  if (isExplanationPhase && step.explanation) {
    body = step.explanation;
  }

  // Determine if we show the "Next" button
  let showNextBtn = true;
  if (step.interactive && rect) {
    showNextBtn = false; // Hide button, user must click the element
  }
  
  // Если мы в фазе объяснения или пропускаем интерактив — всегда показываем кнопку "Далее"
  if (isExplanationPhase || skipInteraction) {
    showNextBtn = true;
    if (skipInteraction && step.interactive) {
        body = "Пока тут пусто, но скоро будет жарко! (Нет слов для этого действия)";
    }
  }

  // Update Content
  const progressPct = ((currentStepIndex + 1) / STEPS.length) * 100;

  card.innerHTML = `
    <div class="ob-progress-container">
      <div class="ob-progress-bar" style="width: ${progressPct}%"></div>
    </div>
    <div class="ob-content">
      <button class="ob-close" id="ob-skip-btn" title="Закрыть обучение">✕</button>
      <div class="ob-header">
        <div class="ob-emoji">${step.emoji}</div>
        <div class="ob-title">${title}</div>
      </div>
      <div class="ob-body">${body}</div>
      <div class="ob-footer">
        <div>${currentStepIndex > 0 ? `<button class="ob-skip" id="ob-prev-btn">← Назад</button>` : ''}</div>
        <div>${showNextBtn 
          ? `<button class="ob-btn" id="ob-next-btn">${currentStepIndex === STEPS.length - 1 ? "Поехали! 🚀" : "Далее"}</button>` 
          : `<div style="font-size:12px; color:var(--primary); font-weight:bold;">👇 Нажми на элемент</div>`}
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

  // Setup Interactive Click Catcher
  if (step.interactive && rect && clickCatcher && targetEl && !isExplanationPhase && !skipInteraction) {
    clickCatcher.style.display = "block";
    clickCatcher.style.top = `${rect.top}px`;
    clickCatcher.style.left = `${rect.left}px`;
    clickCatcher.style.width = `${rect.width}px`;
    clickCatcher.style.height = `${rect.height}px`;

    // Copy border radius for better look
    const style = window.getComputedStyle(targetEl);
    clickCatcher.style.borderRadius = style.borderRadius;

    clickCatcher.onclick = (e) => {
      e.stopPropagation();
      playTone("pop");
      
      // Симулируем клик по реальному элементу
      targetEl.click();
      
      // Переходим в фазу объяснения
      isExplanationPhase = true;
      clickCatcher!.style.display = "none"; // Скрываем перехватчик, чтобы можно было взаимодействовать с открытым окном (опционально) или просто обновляем карточку
      renderStep();
    };
  } else if (clickCatcher) {
    clickCatcher.style.display = "none";
  }

  // Update Visuals
  updateMask(rect);

  requestAnimationFrame(() => {
    // Recalculate rect after scroll might have happened (smooth scroll)
    const newRect = targetEl ? targetEl.getBoundingClientRect() : null;
    updateMask(newRect);
    updateCardPosition(newRect);
  });
}

function nextStep() {
  if (currentStepIndex < STEPS.length - 1) {
    // Выполняем очистку предыдущего шага (закрываем модалки)
    const prevStep = STEPS[currentStepIndex];
    if (prevStep.cleanup) prevStep.cleanup();

    isExplanationPhase = false;
    currentStepIndex++;
    renderStep();
  } else {
    finishOnboarding();
  }
}

function prevStep() {
  if (currentStepIndex > 0) {
    const currStep = STEPS[currentStepIndex];
    if (currStep.cleanup) currStep.cleanup();
    
    isExplanationPhase = false;
    currentStepIndex--;
    renderStep();
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
  document.querySelectorAll(".modal.active").forEach(m => {
      m.classList.remove("active");
  });
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  document.querySelectorAll(".onboarding-highlighted-element").forEach(el => {
      el.classList.remove("onboarding-highlighted-element");
      (el as HTMLElement).style.zIndex = "";
      (el as HTMLElement).style.position = "";
  });

  localStorage.removeItem(LS_KEYS.ONBOARDING);
  injectStyles();
  createOverlay();
  isExplanationPhase = false;
  currentStepIndex = 0;
  if (overlay) overlay.classList.add("active");
  renderStep();
}

export function checkAndShowOnboarding() {
  // Check if already completed
  if (localStorage.getItem(LS_KEYS.ONBOARDING)) return;
  setTimeout(() => startOnboarding(), 1000);
}

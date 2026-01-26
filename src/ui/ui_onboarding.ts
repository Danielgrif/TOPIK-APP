import { showToast } from "../utils/utils.ts";

/**
 * Checks if an element is currently visible on the screen.
 * @param el The element to check.
 * @returns True if the element is visible, false otherwise.
 */
function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false;
  // offsetParent is null for elements with display: none or their parents.
  return el.offsetParent !== null;
}

let currentStep = 0;
let inactivityTimer: number | null = null;
let activeElement: HTMLElement | null = null;
let clickHandler: ((e: Event) => void) | null = null;
const onboardingSteps = [
  {
    emoji: "👋",
    title: "Добро пожаловать!",
    text: "TOPIK II Master Pro — ваш личный тренер. Давайте за 1 минуту разберемся, как сдать экзамен на высший балл!",
    target: ""
  },
  {
    emoji: "👤",
    title: "Ваш Профиль",
    text: "Нажмите на профиль, чтобы настроить приложение: ночная тема, голос озвучки и синхронизация.",
    target: "#profile-button"
  },
  {
    emoji: "🔥",
    title: "Ежедневный вызов",
    text: "Ключ к успеху — регулярность. Нажмите на огонек, чтобы увидеть свой прогресс и награды.",
    target: ".fire-btn"
  },
  {
    emoji: "🔍",
    title: "Умные фильтры",
    text: "Нажмите на иконку фильтров, чтобы выбрать тему (например, 'Политика') или уровень TOPIK.",
    target: "button.tool-btn[data-action='toggle-filter-panel']"
  },
  {
    emoji: "🎮",
    title: "Тренировка",
    text: "Нажмите на джойстик, чтобы выбрать режим игры: Спринт, Выживание или Аудирование.",
    target: "[data-modal-target='quiz-modal']"
  },
  {
    emoji: "🧠",
    title: "Интервальные повторения",
    text: "Нажмите на кнопку повторения. Система SRS сама напомнит о словах, которые нужно освежить.",
    target: "[data-action='open-review']"
  },
  {
    emoji: "🚀",
    title: "Вперед к знаниям!",
    text: "Вы готовы! Начните с изучения слов на главном экране или пройдите свой первый тест. Удачи! 화이팅!",
    target: ""
  },
];

export function checkAndShowOnboarding() {
  if (!localStorage.getItem("onboarding_completed_v1")) {
    setTimeout(() => renderOnboarding(), 1000);
  }
}

function renderOnboarding() {
  // Удаляем старый оверлей, если он есть, чтобы избежать конфликтов состояний
  const existing = document.getElementById("onboarding-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
    overlay.id = "onboarding-overlay";
    overlay.className = "onboarding-overlay";
    overlay.innerHTML = `
            <div id="onboarding-hand" class="onboarding-hand">👇</div>
            <button class="onboarding-close-btn" title="Пропустить обучение">✕</button>
            <svg class="onboarding-svg" width="100%" height="100%">
              <defs>
                <mask id="spotlight-mask">
                  <rect class="mask-bg" x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect id="spotlight-hole" x="0" y="0" width="0" height="0" rx="0" fill="black" />
                </mask>
              </defs>
              <!-- Visual Layer: Blur + Darkness (no pointer events) -->
              <foreignObject x="0" y="0" width="100%" height="100%" mask="url(#spotlight-mask)" style="pointer-events: none;">
                <div xmlns="http://www.w3.org/1999/xhtml" class="onboarding-backdrop"></div>
              </foreignObject>
              <!-- Interaction Layer: A path with a real hole that catches background clicks -->
              <path id="onboarding-click-path" class="onboarding-click-blocker-path" fill-rule="evenodd"></path>
              <!-- Border Layer: Pulsating border around the target -->
              <rect id="spotlight-border" x="0" y="0" width="0" height="0" rx="0" />
            </svg>
            <div class="onboarding-card">
                <div class="onboarding-progress"><div id="ob-progress-bar" class="onboarding-progress-bar"></div></div>
                <div id="ob-content"></div>
                <div class="onboarding-actions">
                    <button class="btn" id="ob-back-btn" style="flex:1;">Назад</button>
                    <button class="btn btn-quiz" id="ob-next-btn" style="flex:2;">Далее</button>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    // --- Event Listeners ---
    overlay.querySelector('.onboarding-close-btn')?.addEventListener('click', finishOnboarding);
    
    // Закрытие по клику на фон (click-blocker)
    const clickPath = overlay.querySelector('#onboarding-click-path');
    if (clickPath) clickPath.addEventListener('click', finishOnboarding);
    
    // Предотвращаем закрытие при клике на саму карточку
    overlay.querySelector('.onboarding-card')?.addEventListener('click', e => e.stopPropagation());

    overlay.querySelector('#ob-back-btn')?.addEventListener('click', prevOnboardingStep);
    overlay.querySelector('#ob-next-btn')?.addEventListener('click', nextOnboardingStep);

  currentStep = 0;
  updateOnboardingStep();

  overlay.style.display = "flex"; // <--- Принудительно показываем
  
  // Используем RAF для гарантии применения display:flex перед добавлением класса active
  requestAnimationFrame(() => {
    overlay.classList.add("active");
  });
}

function prevOnboardingStep() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (currentStep > 0) {
    currentStep--;
    updateOnboardingStep();
  }
}

function nextOnboardingStep() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (currentStep < onboardingSteps.length - 1) {
    currentStep++;
    updateOnboardingStep();
  } else {
    finishOnboarding();
  }
}

function updateOnboardingStep() {
  // Сбрасываем таймер и прячем руку при смене шага
  if (inactivityTimer) clearTimeout(inactivityTimer);
  const hand = document.getElementById("onboarding-hand");
  if (hand) hand.classList.remove("visible");

  // Очистка предыдущей подсветки и слушателей
  if (activeElement && clickHandler) {
    activeElement.removeEventListener("click", clickHandler, true);
    activeElement = null;
    clickHandler = null;
  }
  document.querySelectorAll(".onboarding-target").forEach(el => {
    el.classList.remove("onboarding-target");
  });

  const step = onboardingSteps[currentStep];
  const content = document.getElementById("ob-content");
  const progressBar = document.getElementById("ob-progress-bar");
  const btn = document.getElementById("ob-next-btn");
  const backBtn = document.getElementById("ob-back-btn") as HTMLButtonElement;
  const overlay = document.getElementById("onboarding-overlay") as HTMLElement;
  const card = overlay.querySelector(".onboarding-card") as HTMLElement;
  const hole = document.getElementById("spotlight-hole");
  const border = document.getElementById("spotlight-border");
  const clickPath = document.getElementById("onboarding-click-path");

  let targetEl: HTMLElement | null = null;
  if (step.target) {
    targetEl = document.querySelector<HTMLElement>(step.target);
    // Проверяем, видим ли элемент на экране. Если нет, сбрасываем его.
    if (targetEl && !isElementVisible(targetEl)) {
      console.warn(`Onboarding target "${step.target}" found but not visible. Skipping spotlight.`);
      targetEl = null;
    }
  }

  // Подсветка нового элемента
  if (targetEl && card && hole && border && clickPath) {
      // Сбрасываем центрирование (transform), так как будем позиционировать вручную
      card.style.transform = "none";

      targetEl.classList.add("onboarding-target");
      // FIX: Используем 'auto' для мгновенной прокрутки, чтобы координаты rect были точными сразу
      targetEl.scrollIntoView({ behavior: "auto", block: "center" });
      
      activeElement = targetEl;
      clickHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        nextOnboardingStep();
      };
      targetEl.addEventListener("click", clickHandler, true);

      // Spotlight effect via SVG
      const rect = targetEl.getBoundingClientRect();
      const padding = 6;
      const holeX = rect.left - padding;
      const holeY = rect.top - padding;
      const holeW = rect.width + padding * 2;
      const holeH = rect.height + padding * 2;
      
      hole.setAttribute("x", String(rect.left - padding));
      hole.setAttribute("y", String(rect.top - padding));
      hole.setAttribute("width", String(rect.width + padding * 2));
      hole.setAttribute("height", String(rect.height + padding * 2));
      
      const borderRadius = parseFloat(getComputedStyle(targetEl).borderRadius) || 8;
      hole.setAttribute("rx", String(borderRadius));

      // Update the click blocker path
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const outerPath = `M0,0 H${vw} V${vh} H0 Z`;
      const innerPath = `M${holeX + holeW},${holeY} H${holeX} V${holeY + holeH} H${holeX + holeW} Z`;
      clickPath.setAttribute('d', `${outerPath} ${innerPath}`);

      border.setAttribute("x", String(holeX));
      border.setAttribute("y", String(holeY));
      border.setAttribute("width", String(holeW));
      border.setAttribute("height", String(holeH));
      border.setAttribute("rx", String(borderRadius));

      // Position card
      if (rect.top > window.innerHeight / 2) {
        card.style.bottom = `${window.innerHeight - rect.top + 20}px`;
        card.style.top = 'auto';
      } else {
        card.style.top = `${rect.bottom + 20}px`;
        card.style.bottom = 'auto';
      }

      // Скрываем кнопку "Далее", чтобы заставить пользователя нажать на элемент
      if (btn) btn.style.display = "none";

      // Запускаем таймер для показа руки, если пользователь бездействует
      inactivityTimer = window.setTimeout(() => {
        if (hand) {
          const rect = targetEl.getBoundingClientRect();
          // Позиционируем руку, чтобы она указывала на центр элемента
          hand.style.left = `${rect.left + rect.width / 2}px`;
          hand.style.top = `${rect.top + rect.height / 2}px`;
          hand.classList.add("visible");
        }
      }, 4000); // Показать через 4 секунды
    } else if (card && hole && border && clickPath) {
    // Центрируем карточку для шагов без цели (например, приветствие)
    if (hole) {
      // Скрываем дырку (делаем нулевой размер)
      hole.setAttribute("width", "0");
      hole.setAttribute("height", "0");
      // Центрируем точку старта анимации, чтобы дырка "раскрывалась" из центра экрана
      hole.setAttribute("rx", "0"); // Сбрасываем радиус скругления
      hole.setAttribute("x", String(window.innerWidth / 2));
      hole.setAttribute("y", String(window.innerHeight / 2));
    }
    // No target, so the click blocker is a solid rectangle
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    clickPath.setAttribute('d', `M0,0 H${vw} V${vh} H0 Z`);

    border.setAttribute("width", "0");
    border.setAttribute("height", "0");
    border.setAttribute("x", String(window.innerWidth / 2));
    border.setAttribute("y", String(window.innerHeight / 2));

    if (card) {
      card.style.top = "50%";
      card.style.left = "50%";
      card.style.transform = "translate(-50%, -50%)";
      card.style.bottom = "auto";
    }

    // Показываем кнопку "Далее" для информационных шагов
    if (btn) btn.style.display = "";
  }

  if (content)
    content.innerHTML = `<span class="onboarding-image">${step.emoji}</span><div class="onboarding-title">${step.title}</div><div class="onboarding-text">${step.text}</div>`;
  
  if (progressBar) {
    const progressPercent = ((currentStep + 1) / onboardingSteps.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }

  if (btn)
    btn.textContent =
      currentStep === onboardingSteps.length - 1 ? "Начать" : "Далее";
  
  if (backBtn) {
    // Прячем кнопку "Назад" на первом шаге
    backBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  }
}

function finishOnboarding() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  const overlay = document.getElementById("onboarding-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    if (activeElement && clickHandler) {
      activeElement.removeEventListener("click", clickHandler, true);
      activeElement = null;
      clickHandler = null;
    }
    // Очистка подсветки при закрытии
    document.querySelectorAll(".onboarding-target").forEach(el => {
      el.classList.remove("onboarding-target");
    });
    setTimeout(() => overlay.remove(), 300);
  }
  if (overlay) overlay.style.display = "none"; // <--- Скрываем сразу
  localStorage.setItem("onboarding_completed_v1", "true");
  showToast("Удачи в обучении! 🍀");
}

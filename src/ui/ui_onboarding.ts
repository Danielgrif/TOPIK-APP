import { showToast } from "../utils/utils.ts";
import { LS_KEYS } from "../core/constants.ts";

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
    target: "",
  },
  {
    emoji: "👤",
    title: "Ваш Профиль",
    text: "Нажмите на профиль, чтобы настроить приложение: ночная тема, голос озвучки и синхронизация.",
    target: "#profile-button",
  },
  {
    emoji: "🔥",
    title: "Ежедневный вызов",
    text: "Ключ к успеху — регулярность. Нажмите на огонек, чтобы увидеть свой прогресс и награды.",
    target: ".fire-btn",
  },
  {
    emoji: "🔍",
    title: "Умные фильтры",
    text: "Нажмите на иконку фильтров, чтобы выбрать тему (например, 'Политика') или уровень TOPIK.",
    target: "button.tool-btn[data-action='toggle-filter-panel']",
  },
  {
    emoji: "",
    title: "Тренировка",
    text: "Нажмите на мишень, чтобы выбрать режим игры: Спринт, Выживание или Аудирование.",
    target: "[data-modal-target='quiz-modal']",
  },
  {
    emoji: "🧠",
    title: "Интервальные повторения",
    text: "Нажмите на кнопку повторения. Система SRS сама напомнит о словах, которые нужно освежить.",
    target: "[data-action='open-review']",
  },
  {
    emoji: "🚀",
    title: "Вперед к знаниям!",
    text: "Вы готовы! Начните с изучения слов на главном экране или пройдите свой первый тест. Удачи! 화이팅!",
    target: "",
  },
];

export function checkAndShowOnboarding() {
  // Временно отключено по запросу
  // if (!localStorage.getItem(LS_KEYS.ONBOARDING)) {
  //   setTimeout(() => renderOnboarding(), 1000);
  // }
}



function nextOnboardingStep() {
  console.log("🎓 [DEBUG] nextOnboardingStep");
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (currentStep < onboardingSteps.length - 1) {
    currentStep++;
    updateOnboardingStep();
  } else {
    finishOnboarding();
  }
}

function updateOnboardingStep() {
  console.log(`🎓 [DEBUG] updateOnboardingStep: ${currentStep}`);
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
  document.querySelectorAll(".onboarding-target").forEach((el) => {
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
    console.log(`🎓 [DEBUG] Target element for step ${currentStep}:`, targetEl);
    // Проверяем, видим ли элемент на экране. Если нет, сбрасываем его.
    if (targetEl && !isElementVisible(targetEl)) {
      console.warn(
        `Onboarding target "${step.target}" found but not visible. Skipping spotlight.`,
      );
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
    clickHandler = (_e: Event) => {
      // FIX: Разрешаем клику пройти, чтобы кнопка сработала!
      // Обучение просто перейдет к следующему шагу параллельно.
      console.log("🎓 [DEBUG] Click on onboarding target detected");
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

    const borderRadius =
      parseFloat(getComputedStyle(targetEl).borderRadius) || 8;
    hole.setAttribute("rx", String(borderRadius));

    // Update the click blocker path
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const outerPath = `M0,0 H${vw} V${vh} H0 Z`;
    const innerPath = `M${holeX + holeW},${holeY} H${holeX} V${holeY + holeH} H${holeX + holeW} Z`;
    clickPath.setAttribute("d", `${outerPath} ${innerPath}`);

    border.setAttribute("x", String(holeX));
    border.setAttribute("y", String(holeY));
    border.setAttribute("width", String(holeW));
    border.setAttribute("height", String(holeH));
    border.setAttribute("rx", String(borderRadius));

    // Position card
    if (rect.top > window.innerHeight / 2) {
      card.style.bottom = `${window.innerHeight - rect.top + 20}px`;
      card.style.top = "auto";
    } else {
      card.style.top = `${rect.bottom + 20}px`;
      card.style.bottom = "auto";
    }

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
    clickPath.setAttribute("d", `M0,0 H${vw} V${vh} H0 Z`);

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
    // if (btn) btn.style.display = ""; // Removed conditional, always show
  }

  if (content)
    content.innerHTML = `<span class="onboarding-image">${step.emoji}</span><div class="onboarding-title">${step.title}</div><div class="onboarding-text">${step.text}</div>`;

  if (progressBar) {
    const progressPercent = ((currentStep + 1) / onboardingSteps.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }

  // FIX: Всегда показываем кнопку, чтобы пользователь не застрял
  if (btn) btn.style.display = "";

  if (btn)
    btn.textContent =
      currentStep === onboardingSteps.length - 1 ? "Начать" : "Далее";

  if (backBtn) {
    // Прячем кнопку "Назад" на первом шаге
    backBtn.style.visibility = currentStep === 0 ? "hidden" : "visible";
  }
}

function finishOnboarding() {
  console.log("🎓 [DEBUG] finishOnboarding");
  if (inactivityTimer) clearTimeout(inactivityTimer);
  const overlay = document.getElementById("onboarding-overlay");
  if (overlay) {
    // FIX: Immediately disable pointer events to prevent blocking clicks during fade-out
    overlay.style.pointerEvents = "none";
    const children = overlay.querySelectorAll("*");
    children.forEach((el) => ((el as HTMLElement).style.pointerEvents = "none"));

    overlay.classList.remove("active");
    if (activeElement && clickHandler) {
      activeElement.removeEventListener("click", clickHandler, true);
      activeElement = null;
      clickHandler = null;
    }
    // Очистка подсветки при закрытии
    document.querySelectorAll(".onboarding-target").forEach((el) => {
      el.classList.remove("onboarding-target");
    });
    setTimeout(() => overlay.remove(), 300);
  }
  if (overlay) overlay.style.display = "none";
  localStorage.setItem(LS_KEYS.ONBOARDING, "true");
  showToast("Удачи в обучении! 🍀");
}

import { showToast } from "../utils/utils.ts";
import { ConfirmOptions } from "../types/index.ts";
// quiz.ts уже статически импортируется приложением; обращение к quitQuiz
// происходит только внутри setTimeout, поэтому цикл безопасен.
import { quitQuiz } from "./quiz.ts";

// Хранит элемент, который был в фокусе до открытия модального окна
let lastFocusedElement: HTMLElement | null = null;

let isPopState = false;

window.addEventListener("popstate", (e) => {
  isPopState = true;
  const currentModalId = e.state?.modalId;

  const activeModals = document.querySelectorAll(".modal.active");
  activeModals.forEach((modal) => {
    if (modal.id !== currentModalId) {
      closeModal(modal.id);
    }
  });

  if (currentModalId) {
    const modal = document.getElementById(currentModalId);
    if (modal && !modal.classList.contains("active")) {
      openModal(currentModalId, { skipPushState: true });
    }
  }
  isPopState = false;
});

// CSS-селектор для всех интерактивных элементов
const focusableSelector = [
  "a[href]:not([disabled])",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Обрабатывает нажатие Tab для удержания фокуса внутри модального окна.
 * @param e Событие клавиатуры.
 */
function handleFocusTrap(e: KeyboardEvent) {
  if (e.key !== "Tab") return;

  const activeModal = document.querySelector(".modal.active");
  if (!activeModal) return;

  const focusableElements = Array.from(
    activeModal.querySelectorAll<HTMLElement>(focusableSelector),
  );

  // Если нет интерактивных элементов, просто блокируем Tab
  if (focusableElements.length === 0) {
    e.preventDefault();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (e.shiftKey) {
    // Нажатие Shift + Tab
    if (document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus(); // Перемещаем фокус на последний элемент
    }
  } else {
    // Нажатие Tab
    if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus(); // Перемещаем фокус на первый элемент
    }
  }
}

export function openModal(modalId: string, options?: { skipPushState?: boolean }) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn(`Modal with id "${modalId}" not found.`);
    return;
  }

  if (!options?.skipPushState) {
    window.history.pushState({ modalId }, "");
  }

  // Сохраняем элемент, который был в фокусе
  lastFocusedElement = document.activeElement as HTMLElement;

  modal.classList.add("active");

  // Включаем ловушку фокуса
  document.addEventListener("keydown", handleFocusTrap);

  // Устанавливаем фокус на первый интерактивный элемент в окне
  const firstFocusable = modal.querySelector<HTMLElement>(focusableSelector);
  if (firstFocusable) {
    firstFocusable.focus();
  } else {
    // Если интерактивных элементов нет, фокусируемся на самом окне
    const modalContent = modal.querySelector<HTMLElement>(".modal-content");
    if (modalContent) {
      modalContent.setAttribute("tabindex", "-1");
      modalContent.focus();
    }
  }
}

export function closeModal(modalId: string) {
  setTimeout(() => {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // --- MEMORY LEAK FIX ---
    // Если закрывается модальное окно квиза во время активной игры,
    // принудительно завершаем квиз, чтобы остановить таймеры (setInterval).
    // Проверяем по видимому игровому элементу, а не по state, чтобы избежать циклических зависимостей.
    if (modalId === "quiz-modal") {
      const quizGameEl = document.getElementById("quiz-game");
      // `display: flex` устанавливается при старте игры
      if (quizGameEl && quizGameEl.style.display === "flex") {
        quitQuiz(true); // true, чтобы пропустить диалог подтверждения
      }
    }

    modal.classList.remove("active");

    if (!isPopState && window.history.state?.modalId === modalId) {
      window.history.back();
    }

    // Отключаем ловушку фокуса
    document.removeEventListener("keydown", handleFocusTrap);

    // Возвращаем фокус на предыдущий элемент
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }, 0);
}

// --- Логика для окна подтверждения ---
let confirmOnValidate: ((value: string) => boolean | Promise<boolean>) | null = null;

export function openConfirm(message: string, onConfirm: () => void, options: ConfirmOptions = {}) {
  const modal = document.getElementById("confirm-modal");
  const msgEl = document.getElementById("confirm-message");
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");
  const inputContainer = document.getElementById("confirm-input-container");
  const inputEl = document.getElementById("confirm-password") as HTMLInputElement;
  const copyBtn = document.getElementById("confirm-copy-btn");

  if (!modal || !msgEl || !yesBtn || !noBtn || !inputContainer || !inputEl || !copyBtn) return;

  // message может содержать строки ошибок с сервера — собираем DOM через textContent.
  msgEl.replaceChildren();
  message.split("\n").forEach((line, index) => {
    if (index > 0) msgEl.appendChild(document.createElement("br"));
    msgEl.appendChild(document.createTextNode(line));
  });
  yesBtn.textContent = options.confirmText || "Подтвердить";
  noBtn.textContent = options.cancelText || "Отмена";

  noBtn.style.display = options.showCancel === false ? "none" : "";

  inputContainer.style.display = options.showInput ? "block" : "none";
  if (options.showInput) {
    inputEl.value = "";
    inputEl.placeholder = options.inputPlaceholder || "Введите для подтверждения";
  }
  confirmOnValidate = options.onValidate || null;

  copyBtn.style.display = options.showCopy && options.copyText ? "block" : "none";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(options.copyText || "");
    showToast("✅ Скопировано!");
  };

  const handleConfirm = async () => {
    if (options.showInput && confirmOnValidate) {
      if (!(await confirmOnValidate(inputEl.value))) {
        inputEl.classList.add("shake");
        setTimeout(() => inputEl.classList.remove("shake"), 500);
        return;
      }
    }
    onConfirm();
    closeConfirm();
  };

  yesBtn.onclick = handleConfirm;
  noBtn.onclick = () => {
    if (options.onCancel) options.onCancel();
    closeConfirm();
  };
  inputEl.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  openModal("confirm-modal", { skipPushState: true });
  if (options.showInput) {
    inputEl.focus();
  } else if (options.showCancel !== false) {
    noBtn.focus();
  } else {
    yesBtn.focus();
  }
}

export function closeConfirm() {
  confirmOnValidate = null;
  closeModal("confirm-modal");
}

// Listen for custom events to allow decoupling
document.addEventListener("open-modal", (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (detail && detail.id) openModal(detail.id);
});

document.addEventListener("close-modal", (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (detail && detail.id) closeModal(detail.id);
});

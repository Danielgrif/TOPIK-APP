import { showToast } from "../utils/utils.ts";

// Хранит элемент, который был в фокусе до открытия модального окна
let lastFocusedElement: HTMLElement | null = null;

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

export function openModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn(`Modal with id "${modalId}" not found.`);
    return;
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
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove("active");

  // Отключаем ловушку фокуса
  document.removeEventListener("keydown", handleFocusTrap);

  // Возвращаем фокус на предыдущий элемент
  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

// --- Логика для окна подтверждения ---
let confirmOnValidate: ((value: string) => boolean | Promise<boolean>) | null =
  null;

export function openConfirm(
  message: string,
  onConfirm: () => void,
  options: {
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    showInput?: boolean;
    inputPlaceholder?: string;
    onValidate?: (value: string) => boolean | Promise<boolean>;
    showCopy?: boolean;
    copyText?: string;
    showCancel?: boolean;
  } = {},
) {
  const modal = document.getElementById("confirm-modal");
  const msgEl = document.getElementById("confirm-message");
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");
  const inputContainer = document.getElementById("confirm-input-container");
  const inputEl = document.getElementById(
    "confirm-password",
  ) as HTMLInputElement;
  const copyBtn = document.getElementById("confirm-copy-btn");

  if (
    !modal ||
    !msgEl ||
    !yesBtn ||
    !noBtn ||
    !inputContainer ||
    !inputEl ||
    !copyBtn
  )
    return;

  msgEl.innerHTML = message.replace(/\n/g, "<br>");
  yesBtn.textContent = options.confirmText || "Подтвердить";
  noBtn.textContent = options.cancelText || "Отмена";

  noBtn.style.display = options.showCancel === false ? "none" : "";

  inputContainer.style.display = options.showInput ? "block" : "none";
  if (options.showInput) {
    inputEl.value = "";
    inputEl.placeholder =
      options.inputPlaceholder || "Введите для подтверждения";
  }
  confirmOnValidate = options.onValidate || null;

  copyBtn.style.display =
    options.showCopy && options.copyText ? "block" : "none";
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

  openModal("confirm-modal");
  if (options.showInput) {
    inputEl.focus();
  } else if (options.showCancel !== false) {
    noBtn.focus();
  } else {
    yesBtn.focus();
  }
}

export function closeConfirm() {
  closeModal("confirm-modal");
}

declare global {
  interface Window {
    openModal: typeof openModal;
    closeModal: typeof closeModal;
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

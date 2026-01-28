import { state } from "../core/state.ts";
import { updateVoiceUI } from "./ui_settings.ts";
import { showToast } from "../utils/utils.ts";
import {
  updateStats,
  renderTopicMastery,
  renderDetailedStats,
  renderActivityChart,
  renderLearnedChart,
  renderForgettingCurve,
  renderSRSDistributionChart,
  renderAchievements,
  updateSRSBadge,
} from "../core/stats.ts";
import { buildQuizModes, updateQuizCount, quitQuiz } from "./quiz.ts";

const focusStack: HTMLElement[] = [];
let _confirmHandler: EventListener | null = null;
let _cancelCallback: (() => void) | null = null;

function updateBottomNav(modalId: string | null) {
  const nav = document.getElementById("bottom-nav");
  if (!nav) return;
  
  const btns = nav.querySelectorAll(".nav-btn");
  btns.forEach(b => b.classList.remove("active"));

  if (!modalId) {
    const home = nav.querySelector(".nav-btn:first-child");
    if (home) home.classList.add("active");
    return;
  }

  let targetBtn = nav.querySelector(`[data-modal-target="${modalId}"]`);
  if (!targetBtn && modalId === "review-modal") {
    targetBtn = nav.querySelector(`[data-action="open-review"]`);
  }
  if (targetBtn) targetBtn.classList.add("active");
}

export function openModal(modalId: string) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;

  // Init speed slider if settings modal
  if (modalId === "profile-modal") {
    const slider = document.getElementById("speed-slider") as HTMLInputElement;
    if (slider) {
      slider.value = String(state.audioSpeed || 0.9);
      const speedVal = document.getElementById("speed-val");
      if (speedVal) speedVal.textContent = slider.value + "x";
    }
    const hanjaCheck = document.getElementById(
      "hanja-setting-check",
    ) as HTMLInputElement;
    if (hanjaCheck) hanjaCheck.checked = state.hanjaMode;
    const darkModeCheck = document.getElementById(
      "dark-mode-toggle-switch",
    ) as HTMLInputElement;
    if (darkModeCheck) darkModeCheck.checked = state.darkMode;
    const autoThemeCheck = document.getElementById(
      "auto-theme-toggle-switch",
    ) as HTMLInputElement;
    if (autoThemeCheck) autoThemeCheck.checked = state.autoTheme;
    const autoUpdateCheck = document.getElementById(
      "auto-update-check",
    ) as HTMLInputElement;
    if (autoUpdateCheck) autoUpdateCheck.checked = state.autoUpdate;

    const musicCheck = document.getElementById(
      "background-music-check",
    ) as HTMLInputElement;
    if (musicCheck) musicCheck.checked = state.backgroundMusicEnabled;
    const musicVolumeSlider = document.getElementById(
      "background-music-volume-slider",
    ) as HTMLInputElement;
    if (musicVolumeSlider)
      musicVolumeSlider.value = String(state.backgroundMusicVolume);

    const volText = document.getElementById("background-music-volume-val");
    if (volText)
      volText.textContent = `${Math.round(state.backgroundMusicVolume * 100)}%`;

    updateVoiceUI();
  }

  if (document.activeElement instanceof HTMLElement) {
    focusStack.push(document.activeElement);
  }

  if (modalId === "stats-modal") {
    const picker = document.getElementById("stats-theme-picker");
    if (picker) {
      const btns = picker.querySelectorAll(".stats-color-btn");
      btns.forEach((b) => b.classList.remove("active"));
      const activeBtn =
        picker.querySelector(`[data-value="${state.themeColor}"]`) || btns[0];
      if (activeBtn) activeBtn.classList.add("active");
    }
    updateStats();
    renderTopicMastery();
    renderDetailedStats();
    renderActivityChart();
    renderLearnedChart();
    renderForgettingCurve();
    renderSRSDistributionChart();
  }

  // Auto-focus on new list input
  if (modalId === "collections-modal") {
    const titleInput = document.getElementById('new-list-title') as HTMLInputElement;
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100); // Timeout to ensure element is visible
    }
  }
  if (modalId === "achievements-modal") {
    renderAchievements();
  }
  if (modalId === "quotes-modal") {
    import("./ui_quotes.ts").then((m) => m.renderFavoriteQuotes());
  }
  if (modalId === "shop-modal") {
    import("./ui_shop.ts").then((m) => m.renderShop());
  }
  if (modalId === "quiz-modal") {
    buildQuizModes();
    updateQuizCount();
  }
  modalEl.classList.add("active");
  updateBottomNav(modalId);

  // Accessibility: Перемещаем фокус внутрь модального окна
  setTimeout(() => {
    const focusable = modalEl.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) as HTMLElement;
    if (focusable) {
      focusable.focus();
    } else {
      modalEl.setAttribute("tabindex", "-1");
      modalEl.focus();
    }
  }, 50);
}

export function closeModal(modalId: string) {
  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    modalEl.classList.remove("active");
    if (modalId === "review-modal" || modalId === "quiz-modal") {
      updateSRSBadge();
    }
    if (modalId === "quiz-modal") quitQuiz();
    if (modalId === "stats-modal") {
      if (_confirmHandler) {
        try {
          const yesBtn = document.getElementById("confirm-yes");
          if (yesBtn) yesBtn.removeEventListener("click", _confirmHandler);
        } catch {
          // Ignore
        }
        _confirmHandler = null;
      }
      renderDetailedStats();
    }
  }
  
  const activeModal = document.querySelector(".modal.active");
  updateBottomNav(activeModal ? activeModal.id : null);

  const prevFocus = focusStack.pop();
  if (prevFocus && document.body.contains(prevFocus)) {
    try {
      prevFocus.focus();
    } catch {
      // Ignore
    }
  }
}

interface ConfirmOptions {
  showInput?: boolean;
  inputPlaceholder?: string;
  onValidate?: (val: string) => Promise<boolean>;
  onCancel?: () => void;
  showCopy?: boolean;
  copyText?: string;
}

export function openConfirm(
  message: string,
  onYes: () => void,
  options: ConfirmOptions = {},
) {
  const modal = document.getElementById("confirm-modal");
  if (!modal) {
    if (typeof onYes === "function") onYes();
    return;
  }

  if (document.activeElement instanceof HTMLElement) {
    focusStack.push(document.activeElement);
  }

  const msgEl = document.getElementById("confirm-message");
  const yesBtn = document.getElementById("confirm-yes");
  const inputContainer = document.getElementById("confirm-input-container");
  const input = document.getElementById("confirm-password") as HTMLInputElement;
  const copyBtn = document.getElementById("confirm-copy-btn");

  if (msgEl) {
      msgEl.textContent = message || "Вы уверены?";
      // Разрешаем переносы строк для списков
      msgEl.style.whiteSpace = "pre-wrap";
  }

  if (inputContainer && input) {
    if (options.showInput) {
      inputContainer.style.display = "block";
      input.value = "";
      input.placeholder = options.inputPlaceholder || "";
      input.onkeydown = (e) => {
        if (e.key === "Enter" && yesBtn) yesBtn.click();
      };
      setTimeout(() => input.focus(), 100);
    } else {
      inputContainer.style.display = "none";
      input.onkeydown = null;
      if (yesBtn) {
        setTimeout(() => yesBtn.focus(), 50);
      }
    }
  }

  if (copyBtn) {
    if (options.showCopy) {
      copyBtn.style.display = "inline-block";
      copyBtn.onclick = () => {
        const text = options.copyText || message;
        navigator.clipboard.writeText(text).then(() => {
          showToast("Скопировано в буфер!");
        });
      };
    } else {
      copyBtn.style.display = "none";
    }
  }

  _cancelCallback = options.onCancel || null;

  if (yesBtn) {
    if (_confirmHandler) {
      yesBtn.removeEventListener("click", _confirmHandler);
      _confirmHandler = null;
    }
    _confirmHandler = async () => {
      _cancelCallback = null; // Если нажали "Да", отмену не вызываем
      if (options.showInput && options.onValidate) {
        const val = input ? input.value : "";
        const isValid = await options.onValidate(val);
        if (!isValid) {
          if (input) {
            input.classList.add("shake");
            setTimeout(() => input.classList.remove("shake"), 500);
          }
          return;
        }
      }
      closeConfirm();
      if (typeof onYes === "function") onYes();
    };
    yesBtn.addEventListener("click", _confirmHandler);
  }
  modal.classList.add("active");
}

export function closeConfirm() {
  const modal = document.getElementById("confirm-modal");
  if (!modal) return;
  modal.classList.remove("active");

  if (_cancelCallback) {
      _cancelCallback();
      _cancelCallback = null;
  }

  const yesBtn = document.getElementById("confirm-yes");
  if (yesBtn && _confirmHandler) {
    try {
      yesBtn.removeEventListener("click", _confirmHandler);
    } catch {
      // Ignore
    }
    _confirmHandler = null;
  }

  const prevFocus = focusStack.pop();
  if (prevFocus && document.body.contains(prevFocus)) {
    try {
      prevFocus.focus();
    } catch {
      // Ignore
    }
  }
}

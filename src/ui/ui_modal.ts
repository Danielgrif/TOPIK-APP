import { state } from "../core/state.ts";
import { updateVoiceUI } from "./ui_settings.ts";

let lastFocusedElement: HTMLElement | null = null;
let _confirmHandler: EventListener | null = null;

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

  try {
    lastFocusedElement = document.activeElement as HTMLElement;
  } catch {
    lastFocusedElement = null;
  }

  if (modalId === "stats-modal") {
    const picker = document.getElementById("stats-theme-picker");
    if (picker) {
      const btns = picker.querySelectorAll(".stats-color-btn");
      btns.forEach((b) => b.classList.remove("active"));
      const activeBtn =
        picker.querySelector(`[data-color="${state.themeColor}"]`) || btns[0];
      if (activeBtn) activeBtn.classList.add("active");
    }
    import("../core/stats.ts").then((m) => {
      m.updateStats();
      m.renderTopicMastery();
      m.renderDetailedStats();
      m.renderActivityChart();
      m.renderLearnedChart();
      m.renderForgettingCurve();
      m.renderSRSDistributionChart();
    });
  }
  if (modalId === "achievements-modal") {
    import("../core/stats.ts").then((m) => m.renderAchievements());
  }
  if (modalId === "quiz-modal") {
    import("./quiz.ts").then((m) => {
      m.buildQuizModes();
      m.updateQuizCount();
    });
  }
  modalEl.classList.add("active");
}

export function closeModal(modalId: string) {
  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    modalEl.classList.remove("active");
    if (modalId === "review-modal" || modalId === "quiz-modal") {
      import("../core/stats.ts").then((m) => m.updateSRSBadge());
    }
    if (modalId === "quiz-modal") import("./quiz.ts").then((m) => m.quitQuiz());
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
      import("../core/stats.ts").then((m) => m.renderDetailedStats());
    }
  }
  try {
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function")
      lastFocusedElement.focus();
  } catch {
    // Ignore
  }
}

interface ConfirmOptions {
  showInput?: boolean;
  inputPlaceholder?: string;
  onValidate?: (val: string) => Promise<boolean>;
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

  const msgEl = document.getElementById("confirm-message");
  const yesBtn = document.getElementById("confirm-yes");
  const inputContainer = document.getElementById("confirm-input-container");
  const input = document.getElementById("confirm-password") as HTMLInputElement;

  if (msgEl) msgEl.textContent = message || "Вы уверены?";

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
    }
  }

  if (yesBtn) {
    if (_confirmHandler) {
      yesBtn.removeEventListener("click", _confirmHandler);
      _confirmHandler = null;
    }
    _confirmHandler = async () => {
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
  const yesBtn = document.getElementById("confirm-yes");
  if (yesBtn && _confirmHandler) {
    try {
      yesBtn.removeEventListener("click", _confirmHandler);
    } catch {
      // Ignore
    }
    _confirmHandler = null;
  }
}

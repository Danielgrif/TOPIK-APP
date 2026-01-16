import { client } from "./core/supabaseClient.ts";
import { state } from "./core/state.ts";
import {
  fetchVocabulary,
  loadFromSupabase,
  immediateSaveState,
} from "./core/db.ts";
import {
  toggleSessionTimer,
  sortByWeakWords,
  shuffleWords,
  toggleViewMode,
  showError,
  saveAndRender,
} from "./ui/ui.ts"; // Ensure this file is in ui/ folder
import {
  showUpdateNotification,
  setupGestures,
  setupScrollBehavior,
  saveSearchHistory,
  showSearchHistory,
  hideSearchHistory,
  showInstallBanner,
  dismissInstallBanner,
} from "./ui/ui_interactions.ts";
import {
  toggleFilterPanel,
  populateFilters,
  handleTopicChange,
  handleCategoryChange,
  setTypeFilter,
  setStarFilter,
} from "./ui/ui_filters.ts";
import { checkAndShowOnboarding } from "./ui/ui_onboarding.ts";
import {
  render,
  renderSkeletons,
  resetSearchHandler,
  setupGridEffects,
} from "./ui/ui_card.ts";
import {
  openModal,
  closeModal,
  openConfirm,
  closeConfirm,
} from "./ui/ui_modal.ts";
import {
  toggleHanjaMode,
  toggleVoice,
  updateVoiceUI,
  toggleDarkMode,
  toggleAutoUpdate,
  applyTheme,
  toggleFocusMode,
  applyFocusMode,
  toggleBackgroundMusic,
  setBackgroundMusicVolume,
  applyBackgroundMusic,
  setAccentColor,
  setAudioSpeed,
} from "./ui/ui_settings.ts";

import {
  handleAuth,
  openProfileModal,
  handleChangePassword,
  handleLogout,
  toggleResetMode,
  togglePasswordVisibility,
  signInWithGoogle,
  updateAuthUI,
  openLoginModal,
  cleanAuthUrl,
} from "./core/auth.ts";
import { debounce, showToast, speak } from "./utils/utils.ts";
import {
  updateXPUI,
  updateStats,
  updateSRSBadge,
  renderDetailedStats,
} from "./core/stats.ts";
import {
  startDailyChallenge,
  updateDailyChallengeUI,
  checkSuperChallengeNotification,
  quitQuiz,
} from "./ui/quiz.ts";

// Используем Vite-совместимый импорт воркера
const searchWorker = new Worker(
  new URL("./workers/searchWorker.ts", import.meta.url),
  { type: "module" },
);
const APP_VERSION = "v56";
let deferredPrompt: any;

window.onerror = function (msg, url, line, col, error) {
  console.error("🚨 Global Error:", { msg, url, line, col, error });
  return false;
};
window.onunhandledrejection = function (event) {
  console.error("🚨 Unhandled Rejection:", event.reason);
};

function setupGlobalListeners() {
  document.body.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    const modalTrigger = target.closest("[data-modal-target]");
    if (modalTrigger) {
      const modalId = modalTrigger.getAttribute("data-modal-target");
      if (modalId) openModal(modalId);
      return;
    }

    const closeTrigger = target.closest("[data-close-modal]");
    if (closeTrigger) {
      const modalId = closeTrigger.getAttribute("data-close-modal");
      if (modalId) closeModal(modalId);
      return;
    }

    const actionTrigger = target.closest("[data-action]");
    if (actionTrigger) {
      const action = actionTrigger.getAttribute("data-action");
      const value = actionTrigger.getAttribute("data-value");

      switch (action) {
        case "toggle-focus":
          toggleFocusMode();
          break;
        case "reload":
          location.reload();
          break;
        case "toggle-dark-mode":
          toggleDarkMode();
          break;
        case "toggle-view":
          if (value) toggleViewMode(value);
          break;
        case "start-daily-challenge":
          startDailyChallenge();
          break;
        case "toggle-filter-panel":
          toggleFilterPanel();
          break;
        case "set-type-filter":
          if (value) setTypeFilter(value, actionTrigger as HTMLElement);
          break;
        case "set-star-filter":
          if (value) setStarFilter(value, actionTrigger as HTMLElement);
          break;
        case "sort-weak":
          sortByWeakWords();
          break;
        case "shuffle":
          shuffleWords();
          break;
        case "open-review":
          import("./ui/ui_review.ts").then((m) => m.openReviewMode());
          break;
        case "set-accent":
          if (actionTrigger.parentElement)
            actionTrigger.parentElement
              .querySelectorAll(".stats-color-btn, .color-option")
              .forEach((b) => b.classList.remove("active"));
          actionTrigger.classList.add("active");
          if (value) setAccentColor(value);
          break;
        case "share-stats": {
          const activeColorBtn = document.querySelector(
            "#stats-theme-picker .active",
          );
          const color = activeColorBtn
            ? activeColorBtn.getAttribute("data-value")
            : "purple";
          import("./ui/ui_share.ts").then((m) =>
            m.shareStats(color ?? undefined),
          );
          break;
        }
        case "install-app":
          if (window.installApp) window.installApp();
          break;
        case "dismiss-banner":
          dismissInstallBanner();
          break;
        case "close-level-up":
          document
            .getElementById("level-up-overlay")
            ?.classList.remove("active");
          break;
        case "submit-word-request":
          import("./ui/ui_custom_words.ts").then((m) => m.submitWordRequest());
          break;
        case "toggle-password":
          togglePasswordVisibility();
          break;
        case "auth":
          if (value) handleAuth(value);
          break;
        case "auth-google":
          signInWithGoogle();
          break;
        case "toggle-reset-mode":
          toggleResetMode(value === "true");
          break;
        case "toggle-hanja":
          toggleHanjaMode(
            actionTrigger.querySelector("input") ||
              (actionTrigger as HTMLInputElement),
          );
          break;
        case "toggle-voice":
          toggleVoice();
          break;
        case "toggle-music":
          toggleBackgroundMusic(
            actionTrigger.querySelector("input") ||
              (actionTrigger as HTMLInputElement),
          );
          break;
        case "toggle-auto-update": {
          const el =
            actionTrigger.querySelector("input") ||
            (actionTrigger as HTMLInputElement);
          toggleAutoUpdate(el);
          if (state.autoUpdate && "serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
              if (reg && reg.waiting)
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
            });
          }
          break;
        }
        case "export-data":
          import("./ui/ui_data.ts").then((m) => m.exportProgress());
          break;
        case "clear-data":
          import("./ui/ui_data.ts").then((m) => m.clearData());
          break;
        case "logout":
          handleLogout();
          break;
        case "change-password":
          handleChangePassword();
          break;
        case "close-confirm":
          closeConfirm();
          break;
        case "quit-quiz":
          quitQuiz();
          break;
      }
    }
  });

  document.body.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const action = target.getAttribute("data-action");

    if (action === "set-speed") {
      setAudioSpeed(target.value);
    } else if (action === "set-music-volume") {
      setBackgroundMusicVolume(target.value);
    }
  });

  document.body.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    const action = target.getAttribute("data-action");

    if (action === "toggle-dark-mode") toggleDarkMode();
    if (action === "toggle-hanja") toggleHanjaMode(target);
    if (action === "toggle-music") toggleBackgroundMusic(target);
    if (action === "toggle-auto-update") {
      toggleAutoUpdate(target);
      if (state.autoUpdate && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.waiting)
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
        });
      }
    }
  });
}

async function init() {
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.remove();

  renderSkeletons();

  await fetchVocabulary();

  searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });

  searchWorker.onmessage = (e) => {
    state.searchResults = e.data;
    render();
  };

  client.auth.onAuthStateChange(
    async (event: string, session: { user: any } | null) => {
      if (session) {
        updateAuthUI(session.user);
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          cleanAuthUrl();
          await loadFromSupabase(session.user);
          saveAndRender();
          closeModal("login-modal");
        }
        if (event === "PASSWORD_RECOVERY") {
          openProfileModal();
          showToast("ℹ️ Введите новый пароль");
        }
      } else {
        updateAuthUI(null);
      }
    },
  );

  updateXPUI();
  updateStats();
  populateFilters();
  import("./core/stats.ts").then((m) => m.renderTopicMastery());
  import("./ui/quiz.ts").then((m) => m.buildQuizModes());
  updateSRSBadge();
  updateVoiceUI();
  applyTheme();
  updateDailyChallengeUI();
  checkSuperChallengeNotification();
  applyFocusMode();

  render();

  const startMusicOnInteraction = () => {
    applyBackgroundMusic(true);
  };
  window.addEventListener("click", startMusicOnInteraction, { once: true });

  checkAndShowOnboarding();
  setupGestures();
  setupScrollBehavior();
  setupGridEffects();
  setupGlobalListeners();

  const verEl = document.getElementById("app-version");
  if (verEl) verEl.textContent = `TOPIK Master ${APP_VERSION}`;

  const searchInput = document.getElementById(
    "searchInput",
  ) as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target) {
          const val = target.value.trim().toLowerCase();
          searchWorker.postMessage({ type: "SEARCH", query: val });
        }
      }, 200) as EventListener,
    );

    searchInput.addEventListener("focus", () => showSearchHistory(searchInput));
    searchInput.addEventListener("blur", () =>
      setTimeout(hideSearchHistory, 200),
    );
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = searchInput.value.trim();
        if (val) saveSearchHistory(val);
        hideSearchHistory();
      }
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        if (!navigator.serviceWorker.controller) {
          showToast("✅ Приложение готово к работе офлайн!");
        }

        const handleUpdate = (worker: ServiceWorker) => {
          if (state.autoUpdate) {
            worker.postMessage({ type: "SKIP_WAITING" });
          } else {
            showUpdateNotification(worker);
          }
        };

        if (reg.waiting) handleUpdate(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker)
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                handleUpdate(newWorker);
              }
            });
        });
      })
      .catch((err) => console.error("SW Registration Failed:", err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      window.location.reload();
      refreshing = true;
    });
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById("install-app-btn");
    if (btn) btn.style.display = "flex";

    showInstallBanner();
  });
}

window.addEventListener("beforeunload", () => {
  immediateSaveState();
});

init().catch((e) => {
  console.error("Init Error", e);
  if (e.name !== "AbortError") showError("Ошибка инициализации: " + e.message);
});

Object.assign(window, {
  openModal,
  closeModal,
  openConfirm,
  closeConfirm,
  exportProgress: () =>
    import("./ui/ui_data.ts").then((m) => m.exportProgress()),
  saveAndRender,
  importProgress: (event: Event) =>
    import("./ui/ui_data.ts").then((m) => m.importProgress(event)),
  clearData: () => import("./ui/ui_data.ts").then((m) => m.clearData()),
  toggleSessionTimer,
  sortByWeakWords,
  shuffleWords,
  setStarFilter,
  setTypeFilter,
  handleTopicChange,
  handleCategoryChange,
  toggleHanjaMode,
  toggleVoice,
  toggleFilterPanel,
  toggleDarkMode,
  toggleAutoUpdate: (el: HTMLInputElement) => {
    toggleAutoUpdate(el);
    if (state.autoUpdate && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
    }
  },
  toggleFocusMode,
  toggleViewMode,
  toggleBackgroundMusic: (el: HTMLInputElement) => {
    toggleBackgroundMusic(el);
  },
  setBackgroundMusicVolume,
  handleAuth,
  openProfileModal,
  handleChangePassword,
  handleLogout,
  toggleResetMode,
  togglePasswordVisibility,
  setAudioSpeed: (val: string | number) =>
    import("./ui/ui_settings.ts").then((m) => m.setAudioSpeed(val)),
  signInWithGoogle,
  speak,
  openLoginModal,
  openReviewMode: () =>
    import("./ui/ui_review.ts").then((m) => m.openReviewMode()),
  openShopModal: () => import("./ui/ui_shop.ts").then((m) => m.openShopModal()),
  startDailyChallenge,
  quitQuiz,
  renderDetailedStats,
  checkPronunciation: (word: string, btn: HTMLElement) =>
    import("./core/speech.js").then((m) => m.checkPronunciation(word, btn)),
  resetSearchHandler,
  runTests: () => import("./tests.ts").then((m) => m.runTests()),
  forceUpdateSW: async () => {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
      window.location.reload();
    }
  },
  installApp: async () => {
    dismissInstallBanner();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      const btn = document.getElementById("install-app-btn");
      if (btn) btn.style.display = "none";
    }
  },
  dismissInstallBanner,
});

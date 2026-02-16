/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
console.log("🚀 App starting...");

import "./css/style.css";
import { client } from "./core/supabaseClient.ts";
import { state } from "./core/state.ts";
import { injectComponents } from "./ui/component_loader.ts";
import {
  fetchVocabulary,
  loadFromSupabase,
  immediateSaveState,
  fetchRandomQuote,
} from "./core/db.ts";
import {
  toggleSessionTimer,
  sortByWeakWords,
  sortByTopic,
  shuffleWords,
  toggleViewMode,
  showError,
  saveAndRender,
} from "./ui/ui.ts";
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
  setupFilterBehavior,
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
  restoreScroll,
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
  toggleAutoTheme,
  checkAutoTheme,
  toggleAutoUpdate,
  applyTheme,
  toggleFocusMode,
  toggleBackgroundMusic,
  setBackgroundMusicVolume,
  applyBackgroundMusic,
  setAccentColor,
  previewAccentColor,
  setAudioSpeed,
  setTtsVolume,
  resetAllSettings,
  applyAccentColor,
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
import {
  debounce,
  showToast,
  speak,
  typeText,
  cancelSpeech,
  promiseWithTimeout,
} from "./utils/utils.ts";
import {
  updateXPUI,
  updateStats,
  updateSRSBadge,
  renderDetailedStats,
  renderTopicMastery,
} from "./core/stats.ts";
import {
  startDailyChallenge,
  updateDailyChallengeUI,
  checkSuperChallengeNotification,
  quitQuiz,
  buildQuizModes,
} from "./ui/quiz.ts";
import { canClaimDailyReward, claimDailyReward } from "./ui/ui_shop.ts";
import { setupTrash } from "./ui/ui_trash.ts";
import { checkPronunciation } from "./core/speech.ts";
import { SW_MESSAGES } from "./core/constants.ts";
import { Quote, User } from "./types/index.ts";
import type { Session } from "@supabase/supabase-js";

let currentQuote: Quote | null = null;
let welcomeAudioTimeout: number | null = null;

function performWelcomeClose() {
  cancelSpeech(); // FIX: Отменяем любые отложенные или текущие звуки
  if (welcomeAudioTimeout) {
    clearTimeout(welcomeAudioTimeout);
    welcomeAudioTimeout = null;
  }
  const wOverlay = document.getElementById("welcome-overlay");
  if (wOverlay) {
    wOverlay.style.animation =
      "flyOutUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";
    wOverlay.style.pointerEvents = "none";
    setTimeout(() => {
      wOverlay.classList.remove("active");
      wOverlay.style.animation = "";
      wOverlay.style.pointerEvents = "";
      wOverlay.style.display = "none";
      checkAndShowOnboarding();
    }, 500);
  }
}

// Используем Vite-совместимый импорт воркера
let searchWorker: Worker;
try {
  searchWorker = new Worker(
    new URL("./workers/searchWorker.ts", import.meta.url),
    { type: "module" },
  );
  console.log("✅ Worker initialized");
} catch (e) {
  console.error("❌ Worker failed to initialize:", e);
}
const APP_VERSION = "v56";
const AI_MODEL_NAME = "Gemini 2.5 Flash";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.onerror = function (msg, url, line, col, error) {
  console.error("🚨 Global Error:", { msg, url, line, col, error });
  return false;
};
window.onunhandledrejection = function (event) {
  console.error("🚨 Unhandled Rejection:", event.reason);
};

function updateBottomNav(target?: string) {
  const nav = document.getElementById("bottom-nav");
  if (!nav) return;

  let activeTarget = target;

  if (!activeTarget) {
    // Авто-определение активной вкладки по открытому модальному окну
    if (document.getElementById("quiz-modal")?.classList.contains("active"))
      activeTarget = "quiz-modal";
    else if (
      document.getElementById("stats-modal")?.classList.contains("active")
    )
      activeTarget = "stats-modal";
    else if (
      document.getElementById("collections-modal")?.classList.contains("active")
    )
      activeTarget = "open-collections-filter";
    else if (
      document.getElementById("review-modal")?.classList.contains("active")
    )
      activeTarget = "open-review";
    else activeTarget = "nav-home";
  }

  const btns = nav.querySelectorAll(".nav-btn");
  btns.forEach((b) => {
    const btn = b as HTMLElement;
    if (
      btn.getAttribute("data-action") === activeTarget ||
      btn.getAttribute("data-modal-target") === activeTarget
    ) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function setupGlobalListeners() {
  console.log("🛠️ Global listeners setup started");
  document.body.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    const modalTrigger = target.closest("[data-modal-target]");
    if (modalTrigger) {
      const modalId = modalTrigger.getAttribute("data-modal-target");
      if (modalId) {
        openModal(modalId);
        updateBottomNav(modalId);
      }
      return;
    }

    const closeTrigger = target.closest("[data-close-modal]");
    if (closeTrigger) {
      // Исправление: Если триггер закрытия — это само модальное окно (оверлей),
      // проверяем, был ли клик именно по нему, а не по контенту внутри.
      const isOverlay = closeTrigger.classList.contains("modal");
      if (!isOverlay || target === closeTrigger) {
        const modalId = closeTrigger.getAttribute("data-close-modal");
        if (modalId) {
          closeModal(modalId);
          updateBottomNav(); // Обновляем состояние при закрытии
        }
        return;
      }
      // Если клик внутри контента, игнорируем этот триггер и идем дальше проверять data-action
    }

    const actionTrigger = target.closest("[data-action]");
    if (actionTrigger) {
      // FIX: Если это чекбокс или радио-кнопка, игнорируем событие click,
      // так как оно будет обработано событием change. Это предотвращает двойное переключение.
      if (
        actionTrigger.tagName === "INPUT" &&
        ["checkbox", "radio"].includes((actionTrigger as HTMLInputElement).type)
      ) {
        return;
      }

      const action = actionTrigger.getAttribute("data-action");
      const value = actionTrigger.getAttribute("data-value");
      console.log(`⚡ Action detected: ${action}`);

      switch (action) {
        case "nav-home":
          document.querySelectorAll(".modal.active").forEach((m) => {
            closeModal(m.id);
          });
          updateBottomNav("nav-home");
          break;
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
        case "reset-filters":
          import("./ui/ui_filters.ts").then((m) => m.resetFilters());
          break;
        case "set-type-filter":
          if (value) setTypeFilter(value, actionTrigger as HTMLElement);
          break;
        case "set-star-filter":
          if (value) {
            state.currentStar = value;
            // Обновляем UI: делаем выбор взаимоисключающим
            const container = document.getElementById("level-filters");
            if (container) {
              container.querySelectorAll(".filter-chip").forEach((btn) => {
                if (btn.getAttribute("data-value") === value)
                  btn.classList.add("active");
                else btn.classList.remove("active");
              });
            }
            saveAndRender();
          }
          break;
        case "sort-topic":
          sortByTopic();
          break;
        case "sort-level":
          import("./ui/ui.ts").then((m) => m.sortByLevel());
          break;
        case "sort-weak":
          sortByWeakWords();
          break;
        case "shuffle":
          shuffleWords();
          break;
        case "open-review":
          import("./ui/ui_review.ts").then((m) => m.openReviewMode());
          updateBottomNav("open-review");
          break;
        case "open-shop":
          import("./ui/ui_shop.ts").then((m) => m.openShopModal());
          break;
        case "open-profile":
          openProfileModal();
          import("./ui/ui_settings.ts").then((m) => {
            m.updateTrashRetentionUI();
            m.updateThemePickerUI();
          });
          break;
        case "open-mistakes":
          import("./ui/ui_mistakes").then((m) => m.openMistakesModal());
          break;
        case "set-accent":
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
        case "close-welcome":
          performWelcomeClose();
          break;
        case "submit-word-request":
          import("./ui/ui_custom_words.ts")
            .then((m) => m.submitWordRequest())
            .catch((e) =>
              console.error("❌ Failed to load submitWordRequest:", e),
            );
          break;
        case "open-add-word-modal":
          import("./ui/ui_custom_words.ts").then((m) =>
            m.setupAddWordPreview(),
          );
          openModal("add-word-modal");
          if (value) {
            const select = document.getElementById(
              "new-word-target-list",
            ) as HTMLSelectElement;
            if (select) select.value = value;
          }
          break;
        case "save-quote":
          if (currentQuote) {
            const idx = state.favoriteQuotes.findIndex(
              (q) => q.id === currentQuote!.id,
            );
            if (idx >= 0) {
              state.favoriteQuotes.splice(idx, 1);
              actionTrigger.textContent = "🤍";
              actionTrigger.classList.remove("active");
              showToast("Цитата удалена из избранного");
            } else {
              state.favoriteQuotes.push(currentQuote);
              actionTrigger.textContent = "❤️";
              actionTrigger.classList.add("active");
              showToast("Цитата сохранена в избранное!");
            }
            immediateSaveState();
          }
          break;
        case "toggle-password":
          togglePasswordVisibility(actionTrigger as HTMLElement);
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
        case "toggle-voice":
          toggleVoice();
          break;
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
          // То же самое исправление для окна подтверждения
          if (
            actionTrigger.classList.contains("modal") &&
            target !== actionTrigger
          ) {
            break;
          }
          closeConfirm();
          break;
        case "quit-quiz":
          quitQuiz();
          break;
        case "reset-settings":
          resetAllSettings();
          break;
        case "reset-onboarding":
          import("./ui/ui_settings.ts").then((m) => m.resetOnboarding());
          break;
        case "create-list":
          import("./ui/ui_collections.ts").then((m) => m.createList());
          break;
        case "save-list-changes":
          import("./ui/ui_collections.ts").then((m) => m.saveListChanges());
          break;
        case "save-word-changes":
          import("./ui/ui_edit_word.ts").then((m) => m.saveWordChanges());
          break;
        case "delete-word":
          import("./ui/ui_edit_word.ts").then((m) => m.deleteWord());
          break;
        case "open-collections-filter":
          import("./ui/ui_collections.ts").then((_m) => {
            /* Logic to show filter selection modal */ openModal(
              "collections-modal",
            );
          });
          updateBottomNav("open-collections-filter");
          break;
        case "toggle-select-mode":
          import("./ui/ui_bulk.ts").then((m) => m.toggleSelectMode());
          break;
        case "bulk-delete":
          import("./ui/ui_bulk.ts").then((m) => m.bulkDelete());
          break;
        case "bulk-move":
          import("./ui/ui_bulk.ts").then((m) => m.bulkMoveToTopic());
          break;
        case "bulk-list":
          import("./ui/ui_bulk.ts").then((m) => m.bulkAddToList());
          break;
        case "bulk-select-all":
          import("./ui/ui_bulk.ts").then((m) => m.selectAll());
          break;
        case "set-trash-retention":
          if (value)
            import("./ui/ui_settings.ts").then((m) =>
              m.setTrashRetention(value),
            );
          break;
      }
    }
  });

  // Color Preview on Hover
  document.body.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest(
      '[data-action="set-accent"], [data-action="preview-theme"]',
    );
    if (trigger) {
      const val = trigger.getAttribute("data-value");
      if (val) previewAccentColor(val);
    }
  });

  document.body.addEventListener("mouseout", (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest(
      '[data-action="set-accent"], [data-action="preview-theme"]',
    );
    if (
      trigger &&
      (!e.relatedTarget || !trigger.contains(e.relatedTarget as Node))
    ) {
      applyAccentColor(); // Revert to saved color
    }
  });

  document.body.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const action = target.getAttribute("data-action");

    if (action === "set-speed") {
      setAudioSpeed(target.value);
    } else if (action === "set-music-volume") {
      setBackgroundMusicVolume(target.value);
    } else if (action === "set-tts-volume") {
      setTtsVolume(target.value);
    }
  });

  document.body.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    const action = target.getAttribute("data-action");

    if (action === "toggle-dark-mode") toggleDarkMode();
    if (action === "toggle-auto-theme") toggleAutoTheme(target);
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

  // Handle Enter key for creating a new list
  const newListInput = document.getElementById(
    "new-list-title",
  ) as HTMLInputElement;
  if (newListInput) {
    newListInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent any default action
        // Programmatically click the create button to reuse its logic
        const createBtn = document.querySelector(
          '[data-action="create-list"]',
        ) as HTMLButtonElement;
        if (createBtn && !createBtn.disabled) {
          createBtn.click();
        }
      }
    });
  }

  // Validation for Topic/Category inputs (No numbers/symbols)
  const validateTextOnly = (e: Event) => {
    const input = e.target as HTMLInputElement;
    // Allow: Letters (EN, RU, KR), Numbers, spaces, hyphens.
    input.value = input.value.replace(
      /[^a-zA-Zа-яА-Я가-힣\u3130-\u318F0-9\s-]/g,
      "",
    );
  };

  [
    "new-word-topic",
    "new-word-category",
    "edit-word-topic",
    "edit-word-category",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", validateTextOnly);
  });

  // Handle "Create new list" selection in dropdown
  const targetListSelect = document.getElementById(
    "new-word-target-list",
  ) as HTMLSelectElement;
  if (targetListSelect) {
    targetListSelect.addEventListener("change", () => {
      if (targetListSelect.value === "create-new-list") {
        targetListSelect.value = ""; // Сбрасываем выбор
        openModal("collections-modal");
      }
    });
  }

  // Закрытие модальных окон по клавише Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.active");
      if (activeModal) {
        if (activeModal.id === "confirm-modal") {
          closeConfirm();
        } else {
          closeModal(activeModal.id);
        }
      }
    }
  });
}

function setupLevelUpObserver() {
  const overlay = document.getElementById("level-up-overlay");
  if (!overlay) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        if (overlay.classList.contains("active")) {
          // 🎆 Запускаем салют из конфетти
          const duration = 3000;
          const end = Date.now() + duration;

          (function frame() {
            window.confetti({
              particleCount: 4,
              angle: 60,
              spread: 55,
              origin: {
                x: 0,
                y: 0,
              },
              colors: ["#6c5ce7", "#00b894", "#ffeaa7", "#ff7675", "#74b9ff"],
              zIndex: 10000,
            });
            window.confetti({
              particleCount: 4,
              angle: 120,
              spread: 55,
              origin: {
                x: 1,
                y: 0,
              },
              colors: ["#6c5ce7", "#00b894", "#ffeaa7", "#ff7675", "#74b9ff"],
              zIndex: 10000,
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          })();
        }
      }
    });
  });

  observer.observe(overlay, { attributes: true });
}

function showWelcomeScreen(user?: User) {
  const welcomeOverlay = document.getElementById("welcome-overlay");
  const welcomeName = document.getElementById("welcome-username");
  const welcomeQuote = document.getElementById("welcome-quote");

  if (welcomeOverlay && welcomeName) {
    let name = "Гость";
    if (user) {
      // Если передан объект пользователя, берем имя из метаданных, иначе из email
      name =
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Гость";
    }
    welcomeName.textContent = name;

    const hour = new Date().getHours();
    let greeting = "С возвращением!";
    let bgStyle = "rgba(0,0,0,0.85)";

    if (hour >= 5 && hour < 12) {
      greeting = "Доброе утро!";
      bgStyle =
        "linear-gradient(135deg, rgba(255, 180, 180, 0.95) 0%, rgba(255, 220, 240, 0.95) 100%)"; /* Softer Morning */
    } else if (hour >= 12 && hour < 18) {
      greeting = "Добрый день!";
      bgStyle =
        "linear-gradient(135deg, rgba(100, 180, 255, 0.95) 0%, rgba(100, 230, 255, 0.95) 100%)"; /* Softer Day */
    } else {
      greeting = "Добрый вечер!";
      bgStyle =
        "linear-gradient(135deg, rgba(30, 40, 60, 0.98) 0%, rgba(50, 70, 100, 0.98) 100%)"; /* Deep Evening */
    }

    const titleEl = welcomeOverlay.querySelector(".level-up-title");
    if (titleEl) titleEl.textContent = greeting;
    welcomeOverlay.style.background = bgStyle;

    welcomeOverlay.classList.add("active");
    welcomeOverlay.style.display = "flex"; // <--- Показываем при открытии
    // FIX: Мгновенное появление (без transition), чтобы гарантированно скрыть интерфейс под низом
    welcomeOverlay.style.transition = "none";
    welcomeOverlay.style.opacity = "1";

    if (welcomeQuote) {
      welcomeQuote.innerHTML =
        '<div class="skeleton-pulse" style="height: 20px; width: 60%; margin: 0 auto; border-radius: 4px;"></div>';

      fetchRandomQuote()
        .then((quote) => {
          let textToSpeak = "시작이 반이다";
          if (quote) {
            currentQuote = quote;
            const isFav = state.favoriteQuotes.some((q) => q.id === quote.id);
            const heart = isFav ? "❤️" : "🤍";
            const activeClass = isFav ? "active" : "";

            let html = `<div class="welcome-quote-card">`;
            html += `<button class="quote-fav-btn ${activeClass}" data-action="save-quote">${heart}</button>`;
            html += `<div class="welcome-kr" id="welcome-quote-kr"></div>`;
            html += `<div class="welcome-ru" id="welcome-quote-ru"></div>`;

            if (quote.literal_translation) {
              html += `<div class="welcome-literal" style="opacity:0; animation:fadeIn 0.8s ease 1.5s forwards">(Дословно: ${quote.literal_translation})</div>`;
            }

            if (quote.explanation) {
              html += `<div class="welcome-explanation" style="opacity:0; animation:fadeIn 0.8s ease 2s forwards">💡 ${quote.explanation}</div>`;
            }

            html += `</div>`;
            welcomeQuote.innerHTML = html;
            textToSpeak = quote.quote_kr;

            const krEl = document.getElementById("welcome-quote-kr");
            const ruEl = document.getElementById("welcome-quote-ru");
            if (krEl) {
              typeText(krEl, `"${quote.quote_kr}"`, 50).then(() => {
                if (ruEl) typeText(ruEl, quote.quote_ru, 30);
              });
              // FIX: Запускаем озвучку параллельно с анимацией (через 600мс),
              // чтобы попасть в "окно автовоспроизведения" браузера
              console.log("🔊 Playing welcome audio:", textToSpeak);

              if (welcomeAudioTimeout) clearTimeout(welcomeAudioTimeout);
              welcomeAudioTimeout = window.setTimeout(() => {
                const card = document.querySelector(".welcome-quote-card");
                if (card) card.classList.add("audio-playing");
                welcomeAudioTimeout = null;
              }, 600);
            }
          } else {
            welcomeQuote.innerHTML = `<div class="welcome-quote-card"><div class="welcome-kr">"시작이 반이다"</div><div class="welcome-ru">Начало — это уже половина дела.</div></div>`;
            // Для дефолтной цитаты оставляем таймер
            if (welcomeAudioTimeout) clearTimeout(welcomeAudioTimeout);
            welcomeAudioTimeout = window.setTimeout(() => {
              welcomeAudioTimeout = null;
            }, 800);
          }
        })
        .catch((e) => {
          console.warn("Failed to fetch quote:", e);
        });
    }

    if (typeof window.confetti === "function") {
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 20020,
      });
    }
  }
}

function setupNetworkListeners() {
  const indicator = document.getElementById("offline-indicator");

  const updateStatus = () => {
    if (navigator.onLine) {
      indicator?.classList.remove("visible");
    } else {
      indicator?.classList.add("visible");
    }
  };

  window.addEventListener("online", () => {
    updateStatus();
    showToast("🌐 Соединение восстановлено");
  });
  window.addEventListener("offline", () => {
    updateStatus();
    showToast("📡 Вы перешли в офлайн режим");
  });

  // Слушаем изменения качества соединения (Network Information API)
  // @ts-ignore
  if (navigator.connection) {
    // @ts-ignore
    const conn = navigator.connection;
    conn.addEventListener("change", () => {
      // Если интернет стал хорошим (3g или 4g) и не включена экономия данных
      if (!conn.saveData && ["3g", "4g"].includes(conn.effectiveType)) {
        if (navigator.serviceWorker.controller) {
          console.log("📶 Connection improved. Processing download queue...");
          navigator.serviceWorker.controller.postMessage({
            type: "PROCESS_DOWNLOAD_QUEUE",
          });
          showToast("📶 Интернет улучшился. Докачиваем файлы...");
        }
      }
    });
  }

  // Initial check
  updateStatus();
}

function setupRealtimeUpdates() {
  // Слушаем новые слова, добавленные через Worker (INSERT в таблицу vocabulary)
  client
    .channel("public:vocabulary")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "vocabulary" },
      (payload: { new: any }) => {
        const newWord = payload.new;
        // Проверяем, нет ли уже этого слова (на всякий случай)
        if (newWord && !state.dataStore.find((w) => w.id === newWord.id)) {
          console.log("🔥 Realtime: New word added", newWord.word_kr);
          state.dataStore.unshift(newWord); // Добавляем в начало списка
          showToast(`✨ Готово: ${newWord.word_kr}`); // Уведомляем пользователя

          const grid = document.getElementById("vocabulary-grid");
          const savedScroll = grid ? grid.scrollTop : 0;
          render(); // Обновляем экран
          if (grid) grid.scrollTop = savedScroll;
        }
      },
    )
    .subscribe();

  // Слушаем добавление слов в списки (таблица list_items)
  client
    .channel("public:list_items")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "list_items" },
      (payload: { new: any }) => {
        const newItem = payload.new;
        if (newItem && newItem.list_id && newItem.word_id) {
          import("./core/collections_data.ts").then(({ collectionsState }) => {
            if (!collectionsState.listItems[newItem.list_id]) {
              collectionsState.listItems[newItem.list_id] = new Set();
            }
            collectionsState.listItems[newItem.list_id].add(newItem.word_id);

            // Если мы сейчас смотрим этот список — обновляем экран
            if (collectionsState.currentCollectionFilter === newItem.list_id) {
              const grid = document.getElementById("vocabulary-grid");
              const savedScroll = grid ? grid.scrollTop : 0;
              render();
              if (grid) grid.scrollTop = savedScroll;
            }
            // Обновляем счетчики в меню коллекций
            import("./ui/ui_collections.ts").then((m) =>
              m.updateCollectionUI(),
            );
          });
        }
      },
    )
    .subscribe();
}

async function init() {
  // 🧹 Принудительная очистка Service Worker в режиме разработки, чтобы избежать проблем с кэшем.
  // Это удалит старые воркеры для этого порта (origin) при каждой перезагрузке.
  if (import.meta.env.DEV && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }

  console.log("🏁 Init sequence started");

  // 1. Вставляем HTML-компоненты (Header, Toolbar, Modals) перед инициализацией UI
  injectComponents();

  setupGlobalListeners();
  setupNetworkListeners();
  setupRealtimeUpdates(); // <--- Включаем прослушку обновлений

  renderSkeletons();

  console.log("⏳ Fetching vocabulary...");
  await fetchVocabulary();
  console.log("✅ Vocabulary fetched");

  // FIX: Фильтруем удаленные слова, чтобы они не появлялись в списке после перезагрузки
  if (state.dataStore) {
    state.dataStore = state.dataStore.filter((w: any) => !w.deleted_at);
  }

  if (!state.dataStore || state.dataStore.length === 0) {
    throw new Error("Не удалось загрузить данные. Проверьте интернет.");
  }

  if (searchWorker)
    searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });

  if (searchWorker)
    searchWorker.onmessage = (e) => {
      state.searchResults = e.data;

      // Enhanced Search: Also filter by Topic and Category locally
      const searchInput = document.getElementById(
        "searchInput",
      ) as HTMLInputElement;
      if (searchInput) {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length > 1) {
          const topicCatMatches = state.dataStore.filter(
            (w) =>
              (w.topic && w.topic.toLowerCase().includes(query)) ||
              (w.category && w.category.toLowerCase().includes(query)),
          );

          // Merge results (deduplicate by ID)
          const existingIds = new Set(
            state.searchResults?.map((r) => r.id) || [],
          );
          topicCatMatches.forEach((w) => {
            if (!existingIds.has(w.id)) {
              state.searchResults?.push(w);
              existingIds.add(w.id);
            }
          });
        }
      }

      render();
    };

  // FIX: Настраиваем слушатель только для БУДУЩИХ событий (вход/выход).
  // INITIAL_SESSION игнорируем, так как обработаем его явно ниже, чтобы не было "скачка" интерфейса.
  client.auth.onAuthStateChange(
    async (event: string, session: Session | null) => {
      if (event === "INITIAL_SESSION") return;

      try {
        if (session?.user) {
          updateAuthUI(session.user as any as User);
          if (event === "SIGNED_IN") {
            cleanAuthUrl();
            await loadFromSupabase(session.user as any as User);
            applyTheme();
            updateVoiceUI();
            saveAndRender();
            closeModal("login-modal");
            import("./ui/ui_collections.ts").then((m) => m.loadCollections());
            showWelcomeScreen(session.user as any as User);
          }
          if (event === "PASSWORD_RECOVERY") {
            openProfileModal();
            showToast("ℹ️ Введите новый пароль");
          }
        } else {
          updateAuthUI(null);
        }
      } catch (e) {
        console.error("Auth State Change Error:", e);
      }
    },
  );

  // FIX: Явно ждем проверки сессии ПЕРЕД тем, как убрать экран загрузки
  // Используем таймаут и безопасную деструктуризацию, чтобы не зависнуть на прелоадере
  const { data } = (await promiseWithTimeout(
    client.auth.getSession(),
    5000, // 5 секунд таймаут
    new Error("Session check timed out"),
  ).catch(() => ({ data: { session: null } }))) as {
    data: { session: Session | null };
  };

  const session = data.session;
  if (session) {
    updateAuthUI(session.user as any as User);
    cleanAuthUrl();
    await loadFromSupabase(session.user as any as User);
    import("./ui/ui_collections.ts").then((m) => m.loadCollections());
    showWelcomeScreen(session.user as any as User);
  } else {
    updateAuthUI(null);
    showWelcomeScreen(); // Приветствие для гостя
  }

  updateXPUI();
  updateStats();
  populateFilters();
  setupFilterBehavior();
  renderTopicMastery();
  buildQuizModes();
  updateSRSBadge();
  updateVoiceUI();
  applyTheme();
  if (canClaimDailyReward()) {
    claimDailyReward(); // Автоматически проверяем и выдаем ежедневную награду
  }
  checkAutoTheme();
  updateDailyChallengeUI();
  checkSuperChallengeNotification();

  render();
  restoreScroll();

  const startMusicOnInteraction = () => {
    applyBackgroundMusic(true);
  };
  window.addEventListener("click", startMusicOnInteraction, { once: true });

  setupGestures();
  setupScrollBehavior();
  setupGridEffects();
  setupTrash();
  setupLevelUpObserver();

  const verEl = document.getElementById("app-version");
  if (verEl)
    verEl.innerHTML = `TOPIK Master ${APP_VERSION} <span style="margin: 0 5px; opacity: 0.5;">|</span> ${AI_MODEL_NAME}`;

  const searchInput = document.getElementById(
    "searchInput",
  ) as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e: unknown) => {
        const target = (e as Event).target as HTMLInputElement;
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

  if ("serviceWorker" in navigator && !import.meta.env.DEV) {
    navigator.serviceWorker
      .register("./sw.js", {
        type: import.meta.env.DEV ? "module" : "classic",
      })
      .then((reg) => {
        if (!navigator.serviceWorker.controller) {
          showToast("✅ Приложение готово к работе офлайн!");
        }

        const handleUpdate = (worker: ServiceWorker) => {
          if (state.autoUpdate) {
            worker.postMessage({ type: SW_MESSAGES.SKIP_WAITING });
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

    // Слушаем сообщения от SW (например, о завершении докачки)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (
        event.data &&
        event.data.type === SW_MESSAGES.DOWNLOAD_QUEUE_COMPLETED
      ) {
        if (event.data.count > 0)
          showToast(`✅ Докачано файлов: ${event.data.count}`);
      }
    });
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    const btn = document.getElementById("install-app-btn");
    if (btn) btn.style.display = "flex";

    showInstallBanner();
  });

  // Убираем прелоадер только после того, как всё загрузилось и отрендерилось
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500);
  }
}

window.addEventListener("beforeunload", () => {
  immediateSaveState();
});

init().catch((e) => {
  // Если произошла ошибка, тоже убираем спиннер, чтобы показать сообщение
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.remove();

  console.error("Init Error", e);

  // Автоматическое восстановление при повреждении JSON в localStorage
  if (e instanceof SyntaxError && e.message.includes("JSON")) {
    console.warn(
      "⚠️ Обнаружен поврежденный кэш. Очистка localStorage и перезагрузка...",
    );
    localStorage.clear();
    setTimeout(() => location.reload(), 500);
    return;
  }

  // Убираем alert, чтобы не блокировать интерфейс при некритичных ошибках
  // alert("Critical Init Error: " + e.message);
  let msg = "Ошибка инициализации: " + e.message;
  if (e.name === "AbortError" || e.message.includes("AbortError")) {
    msg = "Время ожидания истекло. Проверьте интернет.";
  }
  showError(msg);
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
  handleCategoryChange,
  toggleHanjaMode,
  toggleVoice,
  toggleFilterPanel,
  toggleDarkMode,
  toggleAutoUpdate: (el: HTMLInputElement) => {
    toggleAutoUpdate(el);
    if (state.autoUpdate && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting)
          reg.waiting.postMessage({ type: SW_MESSAGES.SKIP_WAITING });
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
  setTtsVolume,
  setAudioSpeed: (val: string | number) => setAudioSpeed(val),
  signInWithGoogle,
  speak,
  openLoginModal,
  openReviewMode: () =>
    import("./ui/ui_review.ts").then((m) => m.openReviewMode()),
  openShopModal: () => import("./ui/ui_shop.ts").then((m) => m.openShopModal()),
  switchShopTab: (tab: string) =>
    import("./ui/ui_shop.ts").then((m) => m.switchShopTab(tab)),
  startDailyChallenge,
  quitQuiz,
  renderDetailedStats,
  checkPronunciation: (
    word: string,
    btn: HTMLElement,
    callback?: (score: number, text: string, audioUrl?: string) => void,
    canvas?: HTMLCanvasElement,
  ) => checkPronunciation(word, btn, callback, canvas),
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
  deleteList: (id: string, btn?: HTMLElement) =>
    import("./ui/ui_collections.ts").then((m) => m.deleteList(id, btn)),
  openEditListModal: (id: string, title: string, icon: string) =>
    import("./ui/ui_collections.ts").then((m) =>
      m.openEditListModal(id, title, icon),
    ),
  setCollectionFilter: (id: string) =>
    import("./ui/ui_collections.ts").then((m) => m.setCollectionFilter(id)),
  openEditWordModal: (id: string | number, onUpdate?: () => void) =>
    import("./ui/ui_edit_word.ts").then((m) =>
      m.openEditWordModal(id, onUpdate),
    ),
  restoreWord: (id: number) => (window as any).restoreWord(id),
  permanentlyDeleteWord: (id: number, btn: HTMLElement) =>
    (window as any).permanentlyDeleteWord(id, btn),
  toggleTrashSelection: (id: number, checked: boolean) =>
    (window as any).toggleTrashSelection(id, checked),
});

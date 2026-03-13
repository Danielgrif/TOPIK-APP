/* eslint-disable no-console */
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
  isDatabaseActive,
} from "./core/db.ts";
import {
  toggleSessionTimer,
  sortByWeakWords,
  sortByTopic,
  shuffleWords,
  toggleViewMode,
  showError,
  saveAndRender,
  updatePingIndicator,
  sortByLevel,
  sortByDate,
  playAndSpeak,
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
  resetFilters,
} from "./ui/ui_filters.ts";
import { checkAndShowOnboarding, startOnboarding } from "./ui/ui_onboarding.ts";
import {
  renderSkeletons,
  resetSearchHandler,
  restoreScroll,
  render,
} from "./ui/ui_card.ts";
import {
  openModal,
  closeModal,
  openConfirm,
  closeConfirm,
} from "./ui/ui_modal.ts";
const getUiCollections = () => import("./ui/ui_collections.ts");
const getUiHanja = () => import("./ui/ui_hanja.ts");
const getUiGrammar = () => import("./ui/ui_grammar.ts");
const getUiQuotes = () => import("./ui/ui_quotes.ts");
import {
  toggleHanjaMode,
  setVoice,
  updateVoiceUI,
  toggleDarkMode,
  toggleAutoTheme,
  checkAutoTheme,
  toggleAutoUpdate,
  applyTheme,
  toggleFocusMode,
  updateMusicUI,
  toggleBackgroundMusic,
  setBackgroundMusicVolume,
  applyBackgroundMusic,
  setAccentColor,
  previewAccentColor,
  setAudioSpeed,
  setTtsVolume,
  resetAllSettings,
  applyAccentColor,
  setAutoThemeStart,
  setAutoThemeEnd,
  updateTrashRetentionUI,
  updateThemePickerUI,
  setTrashRetention,
  setupSystemThemeListener,
} from "./ui/ui_settings.ts";

import {
  handleAuth,
  openProfileModal,
  handleChangePassword,
  handleChangeEmail,
  handleLogout,
  handleDeleteAccount,
  toggleResetMode,
  togglePasswordVisibility,
  signInWithGoogle,
  updateAuthUI,
  openLoginModal,
  toggleAuthMode,
  cleanAuthUrl,
} from "./core/auth.ts";
import { AuthService } from "./core/auth_service.ts";
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
  processWeeklyResetUI,
} from "./core/stats.ts";
import {
  startDailyChallenge,
  updateDailyChallengeUI,
  checkSuperChallengeNotification,
  quitQuiz,
  buildQuizModes,
  handleQuizSummaryContinue,
} from "./ui/quiz.ts";
import {
  canClaimDailyReward,
  claimDailyReward,
  openShopModal,
  switchShopTab,
  buyItem,
  applyShopTheme,
} from "./ui/ui_shop.ts";
import {
  setupTrash,
  restoreWord,
  permanentlyDeleteWord,
  emptyTrash,
} from "./ui/ui_trash.ts";
import { checkPronunciation } from "./core/speech.ts";
import { SW_MESSAGES, DB_TABLES } from "./core/constants.ts";
import { Quote, User, Word } from "./types/index.ts";
import type { Session } from "@supabase/supabase-js";
import { collectionsState } from "./core/collections_data.ts";
import {
  createList,
  saveListChanges,
  deleteList,
  openEditListModal,
  setCollectionFilter,
  manageMyWords,
  clearCollectionFilter,
  editListTitleInline,
  toggleWordInList,
  shareList,
} from "./ui/ui_collections.ts";
import {
  openEditWordModal,
  saveWordChanges,
  deleteWord,
} from "./ui/ui_edit_word.ts";
import {
  toggleSelectMode,
  bulkDelete,
  bulkMoveToTopic,
  bulkAddToList,
  selectAll,
  handleBulkAddToList,
  createNewListForBulk,
  bulkRemoveFromList,
} from "./ui/ui_bulk.ts";
import { startMistakeQuiz, openMistakesModal } from "./ui/ui_mistakes.ts";
import { showRequestError } from "./ui/ui_custom_words.ts";

/**
 * Updates the visual sync state in the UI.
 * @param status The current synchronization status.
 */
const setSyncState = (status: "syncing" | "synced" | "error" | "offline") => {
  const el = document.getElementById("sync-status");
  if (!el) return;
  el.className = `sync-status ${status}`;
  const icons: Record<string, string> = {
    syncing: "⏳",
    synced: "✅",
    error: "❌",
    offline: "📡",
  };
  el.textContent = icons[status] || "";
};

let currentQuote: Quote | null = null;
let welcomeAudioTimeout: number | null = null;

function ensureErrorOverlay() {
  if (!document.getElementById("error-overlay")) {
    const div = document.createElement("div");
    div.innerHTML = `<div id="error-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:99999;display:flex;justify-content:center;align-items:center;flex-direction:column;color:white;text-align:center;padding:20px;"><div style="font-size:48px;margin-bottom:20px;">⚠️</div><div id="error-msg" style="font-size:18px;margin-bottom:20px;">Критическая ошибка</div><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;border:none;background:white;color:black;font-weight:bold;cursor:pointer;">Перезагрузить</button></div>`;
    if (document.body) {
      document.body.appendChild(div.firstElementChild as Node);
    }
  }
}

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

/**
 * Asynchronously loads private words for the current user if they are not already in the data store.
 * @returns {Promise<boolean>} A promise that resolves to true if new words were loaded, false otherwise.
 */
async function loadPrivateWords(): Promise<boolean> {
  if (!state.dataStore) return false;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;

  const { data } = await client
    .from(DB_TABLES.VOCABULARY)
    .select("*")
    .eq("created_by", user.id)
    .eq("is_public", false);

  if (data) {
    const currentIds = new Set(state.dataStore.map((w) => w.id));
    const toAdd = data.filter((w) => !currentIds.has(w.id));
    if (toAdd.length > 0) {
      state.dataStore.push(...toAdd);
      if (searchWorker) {
        searchWorker.postMessage({
          type: "SET_DATA",
          data: state.dataStore,
        });
      }
      return true;
    }
  }
  return false;
}

// Используем Vite-совместимый импорт воркера
let searchWorker: Worker;
let currentSearchRequestId = 0;
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

async function measurePing() {
  if (!navigator.onLine) {
    if (state.networkPing !== null) {
      state.networkPing = null;
      updatePingIndicator();
    }
    return;
  }
  try {
    const start = performance.now();
    // @ts-expect-error - supabaseUrl is protected but we need it for ping check
    const baseUrl = client.supabaseUrl;
    if (!baseUrl) throw new Error("No URL");
    const apiUrl = `${baseUrl}/rest/v1/`;
    await fetch(apiUrl, { method: "HEAD", mode: "cors", cache: "no-store" });
    const duration = Math.round(performance.now() - start);
    state.networkPing = duration;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    state.networkPing = null; // Set to null on error
  }
  updatePingIndicator();
}

function injectDynamicStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .ping-indicator {
      display: none; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      padding: 4px 8px; border-radius: 20px; background-color: var(--surface-2);
      transition: color 0.3s ease, background-color 0.3s ease;
    }
    .ping-indicator::before { content: ''; display: block; width: 8px; height: 8px; border-radius: 50%; background-color: currentColor; }
    .ping-indicator.good { color: var(--success); }
    .ping-indicator.medium { color: var(--warning); }
    .ping-indicator.bad { color: var(--danger); }

    /* Bottom Nav Styles */
    .nav-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        padding: 6px 0; /* Запасной цвет #6b7280 имеет достаточный контраст (AA) */
        cursor: pointer;
        color: var(--text-sub, #6b7280);
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;
    }
    .nav-btn .nav-icon {
        font-size: 24px;
        margin-bottom: 2px;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .nav-btn .nav-label {
        font-size: 10px;
        font-weight: 500;
    }
    .nav-btn.active {
        color: var(--primary, #6c5ce7);
    }
    .nav-btn.active .nav-icon {
        transform: translateY(-2px) scale(1.1);
    }
  `;
  document.head.appendChild(style);
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
        if (modalId === "quotes-modal") {
          getUiQuotes().then((m) => m.renderFavoriteQuotes());
        }
        // FIX: Render stats when modal opens
        if (modalId === "stats-modal") {
          renderDetailedStats();
          updateThemePickerUI(); // Обновляем кнопки тем в статистике
        }
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

      switch (action) {
        case "toggle-favorite":
          if (value) {
            // Lazy load the module that contains toggleFavorite logic
            import("./ui/ui_card.ts").then((m) =>
              m.toggleFavorite(value, actionTrigger as HTMLElement),
            );
          }
          break;
        case "toggle-auth-mode":
          if (value === "login" || value === "signup") {
            toggleAuthMode(value);
          }
          break;
        case "speak-word":
          if (value) {
            const word = state.dataStore.find((w) => String(w.id) === value);
            if (word) {
              const btn = actionTrigger as HTMLElement;
              btn.classList.add("playing");
              playAndSpeak(word).then(() => {
                btn.classList.remove("playing");
              });
            }
          }
          break;
        case "copy-word":
          if (value) {
            navigator.clipboard.writeText(value);
            showToast("📋 Скопировано!");
          }
          break;
        case "add-to-list":
          if (value) {
            getUiCollections().then((m) => m.openAddToListModal(Number(value)));
          }
          break;
        case "open-hanja-modal":
          if (value) getUiHanja().then((m) => m.openHanjaModal(value));
          break;
        case "open-grammar-modal":
          if (value) {
            const word = state.dataStore.find((w) => String(w.id) === value);
            if (word) getUiGrammar().then((m) => m.openGrammarModal(word));
          }
          break;
        case "nav-home":
          document.querySelectorAll(".modal.active").forEach((m) => {
            closeModal(m.id);
          });
          updateBottomNav("nav-home");
          // Сбрасываем фильтр коллекции при переходе на главную
          import("./ui/ui_collections.ts").then((m) =>
            m.setCollectionFilter(null),
          );
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
          resetFilters();
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
          sortByLevel();
          break;
        case "sort-date":
          sortByDate();
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
          openShopModal();
          break;
        case "open-profile":
          openProfileModal();
          updateTrashRetentionUI();
          break;
        case "open-mistakes":
          openMistakesModal();
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
            client.auth.getUser().then(async ({ data: { user } }) => {
              if (!user) {
                showToast("Войдите, чтобы сохранять цитаты");
                openLoginModal();
                return;
              }

              const quoteId = currentQuote!.id;
              const isFav = state.favoriteQuotes.some((q) => q.id === quoteId);

              if (isFav) {
                state.favoriteQuotes = state.favoriteQuotes.filter(
                  (q) => q.id !== quoteId,
                );
                actionTrigger.textContent = "🤍";
                actionTrigger.classList.remove("active");
                showToast("Цитата удалена из избранного");
                await client
                  .from(DB_TABLES.USER_FAVORITE_QUOTES)
                  .delete()
                  .match({ user_id: user.id, quote_id: quoteId });
              } else {
                state.favoriteQuotes.push(currentQuote!);
                actionTrigger.textContent = "❤️";
                actionTrigger.classList.add("active");
                showToast("Цитата сохранена в избранное!");
                await client
                  .from(DB_TABLES.USER_FAVORITE_QUOTES)
                  .insert({ user_id: user.id, quote_id: quoteId });
              }
              immediateSaveState(); // Сохраняем локально для оффлайн-доступа
            });
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
          toggleAuthMode(value === "true" ? "reset" : "login");
          break;
        case "set-voice":
          if (value) setVoice(value);
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
        case "delete-account":
          handleDeleteAccount();
          break;
        case "change-password":
          handleChangePassword();
          break;
        case "change-email":
          handleChangeEmail();
          break;
        case "open-leaderboard":
          console.log("🏆 Opening leaderboard...");
          import("./ui/ui_leaderboard.ts")
            .then((m) => m.openLeaderboard())
            .catch((e) => {
              console.error("Failed to load leaderboard module:", e);
              showToast(
                "❌ Ошибка загрузки таблицы лидеров. Проверьте интернет.",
              );
            });
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
          startOnboarding();
          break;
        case "create-list":
          createList();
          break;
        case "save-list-changes":
          saveListChanges();
          break;
        case "save-word-changes":
          saveWordChanges();
          break;
        case "delete-word":
          deleteWord();
          break;
        case "open-collections-filter":
          openModal("collections-modal");
          updateBottomNav("open-collections-filter");
          break;
        case "open-failed-requests":
          import("./ui/ui_failed_requests.ts").then((m) =>
            m.openFailedRequestsModal(),
          );
          break;
        case "toggle-select-mode":
          toggleSelectMode();
          break;
        case "bulk-delete":
          bulkDelete();
          break;
        case "bulk-move":
          bulkMoveToTopic();
          break;
        case "bulk-list":
          bulkAddToList();
          break;
        case "bulk-select-all":
          selectAll();
          break;
        case "set-trash-retention":
          if (value) setTrashRetention(value);
          break;
        case "toggle-session":
          toggleSessionTimer();
          break;
        case "reset-search":
          resetSearchHandler();
          break;
        case "switch-shop-tab":
          if (value) switchShopTab(value);
          break;
        case "delete-list":
          if (value) deleteList(value, actionTrigger as HTMLElement);
          break;
        case "edit-list":
          {
            const title = actionTrigger.getAttribute("data-title") || "";
            const icon = actionTrigger.getAttribute("data-icon") || "";
            if (value) openEditListModal(value, title, icon);
          }
          break;
        case "set-collection-filter":
          // FIX: Если пользователь открывает список, подгружаем его личные слова,
          // так как мы скрыли их на главном экране при загрузке.
          if (value) {
            loadPrivateWords().then((wordsAdded) => {
              if (wordsAdded) render(); // Re-render only if new words were added
            });
          }
          setCollectionFilter(value, e);
          break;
        case "edit-word":
          if (value) openEditWordModal(value, render);
          break;
        case "restore-word":
          if (value) restoreWord(Number(value));
          break;
        case "delete-word-permanent":
          if (value)
            permanentlyDeleteWord(Number(value), actionTrigger as HTMLElement);
          break;
        case "remove-from-list":
          if (value) {
            getUiCollections().then((m) => m.removeWordFromCurrentList(value));
          }
          break;
        case "bulk-add-to-list-item":
          if (value) handleBulkAddToList(value);
          break;
        case "bulk-remove-list":
          bulkRemoveFromList();
          break;
        case "create-new-list-bulk":
          createNewListForBulk();
          break;
        case "toggle-word-in-list":
          {
            const listId = actionTrigger.getAttribute("data-list-id");
            const wordId = actionTrigger.getAttribute("data-word-id");
            if (listId && wordId) {
              toggleWordInList(
                listId,
                Number(wordId),
                actionTrigger as HTMLElement,
              );
            }
          }
          break;
        case "start-mistake-quiz":
          startMistakeQuiz();
          break;
        case "quiz-summary-continue":
          handleQuizSummaryContinue();
          break;
        case "claim-reward":
          claimDailyReward(actionTrigger as HTMLElement);
          break;
        case "buy-item":
          if (value) buyItem(value, actionTrigger as HTMLButtonElement);
          break;
        case "apply-shop-theme":
          if (value) applyShopTheme(value);
          break;
        case "manage-my-words":
          // FIX: Подгружаем слова и для менеджера слов
          // Fire and forget, no need to re-render here as manageMyWords will handle it.
          loadPrivateWords();
          manageMyWords(e);
          break;
        case "clear-collection-filter":
          clearCollectionFilter(e);
          break;
        case "share-list":
          if (value) shareList(value);
          break;
        case "edit-list-title-inline":
          if (value)
            editListTitleInline(value, actionTrigger as HTMLElement, e);
          break;
        case "empty-trash":
          emptyTrash();
          break;
        case "show-request-error": {
          const errorMsg = actionTrigger.getAttribute("data-error") || "";
          showRequestError(errorMsg);
          break;
        }
        case "speak": {
          const url = actionTrigger.getAttribute("data-url");
          if (url) {
            actionTrigger.classList.add("playing");
            speak(null, url).then(() => {
              actionTrigger.classList.remove("playing");
            });
          }
          break;
        }
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

    if (action === "toggle-dark-mode") toggleDarkMode(target);
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
    if (action === "set-auto-theme-start") setAutoThemeStart(target.value);
    if (action === "set-auto-theme-end") setAutoThemeEnd(target.value);
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

  // File Import Listener
  const importFile = document.getElementById("import-file");
  if (importFile) {
    importFile.addEventListener("change", (e) => {
      import("./ui/ui_data.ts").then((m) => m.importProgress(e));
    });
  }
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
    welcomeOverlay.style.zIndex = "20000";
    welcomeOverlay.style.visibility = "visible";
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

function updateDbStatus(status: "active" | "waking" | "error") {
  const el = document.getElementById("db-status-indicator");
  if (!el) return;
  el.classList.remove("active", "waking", "error");
  el.classList.add(status);
  if (status === "active") el.title = "🟢 База данных активна";
  if (status === "waking") el.title = "🟡 Подключение к базе...";
  if (status === "error") el.title = "🔴 Нет соединения с базой";
}

function setupNetworkListeners() {
  let indicator = document.getElementById("offline-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "offline-indicator";
    indicator.textContent = "📡 Нет подключения к интернету";
    document.body.appendChild(indicator);
  }

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
    setSyncState("syncing"); // Показываем, что пытаемся синхронизироваться
    // Принудительно восстанавливаем Realtime соединение при появлении сети
    client.realtime.connect();
    updateDbStatus("waking");
    isDatabaseActive(5000).then((active) =>
      updateDbStatus(active ? "active" : "error"),
    );
    import("./core/sync.ts").then((m) => m.syncGlobalStats());
    // Запускаем синхронизацию сохраненных заявок
    import("./ui/ui_retry.ts").then((m) => m.syncOfflineRequests());
  });
  window.addEventListener("offline", () => {
    updateStatus();
    showToast("📡 Вы перешли в офлайн режим");
    updateDbStatus("error");
    setSyncState("offline");
  });

  // Слушаем изменения качества соединения (Network Information API)
  // @ts-expect-error Navigator connection API is experimental
  if (navigator.connection) {
    // @ts-expect-error Navigator connection API is experimental
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
  const newWordsBuffer: Word[] = [];

  const processBuffer = debounce(() => {
    if (newWordsBuffer.length === 0) return;

    // Фильтруем дубликаты внутри батча и относительно текущего стора
    const currentIds = new Set(state.dataStore.map((w) => w.id));
    const uniqueWords: Word[] = [];
    const seenInBatch = new Set();

    for (const w of newWordsBuffer) {
      if (!currentIds.has(w.id) && !seenInBatch.has(w.id)) {
        uniqueWords.push(w);
        seenInBatch.add(w.id);
      }
    }
    newWordsBuffer.length = 0; // Очищаем буфер

    if (uniqueWords.length === 0) return;

    console.log(`🔥 Realtime: Adding ${uniqueWords.length} new words`);
    state.dataStore.unshift(...uniqueWords);

    if (uniqueWords.length === 1) {
      showToast(`✨ Готово: ${uniqueWords[0].word_kr}`);
    } else {
      showToast(`✨ Добавлено слов: ${uniqueWords.length}`);
    }

    const grid = document.getElementById("vocabulary-grid");
    const savedScroll = grid ? grid.scrollTop : 0;
    render();
    if (searchWorker) {
      searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });
    }
    if (grid) grid.scrollTop = savedScroll;
  }, 1000);

  const handleNewWord = (payload: { new: Word }) => {
    const newWord = payload.new;
    if (newWord) {
      // FIX: Не добавляем приватные слова (слова пользователя) в общий поток на главном экране.
      // Они должны быть доступны только через списки.
      if (newWord.is_public === false) return;

      newWordsBuffer.push(newWord);
      processBuffer();
    }
  };

  // Слушаем новые слова, добавленные через Worker (INSERT в таблицу vocabulary и user_vocabulary)
  const subscribeVocab = () => {
    const channel = client.channel("public:vocabulary");
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: DB_TABLES.VOCABULARY },
        handleNewWord,
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime: Подписка на 'public:vocabulary' активна.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `❌ Realtime: Ошибка канала 'public:vocabulary' (${status})`,
            err,
          );
          setTimeout(async () => {
            console.log("🔄 Переподключение 'public:vocabulary'...");
            await client.removeChannel(channel);
            subscribeVocab();
          }, 5000);
        }
      });
  };

  // Слушаем добавление слов в списки (таблица list_items)
  const subscribeListItems = () => {
    const channel = client.channel("public:list_items");
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "list_items" },
        async (payload: { new: { list_id: string; word_id: number } }) => {
          const newItem = payload.new;
          if (newItem && newItem.list_id && newItem.word_id) {
            // Проверяем, есть ли слово в локальном сторе.
            // Если его нет (например, оно приватное и было пропущено в handleNewWord), загружаем его.
            const wordExists = state.dataStore.some(
              (w) => w.id === newItem.word_id,
            );
            if (!wordExists) {
              const { data: wordData, error } = await client
                .from(DB_TABLES.VOCABULARY)
                .select("*")
                .eq("id", newItem.word_id)
                .single();

              if (wordData && !error) {
                state.dataStore.unshift(wordData);
                if (searchWorker) {
                  searchWorker.postMessage({
                    type: "SET_DATA",
                    data: state.dataStore,
                  });
                }
              }
            }

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
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime: Подписка на 'public:list_items' активна.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `❌ Realtime: Ошибка канала 'public:list_items' (${status})`,
            err,
          );
          setTimeout(async () => {
            console.log("🔄 Переподключение 'public:list_items'...");
            await client.removeChannel(channel);
            subscribeListItems();
          }, 5000);
        }
      });
  };

  subscribeVocab();
  subscribeListItems();
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

  // 🔥 Прогрев базы данных в фоне (Fire and forget)
  // Это помогает "разбудить" Supabase на бесплатном тарифе, пока грузится UI
  updateDbStatus("waking");
  isDatabaseActive(5000).then((active) => {
    console.log(
      active ? "⚡ Database is active" : "💤 Database might be waking up...",
    );
    updateDbStatus(active ? "active" : "error");
    if (!active) {
      setTimeout(
        () =>
          isDatabaseActive(5000).then((a) =>
            updateDbStatus(a ? "active" : "error"),
          ),
        5000,
      );
    }
  });

  if (!document.body) {
    throw new Error("Document body not ready");
  }

  // 1. Вставляем HTML-компоненты (Header, Toolbar, Modals) перед инициализацией UI
  injectComponents();

  // 1.1 Инъекция динамических стилей и элементов
  injectDynamicStyles();

  const dbStatusEl = document.getElementById("db-status-indicator");
  if (dbStatusEl) {
    dbStatusEl.style.cursor = "pointer";
    dbStatusEl.onclick = () => {
      updateDbStatus("waking");
      showToast("🔄 Проверка соединения...");
      isDatabaseActive(5000).then((active) => {
        updateDbStatus(active ? "active" : "error");
        if (active) {
          showToast("✅ База данных активна. Обновляем словарь...");
          fetchVocabulary();
        } else {
          showToast("❌ Ошибка соединения");
        }
      });
    };
  }

  const headerActions = document.querySelector(".header-actions");
  if (headerActions && !document.getElementById("ping-indicator")) {
    const pingEl = document.createElement("div");
    pingEl.id = "ping-indicator";
    pingEl.className = "ping-indicator";
    headerActions.prepend(pingEl); // Добавляем в начало кнопок хедера
  }

  // FIX: Ensure Bottom Nav is visible and active
  const nav = document.getElementById("bottom-nav");
  if (nav) {
    // Перемещаем в body, чтобы избежать проблем с наложением (stacking context)
    if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }

    nav.style.setProperty("display", "flex", "important");

    // Принудительно обновляем содержимое панели согласно вашему списку
    nav.innerHTML = `
        <button class="nav-btn active" data-action="nav-home">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span class="nav-label">Главная</span>
        </button>
        <button class="nav-btn" data-action="open-collections-filter">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            </span>
            <span class="nav-label">Списки</span>
        </button>
        <button class="nav-btn" data-modal-target="quiz-modal">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
            </span>
            <span class="nav-label">Тренировка</span>
        </button>
        <button class="nav-btn" data-action="open-review">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </span>
            <span class="nav-label">Повторение</span>
        </button>
        <button class="nav-btn" data-modal-target="stats-modal">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            </span>
            <span class="nav-label">Прогресс</span>
        </button>
    `;

    updateBottomNav("nav-home");
  } else {
    console.error("❌ Bottom Nav NOT found in DOM after injection");
  }

  setupGlobalListeners();
  setupNetworkListeners();
  setupSystemThemeListener();
  setupRealtimeUpdates(); // <--- Включаем прослушку обновлений

  renderSkeletons();

  try {
    await fetchVocabulary();
  } catch (e) {
    console.error("Vocabulary fetch failed:", e);
    throw e;
  }

  // FIX: Фильтруем данные при старте:
  // 1. Удаленные слова (deleted_at)
  // 2. Приватные слова пользователя (is_public === false) - они не должны быть на главной
  if (state.dataStore) {
    state.dataStore = state.dataStore.filter(
      (w) => !w.deleted_at && w.is_public !== false,
    );
  }

  if (!state.dataStore || state.dataStore.length === 0) {
    throw new Error("Не удалось загрузить данные. Проверьте интернет.");
  }

  if (searchWorker)
    searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });

  if (searchWorker)
    searchWorker.onmessage = (e) => {
      const { results, requestId } = e.data;

      // Игнорируем результаты устаревших запросов
      if (requestId !== currentSearchRequestId) return;
      state.searchResults = results;

      render();
    };

  // FIX: Настраиваем слушатель только для БУДУЩИХ событий (вход/выход).
  // INITIAL_SESSION игнорируем, так как обработаем его явно ниже, чтобы не было "скачка" интерфейса.
  AuthService.onAuthStateChange(
    async (event: string, session: Session | null) => {
      if (event === "INITIAL_SESSION") return;

      try {
        if (session?.user) {
          updateAuthUI(session.user as unknown as User);
          if (event === "SIGNED_IN") {
            cleanAuthUrl();
            await loadFromSupabase(session.user as unknown as User);
            applyTheme();
            updateVoiceUI();
            saveAndRender();
            closeModal("login-modal");
            import("./ui/ui_collections.ts").then((m) => m.loadCollections());
            showWelcomeScreen(session.user as unknown as User);
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
  ).catch((e: unknown) => {
    console.warn("Session check failed/timed out:", e);
    return { data: { session: null } };
  })) as {
    data: { session: Session | null };
  };

  const session = data.session;
  if (session) {
    updateAuthUI(session.user as unknown as User);
    cleanAuthUrl();
    try {
      await promiseWithTimeout(
        loadFromSupabase(session.user as unknown as User),
        7000, // 7-секундный таймаут на загрузку прогресса
        new Error(
          "Загрузка прогресса пользователя заняла слишком много времени",
        ),
      );
    } catch (e) {
      console.error(
        "Не удалось загрузить прогресс пользователя при инициализации:",
        e,
      );
      showToast(
        "⚠️ Не удалось загрузить ваш прогресс. Проверьте интернет или войдите заново.",
      );
    }
    import("./ui/ui_collections.ts").then((m) => m.loadCollections());
    showWelcomeScreen(session.user as unknown as User);
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
  updateMusicUI();
  updateVoiceUI();
  applyTheme();
  if (canClaimDailyReward()) {
    claimDailyReward(); // Автоматически проверяем и выдаем ежедневную награду
  }
  checkAutoTheme();
  updateDailyChallengeUI();
  checkSuperChallengeNotification();
  processWeeklyResetUI(); // Проверка смены недели и лиг

  // Запускаем проверку авто-темы каждую минуту (для переключения в реальном времени)
  setInterval(checkAutoTheme, 60000);

  render();
  restoreScroll();

  const startMusicOnInteraction = () => {
    applyBackgroundMusic(true);
  };
  window.addEventListener("click", startMusicOnInteraction, { once: true });

  setupGestures();
  setupScrollBehavior();
  setupTrash();
  setupLevelUpObserver();

  // Check for shared list in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sharedListId = urlParams.get("share_list");
  if (sharedListId) {
    // Clean URL
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.hash,
    );

    setTimeout(async () => {
      const { data: list, error } = await client
        .from(DB_TABLES.USER_LISTS)
        .select("*")
        .eq("id", sharedListId)
        .single();

      if (error || !list) {
        showToast("❌ Список не найден или он приватный");
        return;
      }

      openConfirm(
        `Добавить список "${list.title}" к себе?`,
        async () => {
          // В текущей реализации мы просто подписываемся на список, если он публичный.
          // Если нужно копировать - это другая логика.
          // Здесь мы просто открываем его.
          import("./ui/ui_collections.ts").then((m) => {
            // Добавляем в локальный стейт, если его там нет
            if (!collectionsState.userLists.find((l) => l.id === list.id)) {
              collectionsState.userLists.push(list);
            }
            m.setCollectionFilter(list.id);
            showToast(`📂 Список "${list.title}" открыт`);
          });
        },
        { confirmText: "Открыть", cancelText: "Отмена" },
      );
    }, 1000); // Wait for app init
  }

  // Запускаем периодическое измерение пинга
  setInterval(measurePing, 15000);
  measurePing(); // Первый замер сразу

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
          currentSearchRequestId++; // Увеличиваем ID при каждом новом вводе
          searchWorker.postMessage({
            type: "SEARCH",
            query: val,
            requestId: currentSearchRequestId,
          });
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
      .register("/sw.js", {
        scope: "/",
      })
      .then(async (reg) => {
        if (!navigator.serviceWorker.controller) {
          showToast("✅ Приложение готово к работе офлайн!");
        }

        // Register for Periodic Background Sync
        const registration = reg as ServiceWorkerRegistration & {
          periodicSync?: {
            register: (
              tag: string,
              options: { minInterval: number },
            ) => Promise<void>;
          };
        };
        if (registration.periodicSync) {
          try {
            await registration.periodicSync.register(SW_MESSAGES.CONTENT_SYNC, {
              // An interval of 12 hours. The browser will decide the exact frequency.
              minInterval: 12 * 60 * 60 * 1000,
            });
            console.log("✅ Periodic Sync registered for tag: content-sync");
          } catch (err) {
            console.error("❌ Periodic Sync registration failed:", err);
          }
        } else {
          console.warn(
            "Periodic Background Sync is not supported by this browser.",
          );
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
    navigator.serviceWorker.addEventListener(
      "message",
      (event: MessageEvent) => {
        const data = event.data as { type: string; count: number };
        if (data && data.type === SW_MESSAGES.DOWNLOAD_QUEUE_COMPLETED) {
          if (data.count > 0) showToast(`✅ Докачано файлов: ${data.count}`);
        }
      },
    );
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
  console.log("App initialized successfully");
}

// init() defined. Setting up listeners...

window.addEventListener("beforeunload", () => {
  immediateSaveState();
});

const handleInitError = (e: Error) => {
  // Если произошла ошибка, тоже убираем спиннер, чтобы показать сообщение
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.remove();

  console.error("Init Error:", e);
  ensureErrorOverlay();

  // Автоматическое восстановление при повреждении JSON в localStorage
  if (
    e instanceof SyntaxError &&
    (e.message.includes("JSON") || e.message.includes("token"))
  ) {
    console.warn(
      "⚠️ Обнаружен поврежденный кэш. Очистка localStorage и перезагрузка...",
    );
    localStorage.clear();
    setTimeout(() => location.reload(), 500);
    return;
  }

  let msg = "Ошибка инициализации: " + e.message;
  if (e.name === "AbortError" || e.message.includes("AbortError")) {
    msg = "Время ожидания истекло. Проверьте интернет.";
  }
  showError(msg);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    try {
      init().catch(handleInitError);
    } catch (e) {
      console.error("Synchronous error in init call:", e);
    }
  });
} else {
  if (document.body) {
    try {
      init().catch(handleInitError);
    } catch (e) {
      console.error("Synchronous error in init call:", e);
    }
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      try {
        init().catch(handleInitError);
      } catch (e) {
        console.error("Synchronous error in init call:", e);
      }
    });
  }
}

Object.assign(window, {
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
  setVoice,
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
  handleLogout,
  handleDeleteAccount,
  handleChangePassword,
  handleChangeEmail,
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
  restoreWord: (id: number) =>
    (window as unknown as { restoreWord: (id: number) => void }).restoreWord(
      id,
    ),
  permanentlyDeleteWord: (id: number, btn: HTMLElement) =>
    (
      window as unknown as {
        permanentlyDeleteWord: (id: number, btn: HTMLElement) => void;
      }
    ).permanentlyDeleteWord(id, btn),
  toggleTrashSelection: (id: number, checked: boolean) =>
    (
      window as unknown as {
        toggleTrashSelection: (id: number, checked: boolean) => void;
      }
    ).toggleTrashSelection(id, checked),
  updateSearchIndex: () => {
    if (searchWorker) {
      searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });
    }
  },
});

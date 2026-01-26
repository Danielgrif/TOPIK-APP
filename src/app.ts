console.log("🚀 App starting...");

import "./css/style.css";
import { client } from "./core/supabaseClient.ts";
import { state } from "./core/state.ts";
import {
  fetchVocabulary,
  loadFromSupabase,
  immediateSaveState,
  fetchRandomQuote,
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
import { debounce, showToast, speak, typeText, cancelSpeech } from "./utils/utils.ts";
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
import { checkPronunciation } from "./core/speech.ts";

let currentQuote: any = null;
let welcomeAudioPromise: Promise<void> | null = null;
let welcomeAudioTimeout: number | null = null;

function performWelcomeClose() {
  cancelSpeech(); // FIX: Отменяем любые отложенные или текущие звуки
  if (welcomeAudioTimeout) {
    clearTimeout(welcomeAudioTimeout);
    welcomeAudioTimeout = null;
  }
  const wOverlay = document.getElementById("welcome-overlay");
  if (wOverlay) {
    wOverlay.style.animation = "flyOutUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";
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

function setupGlobalListeners() {
  console.log("🛠️ Global listeners setup started");
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
      // Исправление: Если триггер закрытия — это само модальное окно (оверлей),
      // проверяем, был ли клик именно по нему, а не по контенту внутри.
      const isOverlay = closeTrigger.classList.contains("modal");
      if (!isOverlay || target === closeTrigger) {
        const modalId = closeTrigger.getAttribute("data-close-modal");
        if (modalId) closeModal(modalId);
        return;
      }
      // Если клик внутри контента, игнорируем этот триггер и идем дальше проверять data-action
    }

    const actionTrigger = target.closest("[data-action]");
    if (actionTrigger) {
      const action = actionTrigger.getAttribute("data-action");
      const value = actionTrigger.getAttribute("data-value");
      console.log(`⚡ Action detected: ${action}`);

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
        case "open-shop":
          import("./ui/ui_shop.ts").then((m) => m.openShopModal());
          break;
        case "open-profile":
          openProfileModal();
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
          {
            if (welcomeAudioPromise) {
              const btn = actionTrigger as HTMLElement;
              if (btn) {
                btn.innerHTML = '🎧 Слушаем...';
                btn.style.opacity = "0.8";
                btn.style.pointerEvents = "none";
              }
              welcomeAudioPromise.then(() => {
                performWelcomeClose();
              });
            } else {
              performWelcomeClose();
            }
          }
          break;
        case "submit-word-request":
          import("./ui/ui_custom_words.ts").then((m) => m.submitWordRequest());
          break;
        case "save-quote":
          if (currentQuote) {
            const idx = state.favoriteQuotes.findIndex((q: any) => q.id === currentQuote.id);
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
      }
    }
  });

  // Color Preview on Hover
  document.body.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('[data-action="set-accent"]');
    if (trigger) {
      const val = trigger.getAttribute("data-value");
      if (val) previewAccentColor(val);
    }
  });

  document.body.addEventListener("mouseout", (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('[data-action="set-accent"]');
    if (trigger && (!e.relatedTarget || !trigger.contains(e.relatedTarget as Node))) {
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

  // Закрытие модальных окон по клавише Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.active");
      if (activeModal) {
        activeModal.id === "confirm-modal" ? closeConfirm() : closeModal(activeModal.id);
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
                y: 0
              },
              colors: ['#6c5ce7', '#00b894', '#ffeaa7', '#ff7675', '#74b9ff'],
              zIndex: 10000,
            });
            window.confetti({
              particleCount: 4,
              angle: 120,
              spread: 55,
              origin: {
                x: 1,
                y: 0
              },
              colors: ['#6c5ce7', '#00b894', '#ffeaa7', '#ff7675', '#74b9ff'],
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

function showWelcomeScreen(user?: any) {
  const welcomeOverlay = document.getElementById("welcome-overlay");
  const welcomeName = document.getElementById("welcome-username");
  const welcomeQuote = document.getElementById("welcome-quote");

  if (welcomeOverlay && welcomeName) {
    let name = "Гость";
    if (user) {
      // Если передан объект пользователя, берем имя из метаданных, иначе из email
      // Если передана строка (старый код), считаем это email
      const userData = typeof user === "string" ? { email: user } : user;
      name = userData.user_metadata?.full_name || userData.email?.split("@")[0] || "Гость";
    }
    welcomeName.textContent = name;

    const hour = new Date().getHours();
    let greeting = "С возвращением!";
    let bgStyle = "rgba(0,0,0,0.85)";

    if (hour >= 5 && hour < 12) {
      greeting = "Доброе утро!";
      bgStyle = "linear-gradient(135deg, rgba(255, 180, 180, 0.95) 0%, rgba(255, 220, 240, 0.95) 100%)"; /* Softer Morning */
    } else if (hour >= 12 && hour < 18) {
      greeting = "Добрый день!";
      bgStyle = "linear-gradient(135deg, rgba(100, 180, 255, 0.95) 0%, rgba(100, 230, 255, 0.95) 100%)"; /* Softer Day */
    } else {
      greeting = "Добрый вечер!";
      bgStyle = "linear-gradient(135deg, rgba(30, 40, 60, 0.98) 0%, rgba(50, 70, 100, 0.98) 100%)"; /* Deep Evening */
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
      welcomeQuote.innerHTML = '<div class="skeleton-pulse" style="height: 20px; width: 60%; margin: 0 auto; border-radius: 4px;"></div>';
      
      fetchRandomQuote().then((quote) => {
        let textToSpeak = "시작이 반이다";
        if (quote) {
          currentQuote = quote;
          const isFav = state.favoriteQuotes.some((q: any) => q.id === quote.id);
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
              welcomeAudioPromise = speak(textToSpeak, quote?.audio_url).then(() => {
                welcomeAudioPromise = null;
                if (card) card.classList.remove("audio-playing");
              });
              welcomeAudioTimeout = null;
            }, 600);
          }
        } else {
          welcomeQuote.innerHTML = `<div class="welcome-quote-card"><div class="welcome-kr">"시작이 반이다"</div><div class="welcome-ru">Начало — это уже половина дела.</div></div>`;
          // Для дефолтной цитаты оставляем таймер
          if (welcomeAudioTimeout) clearTimeout(welcomeAudioTimeout);
          welcomeAudioTimeout = window.setTimeout(() => {
            welcomeAudioPromise = speak(textToSpeak, null).then(() => {
              welcomeAudioPromise = null;
            });
            welcomeAudioTimeout = null;
          }, 800);
        }
      }).catch((e) => {
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
    conn.addEventListener('change', () => {
      // Если интернет стал хорошим (3g или 4g) и не включена экономия данных
      if (!conn.saveData && ['3g', '4g'].includes(conn.effectiveType)) {
        if (navigator.serviceWorker.controller) {
          console.log("📶 Connection improved. Processing download queue...");
          navigator.serviceWorker.controller.postMessage({ type: 'PROCESS_DOWNLOAD_QUEUE' });
          showToast("📶 Интернет улучшился. Докачиваем файлы...");
        }
      }
    });
  }

  // Initial check
  updateStatus();
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

  setupGlobalListeners();
  setupNetworkListeners();

  renderSkeletons();

  console.log("⏳ Fetching vocabulary...");
  await fetchVocabulary();
  console.log("✅ Vocabulary fetched");

  if (!state.dataStore || state.dataStore.length === 0) {
    throw new Error("Не удалось загрузить данные. Проверьте интернет.");
  }

  if (searchWorker) searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });

  if (searchWorker) searchWorker.onmessage = (e) => {
    state.searchResults = e.data;
    render();
  };

  // FIX: Настраиваем слушатель только для БУДУЩИХ событий (вход/выход).
  // INITIAL_SESSION игнорируем, так как обработаем его явно ниже, чтобы не было "скачка" интерфейса.
  client.auth.onAuthStateChange(
    async (
      event: string,
      session: { user: any } | null, 
    ) => {
      if (event === "INITIAL_SESSION") return;

      try {
        if (session) {
          updateAuthUI(session.user);
          if (event === "SIGNED_IN") {
            cleanAuthUrl();
            await loadFromSupabase(session.user);
            saveAndRender();
            closeModal("login-modal");
            showWelcomeScreen(session.user);
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
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    updateAuthUI(session.user);
    cleanAuthUrl();
    await loadFromSupabase(session.user);
    showWelcomeScreen(session.user);
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
  checkAutoTheme();
  updateDailyChallengeUI();
  checkSuperChallengeNotification();

  render();

  const startMusicOnInteraction = () => {
    applyBackgroundMusic(true);
  };
  window.addEventListener("click", startMusicOnInteraction, { once: true });

  setupGestures();
  setupScrollBehavior();
  setupGridEffects();
  setupLevelUpObserver();

  const verEl = document.getElementById("app-version");
  if (verEl) verEl.textContent = `TOPIK Master ${APP_VERSION}`;

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

    // Слушаем сообщения от SW (например, о завершении докачки)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === 'DOWNLOAD_QUEUE_COMPLETED') {
        if (event.data.count > 0) showToast(`✅ Докачано файлов: ${event.data.count}`);
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
    console.warn("⚠️ Обнаружен поврежденный кэш. Очистка localStorage и перезагрузка...");
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
});

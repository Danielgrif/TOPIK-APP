import { client } from './core/supabaseClient.js';
import { state } from './core/state.js';
import { fetchVocabulary, loadFromSupabase, immediateSaveState } from './core/db.js';
import { 
    toggleSessionTimer,
    sortByWeakWords, shuffleWords, toggleViewMode,
    showError, saveAndRender
} from './ui/ui.js';
import { showUpdateNotification, setupGestures, setupScrollBehavior, saveSearchHistory, showSearchHistory, hideSearchHistory, showInstallBanner, dismissInstallBanner } from './ui/ui_interactions.js';
import { 
    toggleFilterPanel, populateFilters, handleTopicChange, handleCategoryChange, setTypeFilter, setStarFilter 
} from './ui/ui_filters.js';
import { checkAndShowOnboarding } from './ui/ui_onboarding.js';
import { render, renderSkeletons, resetSearchHandler, setupGridEffects } from './ui/ui_card.js';
import { openModal, closeModal, openConfirm, closeConfirm } from './ui/ui_modal.js';
import { toggleHanjaMode, toggleVoice, updateVoiceUI, toggleDarkMode, toggleAutoUpdate, applyTheme, toggleFocusMode, applyFocusMode, toggleBackgroundMusic, setBackgroundMusicVolume, applyBackgroundMusic, setAccentColor, setAudioSpeed } from './ui/ui_settings.js';

import { 
    handleAuth, openProfileModal, handleChangePassword, 
    handleLogout, toggleResetMode, togglePasswordVisibility, 
    signInWithGoogle, updateAuthUI, openLoginModal, cleanAuthUrl 
} from './core/auth.js'; 
import { debounce, showToast, speak } from './utils/utils.js';
import { renderTopicMastery, updateXPUI, updateStats, updateSRSBadge, renderDetailedStats } from './core/stats.js';
import { startDailyChallenge, updateDailyChallengeUI, checkSuperChallengeNotification, quitQuiz } from './ui/quiz.js';

// --- Инициализация ---

const searchWorker = new Worker('js/workers/searchWorker.js');
const APP_VERSION = 'v56'; // Синхронизировано с sw.js
/** @type {any} */ let deferredPrompt;

// --- Глобальный перехват ошибок ---
window.onerror = function(msg, url, line, col, error) {
    console.error('🚨 Global Error:', { msg, url, line, col, error });
    return false; // Позволяет ошибке всплыть дальше (в стандартную консоль)
};
window.onunhandledrejection = function(event) {
    console.error('🚨 Unhandled Rejection:', event.reason);
};

/**
 * Настройка глобального делегирования событий.
 * Заменяет множество inline onclick обработчиков.
 */
function setupGlobalListeners() {
    document.body.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        
        // 1. Обработка data-modal-target (Открытие модалок)
        const modalTrigger = target.closest('[data-modal-target]');
        if (modalTrigger) {
            const modalId = modalTrigger.getAttribute('data-modal-target');
            if (modalId) openModal(modalId);
            return;
        }

        // 2. Обработка data-close-modal (Закрытие модалок)
        const closeTrigger = target.closest('[data-close-modal]');
        if (closeTrigger) {
            const modalId = closeTrigger.getAttribute('data-close-modal');
            if (modalId) closeModal(modalId);
            return;
        }

        // 3. Обработка data-action (Различные действия)
        const actionTrigger = target.closest('[data-action]');
        if (actionTrigger) {
            const action = actionTrigger.getAttribute('data-action');
            const value = actionTrigger.getAttribute('data-value');

            switch (action) {
                case 'toggle-focus': toggleFocusMode(/** @type {HTMLInputElement} */ (/** @type {unknown} */ (actionTrigger))); break;
                case 'reload': location.reload(); break;
                case 'toggle-dark-mode': toggleDarkMode(); break;
                case 'toggle-view': if (value) toggleViewMode(value); break;
                case 'start-daily-challenge': startDailyChallenge(); break;
                case 'toggle-filter-panel': toggleFilterPanel(); break;
                case 'set-type-filter': if (value) setTypeFilter(value, /** @type {HTMLInputElement} */ (/** @type {unknown} */ (actionTrigger))); break;
                case 'set-star-filter': if (value) setStarFilter(value, /** @type {HTMLInputElement} */ (/** @type {unknown} */ (actionTrigger))); break;
                case 'sort-weak': sortByWeakWords(); break;
                case 'shuffle': shuffleWords(); break;
                case 'open-review': import('./ui/ui_review.js').then(m => m.openReviewMode()); break;
                case 'set-accent': 
                    if (actionTrigger.parentElement) actionTrigger.parentElement.querySelectorAll('.stats-color-btn, .color-option').forEach(b=>b.classList.remove('active')); 
                    actionTrigger.classList.add('active');
                    if (value) setAccentColor(value); 
                    break;
                case 'share-stats': 
                    const activeColorBtn = document.querySelector('#stats-theme-picker .active');
                    const color = activeColorBtn ? activeColorBtn.getAttribute('data-value') : 'purple';
                    import('./ui/ui_share.js').then(m => m.shareStats(color ?? undefined)); 
                    break;
                case 'install-app': 
                    // @ts-ignore
                    if (window.installApp) (/** @type {any} */ (window)).installApp();
                    break;
                case 'dismiss-banner': dismissInstallBanner(); break;
                case 'close-level-up': document.getElementById('level-up-overlay')?.classList.remove('active'); break;
                case 'submit-word-request': import('./ui/ui_custom_words.js').then(m => m.submitWordRequest()); break;
                case 'toggle-password': togglePasswordVisibility(); break;
                case 'auth': if (value) handleAuth(value); break;
                case 'auth-google': signInWithGoogle(); break;
                case 'toggle-reset-mode': toggleResetMode(value === 'true'); break;
                case 'toggle-hanja': toggleHanjaMode(/** @type {HTMLInputElement} */ (/** @type {any} */ (actionTrigger.querySelector('input') || actionTrigger))); break;
                case 'toggle-voice': toggleVoice(/** @type {HTMLInputElement} */ (/** @type {any} */ (actionTrigger.querySelector('input') || actionTrigger))); break;
                case 'toggle-music': toggleBackgroundMusic(/** @type {HTMLInputElement} */ (/** @type {any} */ (actionTrigger.querySelector('input') || actionTrigger))); break;
                case 'toggle-auto-update': 
                    const el = /** @type {HTMLInputElement} */ (/** @type {any} */ (actionTrigger.querySelector('input') || actionTrigger));
                    toggleAutoUpdate(el);
                    if (state.autoUpdate && 'serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistration().then(reg => {
                            if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                        });
                    }
                    break;
                case 'export-data': import('./ui/ui_data.js').then(m => m.exportProgress()); break;
                case 'clear-data': import('./ui/ui_data.js').then(m => m.clearData()); break;
                case 'logout': handleLogout(); break;
                case 'change-password': handleChangePassword(); break;
                case 'close-confirm': closeConfirm(); break;
                case 'quit-quiz': quitQuiz(); break;
            }
        }
    });

    // Обработчики input событий (range sliders)
    document.body.addEventListener('input', (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const action = target.getAttribute('data-action');
        
        if (action === 'set-speed') {
            setAudioSpeed(target.value);
        } else if (action === 'set-music-volume') {
            setBackgroundMusicVolume(target.value);
        }
    });
    
    // Обработчики change событий (для некоторых свитчей, если клик не сработал корректно)
    document.body.addEventListener('change', (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const action = target.getAttribute('data-action');
        
        // Дублируем логику для надежности (иногда change надежнее click для checkbox)
        if (action === 'toggle-dark-mode') toggleDarkMode();
        if (action === 'toggle-hanja') toggleHanjaMode(target);
        if (action === 'toggle-music') toggleBackgroundMusic(target);
        if (action === 'toggle-auto-update') {
             toggleAutoUpdate(target);
             if (state.autoUpdate && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                });
            }
        }
    });
}

async function init() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.remove(); // Убираем старый лоадер, если он есть

    // Мгновенно показываем скелетон (заглушки)
    renderSkeletons();
    
    // 1. Загрузка словаря
    await fetchVocabulary();
    
    // Отправляем данные в Web Worker
    searchWorker.postMessage({ type: 'SET_DATA', data: state.dataStore });

    // Слушаем результаты поиска
    searchWorker.onmessage = (e) => {
        state.searchResults = e.data;
        render();
    };

    // 2. Настройка Auth слушателя
    client.auth.onAuthStateChange(async (/** @type {string} */ event, /** @type {any} */ session) => {
        if (session) {
            updateAuthUI(session.user);
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                cleanAuthUrl();
                await loadFromSupabase(session.user);
                saveAndRender(); // Обновляем UI после загрузки данных
                closeModal('login-modal');
            }
            if (event === 'PASSWORD_RECOVERY') {
                openProfileModal();
                showToast('ℹ️ Введите новый пароль');
            }
        } else {
            updateAuthUI(null);
        }
    });

    // 3. Первичный рендеринг
    updateXPUI();
    updateStats();
    populateFilters();
    import('./core/stats.js').then(m => m.renderTopicMastery());
    import('./ui/quiz.js').then(m => m.buildQuizModes());
    updateSRSBadge();
    updateVoiceUI();
    applyTheme();
    updateDailyChallengeUI(); // Обновляем индикатор вызова
    checkSuperChallengeNotification(); // Проверяем уведомление о супер-вызове
    applyFocusMode(); // Применяем режим фокуса (визуально)
    
    // Initial render after all setup
    render();
    
    // Запускаем музыку после первого взаимодействия пользователя
    const startMusicOnInteraction = () => {
        applyBackgroundMusic(true);
    };
    window.addEventListener('click', startMusicOnInteraction, { once: true });

    checkAndShowOnboarding();
    setupGestures(); // Включаем поддержку свайпов
    setupScrollBehavior(); // Скрываем навигацию при скролле
    setupGridEffects(); // Включаем 3D эффекты (делегирование)
    setupGlobalListeners(); // Включаем глобальное делегирование событий

    // Отображение версии приложения в настройках
    const verEl = document.getElementById('app-version');
    if (verEl) verEl.textContent = `TOPIK Master ${APP_VERSION}`;

    // 4. Поиск
    const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('searchInput'));
    if (searchInput) {
        searchInput.addEventListener('input', /** @type {EventListener} */ (debounce((/** @type {Event} */ e) => {
            const target = /** @type {HTMLInputElement} */ (/** @type {any} */ (e.target));
            if (target) {
                const val = target.value.trim().toLowerCase();
                searchWorker.postMessage({ type: 'SEARCH', query: val });
            }
        }, 200)));

        // История поиска
        searchInput.addEventListener('focus', () => showSearchHistory(searchInput));
        searchInput.addEventListener('blur', () => setTimeout(hideSearchHistory, 200)); // Delay to allow click
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = searchInput.value.trim();
                if (val) saveSearchHistory(val);
                hideSearchHistory();
            }
        });
    }

    // 5. Регистрация PWA Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            // Уведомление о готовности к офлайн (только при первой установке)
            if (!navigator.serviceWorker.controller) {
                showToast('✅ Приложение готово к работе офлайн!');
            }

            const handleUpdate = (/** @type {ServiceWorker} */ worker) => {
                if (state.autoUpdate) {
                    worker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                    showUpdateNotification(worker);
                }
            };
            
            // Если обновление уже ждет (например, после перезагрузки страницы)
            if (reg.waiting) handleUpdate(reg.waiting);

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        handleUpdate(newWorker);
                    }
                });
            });
        }).catch(err => console.error('SW Registration Failed:', err));

        /** @type {boolean} */ let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }

    // 6. PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (/** @type {any} */ e) => {
        e.preventDefault();
        deferredPrompt = e;
        const btn = document.getElementById('install-app-btn');
        if (btn) btn.style.display = 'flex';
        
        // Показываем кастомный баннер
        showInstallBanner();
    });
}

// Сохранение перед закрытием
window.addEventListener('beforeunload', () => {
    immediateSaveState();
});

// Запуск
init().catch(e => {
    console.error("Init Error", e);
    if (e.name !== 'AbortError') showError("Ошибка инициализации: " + e.message);
});

// Expose functions used by inline HTML handlers (module scope is not global)
Object.assign(window, {
    openModal,
    closeModal,
    openConfirm,
    closeConfirm,
    exportProgress: () => import('./ui/ui_data.js').then(m => m.exportProgress()),
    saveAndRender,
    importProgress: (/** @type {Event} */ event) => import('./ui/ui_data.js').then(m => m.importProgress(event)),
    clearData: () => import('./ui/ui_data.js').then(m => m.clearData()),
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
    toggleAutoUpdate: (/** @type {HTMLInputElement} */ el) => {
        toggleAutoUpdate(el);
        // Если пользователь включил автообновление и есть ждущий апдейт — применяем сразу
        if (state.autoUpdate && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }
    },
    toggleFocusMode,
    toggleViewMode,
    toggleBackgroundMusic: (/** @type {HTMLInputElement} */ el) => {
        toggleBackgroundMusic(el);
    },
    setBackgroundMusicVolume,
    handleAuth,
    openProfileModal,
    handleChangePassword,
    handleLogout,
    toggleResetMode,
    togglePasswordVisibility,
    setAudioSpeed: (/** @type {string|number} */ val) => import('./ui/ui_settings.js').then(m => m.setAudioSpeed(val)),
    signInWithGoogle,
    speak,
    openLoginModal,
    openReviewMode: () => import('./ui/ui_review.js').then(m => m.openReviewMode()),
    openShopModal: () => import('./ui/ui_shop.js').then(m => m.openShopModal()),
    startDailyChallenge,
    quitQuiz,
    checkPronunciation: (/** @type {string} */ word, /** @type {HTMLElement} */ btn) => import('./core/speech.js').then(m => m.checkPronunciation(word, btn)),
    resetSearchHandler,
    runTests: () => import('../tests.js').then(m => m.runTests()),
    forceUpdateSW: async () => {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
            window.location.reload();
        }
    },
    installApp: async () => {
        dismissInstallBanner(); // Скрываем баннер при нажатии
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
            const btn = document.getElementById('install-app-btn');
            if (btn) btn.style.display = 'none';
        }
    },
    dismissInstallBanner
});
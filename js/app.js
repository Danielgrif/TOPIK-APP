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
import { toggleHanjaMode, toggleVoice, updateVoiceUI, toggleDarkMode, toggleAutoUpdate, applyTheme, toggleFocusMode, applyFocusMode, toggleBackgroundMusic, setBackgroundMusicVolume, applyBackgroundMusic } from './ui/ui_settings.js';

import { 
    handleAuth, openProfileModal, handleChangePassword, 
    handleLogout, toggleResetMode, togglePasswordVisibility, 
    signInWithGoogle, updateAuthUI, openLoginModal, cleanAuthUrl 
} from './core/auth.js'; 
import { debounce, showToast, speak } from './utils/utils.js';
import { renderTopicMastery, updateXPUI, updateStats, updateSRSBadge } from './core/stats.js';
import { startDailyChallenge, updateDailyChallengeUI, checkSuperChallengeNotification, quitQuiz } from './ui/quiz.js';

// --- Инициализация ---

const searchWorker = new Worker('js/workers/searchWorker.js');
const APP_VERSION = 'v56'; // Синхронизировано с sw.js
let deferredPrompt;

// --- Глобальный перехват ошибок ---
window.onerror = function(msg, url, line, col, error) {
    console.error('🚨 Global Error:', { msg, url, line, col, error });
    return false; // Позволяет ошибке всплыть дальше (в стандартную консоль)
};
window.onunhandledrejection = function(event) {
    console.error('🚨 Unhandled Rejection:', event.reason);
};

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
    client.auth.onAuthStateChange(async (event, session) => {
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

    // Отображение версии приложения в настройках
    const verEl = document.getElementById('app-version');
    if (verEl) verEl.textContent = `TOPIK Master ${APP_VERSION}`;

    // 4. Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const val = e.target.value.trim().toLowerCase();
            searchWorker.postMessage({ type: 'SEARCH', query: val });
        }, 200));

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

            const handleUpdate = (worker) => {
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
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        handleUpdate(newWorker);
                    }
                });
            });
        }).catch(err => console.error('SW Registration Failed:', err));

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }

    // 6. PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
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
    importProgress: (event) => import('./ui/ui_data.js').then(m => m.importProgress(event)),
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
    toggleAutoUpdate: (el) => {
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
    toggleBackgroundMusic: (el) => {
        toggleBackgroundMusic(el);
    },
    setBackgroundMusicVolume,
    handleAuth,
    openProfileModal,
    handleChangePassword,
    handleLogout,
    toggleResetMode,
    togglePasswordVisibility,
    setAudioSpeed: (val) => import('./ui/ui_settings.js').then(m => m.setAudioSpeed(val)),
    signInWithGoogle,
    speak,
    openLoginModal,
    openReviewMode: () => import('./ui/ui_review.js').then(m => m.openReviewMode()),
    openShopModal: () => import('./ui/ui_shop.js').then(m => m.openShopModal()),
    startDailyChallenge,
    quitQuiz,
    checkPronunciation: (word, btn) => import('./core/speech.js').then(m => m.checkPronunciation(word, btn)),
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
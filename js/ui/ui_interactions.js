import { state } from '../core/state.js';
import { setTypeFilter } from './ui_filters.js';
import { closeModal } from './ui_modal.js';
import { showToast, playTone } from '../utils/utils.js';

/**
 * Shows a notification when a Service Worker update is available.
 * @param {ServiceWorker} worker 
 */
export function showUpdateNotification(worker) {
    let el = document.getElementById('update-notification');
    if (!el) {
        el = document.createElement('div');
        el.id = 'update-notification';
        el.innerHTML = `
            <div style="font-weight:bold; font-size:14px;">🚀 Доступна новая версия</div>
            <button class="btn btn-quiz" id="update-btn" style="padding: 6px 14px; font-size:12px; border-radius:20px;">Обновить</button>
        `;
        document.body.appendChild(el);
        const btn = document.getElementById('update-btn');
        if (btn) btn.onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(() => el.classList.add('show'), 500);
}

/**
 * Sets up touch gestures for mobile interactions.
 */
export function setupGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        if (e.target) handleGesture(touchStartX, touchStartY, touchEndX, touchEndY, e.target);
    }, { passive: true });
}

/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {EventTarget} target
 */
function handleGesture(startX, startY, endX, endY, target) {
    const diffX = endX - startX;
    const diffY = endY - startY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const minSwipe = 60; // Порог срабатывания в пикселях

    // 1. Закрытие модального окна свайпом вниз
    const activeModal = document.querySelector('.modal.active');
    if (activeModal && target instanceof Node && activeModal.contains(target)) {
        const content = activeModal.querySelector('.modal-content');
        // Если свайп вниз, движение вертикальное и скролл контента в самом верху
        if (diffY > minSwipe && absY > absX * 1.5 && content && content.scrollTop <= 0) {
            closeModal(activeModal.id);
        }
        return;
    }

    // 2. Переключение вкладок (Слова <-> Грамматика) свайпом влево/вправо
    // Игнорируем, если свайп был по горизонтально прокручиваемым элементам (статистика)
    if (target instanceof Element && (target.closest('.stats-strip') || target.closest('.slider'))) return;

    if (absX > minSwipe && absX > absY * 1.5) {
        const btns = document.querySelectorAll('#type-filters .btn-filter');
        if (btns.length < 2) return;

        const s = /** @type {any} */ (state);
        if (diffX > 0 && s.currentType === 'grammar') {
            setTypeFilter('word', /** @type {HTMLElement} */ (btns[0])); // Свайп вправо -> Слова
            showToast('📖 Слова');
        } else if (diffX < 0 && s.currentType === 'word') {
            setTypeFilter('grammar', /** @type {HTMLElement} */ (btns[1])); // Свайп влево -> Грамматика
            showToast('📘 Грамматика');
        }
    }
}

/**
 * Hides bottom navigation on scroll.
 */
export function setupScrollBehavior() {
    const header = document.getElementById('main-header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        // Скрываем хедер при скролле вниз (>50px от верха), показываем при скролле вверх
        if (currentScrollY > lastScrollY && currentScrollY > 50) header.classList.add('hidden');
        else header.classList.remove('hidden');
        lastScrollY = currentScrollY;
    }, { passive: true });
}

/**
 * Saves a search query to history.
 * @param {string} query 
 */
export function saveSearchHistory(query) {
    if (!query || query.length < 2) return;
    
    const s = /** @type {any} */ (state);
    // Удаляем дубликат, если есть, чтобы переместить в начало
    s.searchHistory = s.searchHistory.filter((/** @type {string} */ q) => q !== query);
    
    // Добавляем в начало
    s.searchHistory.unshift(query);
    
    // Ограничиваем длину (5 элементов)
    if (s.searchHistory.length > 5) s.searchHistory = s.searchHistory.slice(0, 5);
    
    localStorage.setItem('search_history_v1', JSON.stringify(s.searchHistory));
}

/**
 * Renders the search history dropdown.
 * @param {HTMLInputElement} inputEl 
 */
export function showSearchHistory(inputEl) {
    const s = /** @type {any} */ (state);
    if (!s.searchHistory || s.searchHistory.length === 0) return;
    
    let dropdown = document.getElementById('search-history-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'search-history-dropdown';
        dropdown.className = 'search-history-dropdown';
        if (inputEl.parentNode) inputEl.parentNode.appendChild(dropdown); // Append to toolbar container
    }
    
    dropdown.innerHTML = '';
    
    s.searchHistory.forEach((/** @type {string} */ q) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span style="opacity:0.5;">🕒</span> ${q}`;
        
        item.onmousedown = (e) => {
            e.preventDefault(); // Prevent blur on input
            inputEl.value = q;
            inputEl.dispatchEvent(new Event('input')); // Trigger search
            hideSearchHistory();
        };
        
        // Кнопка удаления
        const delBtn = document.createElement('span');
        delBtn.innerHTML = '✕';
        delBtn.className = 'history-del';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            s.searchHistory = s.searchHistory.filter((/** @type {string} */ x) => x !== q);
            localStorage.setItem('search_history_v1', JSON.stringify(s.searchHistory));
            showSearchHistory(inputEl); // Re-render
            if (s.searchHistory.length === 0) hideSearchHistory();
        };
        
        item.appendChild(delBtn);
        dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
}

export function hideSearchHistory() {
    const dropdown = document.getElementById('search-history-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * Shows the PWA install banner if not dismissed.
 */
export function showInstallBanner() {
    // Не показываем, если пользователь уже закрыл его ранее
    if (localStorage.getItem('pwa_banner_dismissed_v1')) return;
    
    const banner = document.getElementById('install-banner');
    if (banner) {
        // Показываем с задержкой, чтобы не перегружать пользователя сразу при входе
        setTimeout(() => banner.classList.add('show'), 4000);
    }
}

/**
 * Dismisses the PWA install banner.
 */
export function dismissInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('show');
    localStorage.setItem('pwa_banner_dismissed_v1', 'true');
}

/**
 * Shows the Level Up animation overlay.
 * @param {number} level 
 */
export function showLevelUpAnimation(level) {
    const overlay = document.getElementById('level-up-overlay');
    const valEl = document.getElementById('level-up-val');
    if (!overlay || !valEl) return;

    valEl.textContent = String(level);
    overlay.classList.add('active');
    playTone('success', 300);
    
    // @ts-ignore
    if (typeof confetti === 'function') {
        // @ts-ignore
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, zIndex: 20020 });
    }
}
import { state } from '../core/state.js';
import { showToast, speak } from '../utils/utils.js';
import { scheduleSaveState, recordAttempt, immediateSaveState } from '../core/db.js';
import { addXP, checkAchievements, calculateOverallAccuracy, updateStats, updateSRSBadge } from '../core/stats.js';
import { openModal, closeModal, openConfirm } from './ui_modal.js';
import { render } from './ui_card.js';
import { client } from '../core/supabaseClient.js';
import { syncGlobalStats } from '../core/sync.js';
import { checkAndShowOnboarding } from './ui_onboarding.js';
export { ensureSessionStarted, toggleSessionTimer, endSession } from '../core/session.js';

/**
 * Saves state to DB/LocalStorage and re-renders the UI.
 */
export function saveAndRender() {
    scheduleSaveState();
    updateSRSBadge();
    updateStats();
    render();
    // setupScrollObserver is called inside render in ui_card.js
}


/**
 * Plays audio for a word and handles TTS fallback.
 * @param {Object} word 
 * @returns {Promise<void>}
 */
export function playAndSpeak(word) { 
    return new Promise((resolve) => {
        try {
            try { window.speechSynthesis.cancel(); } catch(e){}
            let text = (word && (word.word_kr || word.translation)) ? (word.word_kr) : '';
            let url = word.audio_url;
            if (state.currentVoice === 'male' && word.audio_male) url = word.audio_male;
            if (text) speak(text, url).then(resolve); else resolve();
        } catch (e) { console.warn('playAndSpeak error', e); resolve(); }
    });
}

/**
 * Toggles between Grid and List view modes.
 * @param {string} mode - 'grid' or 'list'.
 */
export function toggleViewMode(mode) {
    if (state.viewMode === mode) return;
    state.viewMode = mode;
    localStorage.setItem('view_mode_v1', mode);
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    render();
}

export function shuffleWords() { state.dataStore.sort(() => Math.random() - 0.5); render(); }

/** @param {string} m */
export function showError(m) { document.getElementById('error-msg').innerText = m; document.getElementById('error-overlay').style.display = 'flex'; }

/**
 * Enables keyboard navigation for quiz options.
 * @param {HTMLElement} container 
 */
export function enableQuizKeyboard(container) {
    if (!container) return;
    
    // FIX: Удаляем старый слушатель, чтобы избежать дублирования событий
    if (container._keyHandler) {
        container.removeEventListener('keydown', container._keyHandler);
        container._keyHandler = null;
    }

    const options = Array.from(container.querySelectorAll('.quiz-option'));
    // if (!options.length) return; // Allow keyboard even if no options (for text inputs)
    let idx = -1;
    options.forEach((o,i) => { o.tabIndex = 0; o.dataset._qi = i; o.classList.remove('selected'); });
    function update() { options.forEach((o,i) => o.classList.toggle('selected', i === idx)); try { if (idx >= 0) options[idx].focus(); } catch(e){} }
    function onKey(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { idx = idx < 0 ? 0 : (idx + 1) % options.length; update(); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { idx = idx < 0 ? options.length - 1 : (idx - 1 + options.length) % options.length; update(); e.preventDefault(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (idx >= 0) options[idx].click(); }
    }
    // FIX: Не перехватывать пробел, если фокус в поле ввода
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    container.addEventListener('keydown', onKey);
    container._keyHandler = onKey; // Сохраняем ссылку для удаления
    options.forEach((o) => o.addEventListener('click', () => { options.forEach(x => x.classList.remove('selected')); }));
    container.tabIndex = 0;
}

/**
 * Sorts the word list by accuracy (weakest first).
 */
export function sortByWeakWords() {
    const sortedCopy = [...state.dataStore].sort((a, b) => {
        const getAcc = (id) => {
             const stats = state.wordHistory[id] || { attempts: 0, correct: 0 };
             if (stats.attempts === 0) return 0;
             return (stats.correct / stats.attempts);
        };
        const accA = getAcc(a.id);
        const accB = getAcc(b.id);
        
        if (accA !== accB) return accA - accB;
        const attA = state.wordHistory[a.id]?.attempts || 0;
        const attB = state.wordHistory[b.id]?.attempts || 0;
        if (attA !== attB) return attB - attA;
        return (a.word_kr || '').localeCompare(b.word_kr || '');
    });
    state.dataStore = sortedCopy;
    render();
}
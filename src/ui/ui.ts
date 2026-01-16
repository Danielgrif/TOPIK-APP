import { state } from '../core/state.ts';
import { showToast, speak } from '../utils/utils.ts';
import { scheduleSaveState, recordAttempt, immediateSaveState } from '../core/db.ts';
// @ts-ignore
import { addXP, checkAchievements, calculateOverallAccuracy, updateStats, updateSRSBadge } from '../core/stats.ts';
import { openModal, closeModal, openConfirm } from './ui_modal.ts';
import { render } from './ui_card.ts';
import { client } from '../core/supabaseClient.ts';
import { syncGlobalStats } from '../core/sync.ts'; // Ensure sync.ts is in core/
import { checkAndShowOnboarding } from './ui_onboarding.ts';
// @ts-ignore
export { ensureSessionStarted, toggleSessionTimer, endSession } from '../core/session.ts';
import { Word } from '../types/index.ts';

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
 */
export function playAndSpeak(word: Word | any): Promise<void> { 
    return new Promise((resolve) => {
        try {
            try { window.speechSynthesis.cancel(); } catch(e){}
            let text = (word && (word.word_kr || word.translation)) ? (word.word_kr) : '';
            let url = word.audio_url;
            // @ts-ignore
            if (state.currentVoice === 'male' && word.audio_male) url = word.audio_male;
            if (text) speak(text, url).then(resolve); else resolve();
        } catch (e) { console.warn('playAndSpeak error', e); resolve(); }
    });
}

/**
 * Toggles between Grid and List view modes.
 * @param {string} mode - 'grid' or 'list'.
 */
export function toggleViewMode(mode: string) {
    if (state.viewMode === mode) return;
    state.viewMode = mode;
    localStorage.setItem('view_mode_v1', mode);
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode));
    render();
}

export function shuffleWords() { 
    state.dataStore.sort(() => Math.random() - 0.5); 
    render(); 
}

export function showError(m: string) { 
    const msg = document.getElementById('error-msg');
    if (msg) msg.innerText = m; 
    const overlay = document.getElementById('error-overlay');
    if (overlay) overlay.style.display = 'flex'; 
}

/**
 * Enables keyboard navigation for quiz options.
 */
export function enableQuizKeyboard(container: HTMLElement) {
    if (!container) return;
    
    // FIX: Удаляем старый слушатель, чтобы избежать дублирования событий
    if ((container as any)._keyHandler) {
        container.removeEventListener('keydown', (container as any)._keyHandler);
        (container as any)._keyHandler = null;
    }

    const options = Array.from(container.querySelectorAll('.quiz-option')).map(el => el as HTMLElement);
    // if (!options.length) return; // Allow keyboard even if no options (for text inputs)
    let idx = -1;
    options.forEach((o,i) => { o.tabIndex = 0; o.dataset._qi = String(i); o.classList.remove('selected'); });
    function update() { options.forEach((o,i) => o.classList.toggle('selected', i === idx)); try { if (idx >= 0) options[idx].focus(); } catch(e){} }
    function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { idx = idx < 0 ? 0 : (idx + 1) % options.length; update(); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { idx = idx < 0 ? options.length - 1 : (idx - 1 + options.length) % options.length; update(); e.preventDefault(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (idx >= 0) options[idx].click(); }
    }
    // FIX: Не перехватывать пробел, если фокус в поле ввода
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    container.addEventListener('keydown', onKey);
    (container as any)._keyHandler = onKey; // Сохраняем ссылку для удаления
    options.forEach((o) => o.addEventListener('click', () => { options.forEach(x => x.classList.remove('selected')); }));
    container.tabIndex = 0;
}

/**
 * Sorts the word list by accuracy (weakest first).
 */
export function sortByWeakWords() {
    const sortedCopy = [...state.dataStore].sort((a, b) => {
        const getAcc = (id: string | number) => {
             const stats = state.wordHistory[id] || { attempts: 0, correct: 0 };
             if (stats.attempts === 0) return 0;
             return (stats.correct / stats.attempts);
        };
        const accA = getAcc(a.id);
        const accB = getAcc(b.id);
        
        if (accA !== accB) return accA - accB;
        const attA = state.wordHistory[a.id]?.attempts || 0;
        const attB = state.wordHistory[b.id]?.attempts || 0;
        return (a.word_kr || '').localeCompare(b.word_kr || '');
    });
    state.dataStore = sortedCopy;
    render();
}
import { state } from '../core/state.js';
import { openModal } from './ui_modal.js';

/**
 * Opens the Hanja Explorer modal for a specific character.
 * @param {string} char - The Hanja character to explore.
 */
export function openHanjaModal(char) {
    const container = document.getElementById('hanja-list');
    const title = document.getElementById('hanja-title');
    if (!container || !title) return;

    title.textContent = `Иероглиф "${char}"`;
    container.innerHTML = '';

    // Find words containing this Hanja character
    const relatedWords = state.dataStore.filter(w => 
        w.word_hanja && w.word_hanja.includes(char)
    );

    if (relatedWords.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-sub);">Нет других слов с этим иероглифом.</div>';
    } else {
        relatedWords.forEach(w => {
            const el = document.createElement('div');
            el.className = 'hanja-word-item';
            el.innerHTML = `
                <div style="font-weight:bold; font-size:16px;">${w.word_kr}</div>
                <div style="color:var(--primary); font-weight:600;">${w.word_hanja}</div>
                <div style="color:var(--text-sub); font-size:13px;">${w.translation}</div>
            `;
            container.appendChild(el);
        });
    }

    openModal('hanja-modal');
}

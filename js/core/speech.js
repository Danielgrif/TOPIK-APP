import { showToast, levenshtein } from '../utils/utils.js';

/** @type {any} */
let recognition = null;

/**
 * Initializes the SpeechRecognition API.
 * @returns {SpeechRecognition|null}
 */
function getRecognition() {
    if (recognition) return recognition;

    const SpeechRecognition = /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('❌ Распознавание речи не поддерживается в этом браузере.');
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR'; // Set language to Korean
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return recognition;
}

/**
 * Starts a pronunciation check for a given word.
 * @param {string} correctWord - The correct Korean word to match against.
 * @param {HTMLElement} [btn] - The button that triggered the check, for UI feedback.
 * @param {Function} [onResult] - Optional callback for quiz mode (similarity, text).
 */
export function checkPronunciation(correctWord, btn, onResult) {
    const rec = getRecognition();
    if (!rec) return;

    // Stop any previous recognition to prevent overlap
    try { rec.stop(); } catch(e) {}

    if (btn) {
        btn.textContent = '🎤';
        /** @type {HTMLButtonElement} */ (btn).disabled = true;
    }
    showToast('🎤 Говорите...');

    rec.onresult = (/** @type {any} */ event) => {
        if (!event.results || !event.results[0] || !event.results[0][0]) return;
        const spokenText = event.results[0][0].transcript.trim();
        
        const normalize = (/** @type {string} */ s) => s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s+/g, "");
        const spokenNorm = normalize(spokenText);
        const correctNorm = normalize(correctWord);

        const distance = levenshtein(spokenNorm, correctNorm);
        const similarity = Math.max(0, Math.round((1 - distance / Math.max(1, spokenNorm.length, correctNorm.length)) * 100));

        const feedback = `Вы сказали: "${spokenText}"`;
        const toastMessage = similarity < 60 ? `🤔 ${similarity}% | ${feedback}` : `✅ ${similarity}% | ${feedback}`;
        
        showToast(toastMessage, 5000);
        
        if (onResult) onResult(similarity, spokenText);
    };

    rec.onerror = (/** @type {any} */ event) => {
        let errorMessage = 'Ошибка распознавания';
        if (event.error === 'no-speech') errorMessage = 'Не удалось распознать речь. Попробуйте снова.';
        else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') errorMessage = 'Доступ к микрофону запрещен.';
        showToast(`❌ ${errorMessage}`);
        console.error('Speech recognition error:', event.error);
        if (onResult) onResult(0, ''); // Fail callback
    };

    rec.onend = () => {
        if (btn) { btn.textContent = '🗣️'; /** @type {HTMLButtonElement} */ (btn).disabled = false; }
    };

    rec.start();
}
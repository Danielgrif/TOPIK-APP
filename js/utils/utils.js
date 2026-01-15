import { state } from '../core/state.js';

/**
 * Creates a debounced function that delays invoking `fn` until after `wait` milliseconds.
 * @param {Function} fn - The function to debounce.
 * @param {number} [wait=200] - The number of milliseconds to delay.
 * @returns {Function}
 */
export function debounce(fn, wait = 200) {
    let t;
    return function(...args) {
        const ctx = this;
        clearTimeout(t);
        t = setTimeout(() => fn.apply(ctx, args), wait);
    };
}

/**
 * Displays a toast notification.
 * @param {string} msg - The message to display.
 * @param {number} [timeout=3500] - Duration in ms.
 */
export function showToast(msg, timeout = 3500) {
    try {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast-item';
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => { el.classList.add('toast-hide'); }, Math.max(1200, timeout - 600));
        setTimeout(() => { try { container.removeChild(el); } catch(e){} }, timeout);
    } catch (e) { console.warn('showToast error', e); }
}

/**
 * Shows a combo effect popup (e.g. for Sprint mode).
 * @param {string} text - The text to display.
 */
export function showComboEffect(text) {
    const el = document.createElement('div');
    el.className = 'effect-popup show';
    el.innerText = text;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, 800);
}

/**
 * Parses a bilingual string like "Topic (Тема)" into parts.
 * @param {string} str 
 * @returns {{kr: string, ru: string}}
 */
export function parseBilingualString(str) {
    if (!str || typeof str !== 'string') return { kr: '기타', ru: 'Общее' };
    const match = str.match(/^(.*?)\s*[\(（]([^)）]+)[\)）]$/);
    if (match) return { ru: match[1].trim(), kr: match[2].trim() };
    return { ru: str, kr: str };
}

/**
 * Calculates Levenshtein distance between two strings.
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
export function levenshtein(a, b) {
    const tmp = [];
    if (a.length === 0) { return b.length; }
    if (b.length === 0) { return a.length; }
    for (let i = 0; i <= b.length; i++) { tmp[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { tmp[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            tmp[i][j] = (b.charAt(i - 1) === a.charAt(j - 1)) ? tmp[i - 1][j - 1] : Math.min(tmp[i - 1][j - 1] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j] + 1);
        }
    }
    return tmp[b.length][a.length];
}

/**
 * Generates HTML showing differences between user input and correct answer.
 * @param {string} user 
 * @param {string} correct 
 * @returns {string} HTML string
 */
export function generateDiffHtml(user, correct) {
    let html = '';
    const len = Math.max(user.length, correct.length);
    for (let i = 0; i < len; i++) {
        const u = user[i];
        const c = correct[i];
        if (u === c) {
            html += `<span class="diff-same">${u}</span>`;
        } else {
            if (u !== undefined) html += `<span class="diff-del">${u}</span>`;
            if (c !== undefined) html += `<span class="diff-ins">${c}</span>`;
        }
    }
    return html;
}

let _audioCtx = null;
let _osc = null;
function _ensureAudio() {
    try {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        return _audioCtx;
    } catch (e) { return null; }
}

/**
 * Plays a synthesized tone using Web Audio API.
 * @param {'success'|'failure'|'survival-success'} [type='success'] 
 * @param {number} [duration=120] 
 * @returns {Promise<void>}
 */
export function playTone(type = 'success', duration = 120) {
    return new Promise((resolve) => {
        try {
            const ctx = _ensureAudio();
            if (!ctx) return resolve();
            try { if (_osc) _osc.stop(); } catch(e){}
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            
            const now = ctx.currentTime;
            if (type === 'success') {
                o.type = 'sine';
                o.frequency.setValueAtTime(587, now);
                o.frequency.exponentialRampToValueAtTime(1174, now + 0.1);
                g.gain.setValueAtTime(0.1, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            } else if (type === 'survival-success') {
                o.type = 'square';
                o.frequency.setValueAtTime(880, now);
                o.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
                g.gain.setValueAtTime(0.05, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            } else if (type === 'life-lost') {
                o.type = 'triangle';
                o.frequency.setValueAtTime(300, now);
                o.frequency.exponentialRampToValueAtTime(50, now + 0.4);
                g.gain.setValueAtTime(0.3, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            } else {
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(200, now);
                o.frequency.linearRampToValueAtTime(50, now + 0.15);
                g.gain.setValueAtTime(0.1, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            }

            o.start();
            _osc = o;
            setTimeout(() => {
                try { o.stop(); } catch(e){}
                _osc = null; resolve();
            }, duration);
        } catch (e) { resolve(); }
    });
}

/**
 * Speaks text using TTS (Audio URL or SpeechSynthesis).
 * @param {string} t - Text to speak.
 * @param {string|null} url - URL to audio file (optional).
 * @returns {Promise<void>}
 */
export function speak(t, url) {
    // Приглушаем музыку в начале
    import('../ui/ui_settings.js').then(m => m.duckBackgroundMusic(true));

    const promise = new Promise((resolve) => {
        if (url) {
            const audio = new Audio(url);
            audio.onended = resolve;
            audio.onerror = () => {
                // При ошибке файла пробуем озвучить через TTS
                if (t) {
                    speak(t, null).then(resolve);
                } else {
                    showToast('Ошибка аудио файла');
                    resolve();
                }
            };
            audio.play().catch(e => {
                console.warn('Audio play error', e);
                if (t) {
                    speak(t, null).then(resolve);
                } else {
                    showToast('Ошибка аудио файла');
                    resolve();
                }
            });
            return;
        }

        if (!t) { resolve(); return; }
        if (!('speechSynthesis' in window)) { showToast('Голосовой вывод недоступен в этом браузере'); resolve(); return; }

        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(t);
            u.lang = 'ko-KR';
            u.rate = state.audioSpeed || 0.9;
            u.onend = resolve;
            u.onerror = (e) => {
                console.warn('SpeechSynthesis error', e);
                resolve(); // Всегда разрешаем промис, чтобы восстановить громкость
            };
            window.speechSynthesis.speak(u);
        } catch (e) {
            console.warn('SpeechSynthesis error', e);
            showToast('Ошибка голосового воспроизведения');
            resolve();
        }
    });

    // Когда озвучка завершена (успешно или с ошибкой), восстанавливаем громкость
    promise.finally(() => {
        import('../ui/ui_settings.js').then(m => m.duckBackgroundMusic(false));
    });

    return promise;
}
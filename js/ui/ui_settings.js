import { state } from '../core/state.js';
import { showToast } from '../utils/utils.js';
import { render, setupScrollObserver } from './ui_card.js';
import { scheduleSaveState } from '../core/db.js';

const THEME_COLORS = {
    purple: '#6c5ce7',
    blue: '#0984e3',
    green: '#00b894',
    orange: '#e17055',
    pink: '#e84393'
};

/**
 * @param {HTMLInputElement} el
 */
export function toggleHanjaMode(el) { 
    const s = /** @type {any} */ (state);
    if (el && el.type === 'checkbox') s.hanjaMode = el.checked;
    else s.hanjaMode = !s.hanjaMode;
    localStorage.setItem('hanja_mode_v1', String(s.hanjaMode));
    render(); 
    scheduleSaveState();
}

/**
 * @param {HTMLElement} btn
 */
export function toggleVoice(btn) { 
    const s = /** @type {any} */ (state);
    s.currentVoice = s.currentVoice === 'female' ? 'male' : 'female'; 
    localStorage.setItem('voice_pref', s.currentVoice); 
    updateVoiceUI(); 
    showToast(`Голос: ${s.currentVoice === 'female' ? 'Женский' : 'Мужской'}`); 
    scheduleSaveState();
}

export function updateVoiceUI() { 
    const s = /** @type {any} */ (state);
    const btn = document.getElementById('voice-setting-btn'); 
    if (btn) btn.textContent = s.currentVoice === 'female' ? '👩 Женский' : '👨 Мужской'; 
}

/**
 * @param {string|number} val
 */
export function setAudioSpeed(val) {
    const s = /** @type {any} */ (state);
    s.audioSpeed = typeof val === 'string' ? parseFloat(val) : val;
    localStorage.setItem('audio_speed_v1', String(s.audioSpeed));
    const el = document.getElementById('speed-val');
    if (el) el.textContent = s.audioSpeed + 'x';
    scheduleSaveState();
}

export function toggleDarkMode() {
    const s = /** @type {any} */ (state);
    s.darkMode = !s.darkMode;
    localStorage.setItem('dark_mode_v1', String(s.darkMode));
    applyTheme();
    scheduleSaveState();
}

/**
 * @param {HTMLInputElement} el
 */
export function toggleAutoUpdate(el) {
    const s = /** @type {any} */ (state);
    s.autoUpdate = el.checked;
    localStorage.setItem('auto_update_v1', String(s.autoUpdate));
    showToast(`Автообновление: ${s.autoUpdate ? 'ВКЛ' : 'ВЫКЛ'}`);
    scheduleSaveState();
}

export function applyTheme() {
    const s = /** @type {any} */ (state);
    if (s.darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    
    const icon = s.darkMode ? '🌙' : '☀️';

    const btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.textContent = icon;

    const headerBtn = document.getElementById('header-dark-mode-toggle');
    if (headerBtn) headerBtn.textContent = icon;
    
    applyAccentColor();
}

/**
 * @param {string} colorKey
 */
export function setAccentColor(colorKey) {
    // @ts-ignore
    if (!THEME_COLORS[colorKey]) return;
    const s = /** @type {any} */ (state);
    s.themeColor = colorKey;
    localStorage.setItem('theme_color_v1', colorKey);
    applyAccentColor();
    scheduleSaveState();
}

export function applyAccentColor() {
    const s = /** @type {any} */ (state);
    // @ts-ignore
    const color = THEME_COLORS[s.themeColor] || THEME_COLORS.purple;
    document.documentElement.style.setProperty('--primary', color);
    // Update active state in UI if selector exists
    document.querySelectorAll('.color-option').forEach(btn => {
        if (btn instanceof HTMLElement) btn.classList.toggle('active', btn.dataset.color === s.themeColor);
    });
}

/**
 * @param {HTMLInputElement} el
 */
export function toggleFocusMode(el) {
    const s = /** @type {any} */ (state);
    if (el && el.type === 'checkbox') s.focusMode = el.checked;
    else s.focusMode = !s.focusMode;
    
    localStorage.setItem('focus_mode_v1', String(s.focusMode));
    applyFocusMode();
    showToast(`Режим фокусировки: ${s.focusMode ? 'ВКЛ' : 'ВЫКЛ'}`);
}

export function applyFocusMode() {
    const s = /** @type {any} */ (state);
    if (s.focusMode) {
        document.body.classList.add('focus-mode');
        document.documentElement.classList.add('focus-mode');
    } else {
        document.body.classList.remove('focus-mode');
        document.documentElement.classList.remove('focus-mode');
    }
    
    const mainBtn = document.getElementById('focus-mode-btn');
    if (mainBtn) mainBtn.classList.toggle('active', s.focusMode);
}

/**
 * Toggles background music on/off.
 * @param {HTMLInputElement} [el] - The checkbox element.
 */
export function toggleBackgroundMusic(el) {
    const s = /** @type {any} */ (state);
    if (el && el.type === 'checkbox') s.backgroundMusicEnabled = el.checked;
    else s.backgroundMusicEnabled = !s.backgroundMusicEnabled;
    localStorage.setItem('background_music_enabled_v1', String(s.backgroundMusicEnabled));
    applyBackgroundMusic();
    showToast(`Музыка: ${s.backgroundMusicEnabled ? 'ВКЛ' : 'ВЫКЛ'}`);
    scheduleSaveState();
}

/**
 * Populates the music track selection dropdown.
 */
export function populateMusicTrackSelect() {
    const selectEl = document.getElementById('background-music-select');
    if (!selectEl) return;
    const s = /** @type {any} */ (state);

    selectEl.innerHTML = ''; // Clear existing options
    s.MUSIC_TRACKS.forEach((/** @type {any} */ track) => {
        const option = document.createElement('option');
        option.value = track.filename;
        option.textContent = track.name;
        option.title = track.description; // Add description as tooltip
        if (track.filename === s.backgroundMusicTrack) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    });
}

let activePlayerId = 'a';
let hasInteracted = false;
/** @type {any} */
let volumeAnimationInterval = null; // Единый интервал для всех анимаций громкости

/**
 * Applies the background music setting (plays/pauses).
 * @param {boolean} [forcePlay=false] - If true, forces play regardless of state.backgroundMusicEnabled.
 */
export function applyBackgroundMusic(forcePlay = false) {
    const s = /** @type {any} */ (state);
    // Плавное включение громкости при первом взаимодействии
    if (!hasInteracted && s.backgroundMusicEnabled && forcePlay) {
        hasInteracted = true; // Флаг, чтобы это сработало только один раз
        const activePlayer = /** @type {HTMLAudioElement} */ (document.getElementById(activePlayerId === 'a' ? 'music-player-a' : 'music-player-b'));
        if (activePlayer && activePlayer.volume < s.backgroundMusicVolume) {
            crossfade(activePlayer, null, s.backgroundMusicVolume, activePlayer.volume);
        }
    }
    const playerA = /** @type {HTMLAudioElement} */ (document.getElementById('music-player-a'));
    const playerB = /** @type {HTMLAudioElement} */ (document.getElementById('music-player-b'));
    if (!playerA || !playerB) return;

    // Определяем, какой трек должен играть
    let trackId = 'default';
    const isQuizActive = document.getElementById('quiz-game') && document.getElementById('quiz-game').style.display === 'block';

    if (isQuizActive) {
        trackId = 'quiz';
    }
    
    const targetTrackFilename = s.MUSIC_TRACKS.find((/** @type {any} */ t) => t.id === trackId)?.filename;
    if (!targetTrackFilename) return console.warn(`Музыкальный трек для ID "${trackId}" не найден.`);
    
    const targetSrc = `./audio/${targetTrackFilename}`;
    const activePlayer = activePlayerId === 'a' ? playerA : playerB;
    const inactivePlayer = activePlayerId === 'a' ? playerB : playerA;

    // Если музыка выключена, просто останавливаем оба плеера
    if (!s.backgroundMusicEnabled && !forcePlay) {
        crossfade(activePlayer, inactivePlayer, 0, 0); // Fade out both
        return;
    }

    // Если трек не меняется, просто убеждаемся, что он играет
    // FIX: Декодируем src, так как браузер кодирует пробелы (%20), а в имени файла их нет
    if (decodeURIComponent(activePlayer.src).includes(targetTrackFilename) && !activePlayer.paused) {
        activePlayer.volume = s.backgroundMusicVolume; // Обновляем громкость на всякий случай
        return;
    }

    // Если трек меняется, запускаем кроссфейд
    if (!decodeURIComponent(activePlayer.src).includes(targetTrackFilename)) {
        inactivePlayer.src = targetSrc;
        inactivePlayer.volume = 0; // Начинаем с нулевой громкости
        inactivePlayer.play().then(() => {
            crossfade(inactivePlayer, activePlayer, s.backgroundMusicVolume, 0);
            // Меняем активный плеер
            activePlayerId = (activePlayerId === 'a') ? 'b' : 'a';
        }).catch(e => {
            if (e.name !== 'AbortError') console.warn('Music play failed:', e);
        });
    } else { // Если трек тот же, но был на паузе
        // Плавное появление (Fade In) если трек был на паузе
        if (activePlayer.paused) {
            activePlayer.volume = 0;
            activePlayer.play().then(() => {
                crossfade(activePlayer, null, s.backgroundMusicVolume, 0);
            }).catch(e => {
                if (e.name !== 'AbortError') console.warn('Music play failed:', e);
            });
        } else {
            activePlayer.volume = s.backgroundMusicVolume;
        }
    }
}

/**
 * @param {HTMLAudioElement} fadeInPlayer
 * @param {HTMLAudioElement|null} fadeOutPlayer
 * @param {number} finalVolume
 * @param {number} [startVolume]
 */
function crossfade(fadeInPlayer, fadeOutPlayer, finalVolume, startVolume) {
    if (volumeAnimationInterval) {
        clearInterval(volumeAnimationInterval);
    }
    
    let stepCount = 0;
    const totalSteps = 20;
    const initialFadeInVol = startVolume !== undefined ? startVolume : fadeInPlayer.volume;
    const initialFadeOutVol = fadeOutPlayer ? fadeOutPlayer.volume : 0;

    volumeAnimationInterval = setInterval(() => {
        stepCount++;
        const progress = stepCount / totalSteps;

        // Рассчитываем текущую громкость на основе прогресса (линейная интерполяция)
        fadeInPlayer.volume = initialFadeInVol + (finalVolume - initialFadeInVol) * progress;
        if (fadeOutPlayer) {
            // Цель для fadeOut всегда 0
            fadeOutPlayer.volume = initialFadeOutVol + (0 - initialFadeOutVol) * progress;
        }

        if (stepCount >= totalSteps) {
            fadeInPlayer.volume = finalVolume; // Устанавливаем точное конечное значение
            if (fadeOutPlayer) {
                fadeOutPlayer.volume = 0;
                fadeOutPlayer.pause();
            }
            if (volumeAnimationInterval) clearInterval(volumeAnimationInterval);
            volumeAnimationInterval = null;
        }
    }, 50); // 50ms * 20 steps = 1 second duration
}

/**
 * @param {string|number} val
 */
export function setBackgroundMusicVolume(val) {
    const s = /** @type {any} */ (state);
    s.backgroundMusicVolume = typeof val === 'string' ? parseFloat(val) : val;
    localStorage.setItem('background_music_volume_v1', String(s.backgroundMusicVolume));
    const el = document.getElementById('background-music-volume-val');
    if (el) el.textContent = `${Math.round(s.backgroundMusicVolume * 100)}%`;
    // FIX: Передаем true, чтобы музыка включилась, если была выключена, но громкость меняют
    applyBackgroundMusic(true);
    scheduleSaveState();
}

/**
 * Temporarily lowers or restores the background music volume (audio ducking).
 * @param {boolean} duck - True to lower volume, false to restore.
 */
export function duckBackgroundMusic(duck) {
    const s = /** @type {any} */ (state);
    const activePlayer = /** @type {HTMLAudioElement} */ (document.getElementById(activePlayerId === 'a' ? 'music-player-a' : 'music-player-b'));
    if (!activePlayer || !s.backgroundMusicEnabled || activePlayer.paused) return;

    if (volumeAnimationInterval) {
        clearInterval(volumeAnimationInterval);
    }

    const targetVolume = duck ? s.backgroundMusicVolume * 0.2 : s.backgroundMusicVolume;
    const startVolume = activePlayer.volume;
    
    if (Math.abs(startVolume - targetVolume) < 0.01) return;

    let stepCount = 0;
    const totalSteps = 10;

    volumeAnimationInterval = setInterval(() => {
        stepCount++;
        const progress = stepCount / totalSteps;
        
        activePlayer.volume = startVolume + (targetVolume - startVolume) * progress;

        if (stepCount >= totalSteps) {
            activePlayer.volume = targetVolume;
            if (volumeAnimationInterval) clearInterval(volumeAnimationInterval);
            volumeAnimationInterval = null;
        }
    }, 20);
}
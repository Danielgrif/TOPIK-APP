import { state } from '../core/state.js';
import { updateVoiceUI } from './ui_settings.js';

let lastFocusedElement = null;
let _confirmHandler = null;

export function openModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    
    // Init speed slider if settings modal
    if (modalId === 'profile-modal') {
        const slider = document.getElementById('speed-slider');
        if (slider) { 
            slider.value = state.audioSpeed || 0.9; 
            document.getElementById('speed-val').textContent = slider.value + 'x'; 
        }
        const hanjaCheck = document.getElementById('hanja-setting-check');
        if (hanjaCheck) hanjaCheck.checked = state.hanjaMode;
        const darkModeCheck = document.getElementById('dark-mode-toggle-switch');
        if (darkModeCheck) darkModeCheck.checked = state.darkMode;
        const autoUpdateCheck = document.getElementById('auto-update-check');
        if (autoUpdateCheck) autoUpdateCheck.checked = state.autoUpdate;
        
        const musicCheck = document.getElementById('background-music-check');
        if (musicCheck) musicCheck.checked = state.backgroundMusicEnabled;
        const musicVolumeSlider = document.getElementById('background-music-volume-slider');
        if (musicVolumeSlider) musicVolumeSlider.value = state.backgroundMusicVolume;
        
        // FIX: Не вызываем setBackgroundMusicVolume, так как это триггерит логику аудио и сохранение.
        // Просто обновляем текст.
        const volText = document.getElementById('background-music-volume-val');
        if (volText) volText.textContent = `${Math.round(state.backgroundMusicVolume * 100)}%`;
        
        updateVoiceUI();
    }
    
    try { lastFocusedElement = document.activeElement; } catch (e) { lastFocusedElement = null; }
    if (modalId === 'stats-modal') {
        // Init stats color picker based on current theme
        const picker = document.getElementById('stats-theme-picker');
        if (picker) {
            const btns = picker.querySelectorAll('.stats-color-btn');
            btns.forEach(b => b.classList.remove('active'));
            const activeBtn = picker.querySelector(`[data-color="${state.themeColor}"]`) || btns[0];
            if (activeBtn) activeBtn.classList.add('active');
        }
        import('../core/stats.js').then(m => {
            m.updateStats();
            m.renderTopicMastery();
            m.renderDetailedStats();
            m.renderActivityChart();
            m.renderLearnedChart();
            m.renderForgettingCurve();
            m.renderSRSDistributionChart();
        });
    }
    if (modalId === 'achievements-modal') {
        import('../core/stats.js').then(m => m.renderAchievements());
    }
    if (modalId === 'quiz-modal') {
        import('./quiz.js').then(m => {
            m.buildQuizModes();
            m.updateQuizCount();
        });
    }
    modalEl.classList.add('active');
}

export function closeModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
        modalEl.classList.remove('active');
        // Refresh badges when closing modals (especially review/quiz)
        if (modalId === 'review-modal' || modalId === 'quiz-modal') {
            import('../core/stats.js').then(m => m.updateSRSBadge());
        }
        
        // FIX: Останавливаем квиз, если закрыли окно во время игры
        if (modalId === 'quiz-modal') import('./quiz.js').then(m => m.quitQuiz());
        
        // Если закрываем статистику, можно сбросить UI деталей, чтобы остановить подписку (косвенно)
        if (modalId === 'stats-modal') {
             // Также очищаем обработчик подтверждения на всякий случай, если он был открыт поверх
             if (_confirmHandler) {
                try { document.getElementById('confirm-yes').removeEventListener('click', _confirmHandler); } catch(e){}
                _confirmHandler = null;
             }
             import('../core/stats.js').then(m => m.renderDetailedStats());
        }
    }
    try { if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus(); } catch (e) {}
}

export function openConfirm(message, onYes, options = {}) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) { if (typeof onYes === 'function') onYes(); return; }
    
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');
    const inputContainer = document.getElementById('confirm-input-container');
    const input = document.getElementById('confirm-password');

    if (msgEl) msgEl.textContent = message || 'Вы уверены?';
    
    if (inputContainer && input) {
        if (options.showInput) {
            inputContainer.style.display = 'block';
            input.value = '';
            input.placeholder = options.inputPlaceholder || '';
            input.onkeydown = (e) => { if (e.key === 'Enter') yesBtn.click(); };
            setTimeout(() => input.focus(), 100);
        } else {
            inputContainer.style.display = 'none';
            input.onkeydown = null;
        }
    }

    if (yesBtn) {
        // Удаляем старый обработчик, если он остался
        if (_confirmHandler) {
            yesBtn.removeEventListener('click', _confirmHandler);
            _confirmHandler = null;
        }
        _confirmHandler = async () => { 
            if (options.showInput && options.onValidate) {
                const isValid = await options.onValidate(input.value);
                if (!isValid) {
                    if (input) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 500); }
                    return;
                }
            }
            closeConfirm(); 
            if (typeof onYes === 'function') onYes(); 
        };
        yesBtn.addEventListener('click', _confirmHandler);
    }
    modal.classList.add('active');
}

export function closeConfirm() {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    const yesBtn = document.getElementById('confirm-yes');
    if (yesBtn && _confirmHandler) { try { yesBtn.removeEventListener('click', _confirmHandler); } catch(e){} _confirmHandler = null; }
}
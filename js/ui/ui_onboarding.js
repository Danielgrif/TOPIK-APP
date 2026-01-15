import { showToast } from '../utils/utils.js';

let currentStep = 0;
const onboardingSteps = [
    { emoji: '👋', title: 'Добро пожаловать!', text: 'TOPIK II Master Pro — ваш умный помощник в изучении корейского языка. Давайте быстро посмотрим основные функции.' },
    { emoji: '🃏', title: 'Умные карточки', text: 'Нажимайте на карточку, чтобы увидеть перевод. Используйте 🔊 для озвучки и ❤️ для добавления сложных слов в избранное.' },
    { emoji: '🎮', title: '12 Режимов', text: 'В разделе "Тренировка" вас ждут разнообразные режимы: от простого выбора до Спринта, Выживания и Диктанта.' },
    { emoji: '🧠', title: 'Интервальные повторения', text: 'Система сама подскажет, когда нужно повторить слово (SRS). Следите за индикатором 🔁 в меню, чтобы не забывать изученное.' },
    { emoji: '🚀', title: 'Поехали!', text: 'Готовы начать? Удачи в подготовке к экзамену TOPIK! 화이팅!' }
];

/**
 * Checks if onboarding has been seen, otherwise shows it.
 */
export function checkAndShowOnboarding() {
    if (!localStorage.getItem('onboarding_completed_v1')) {
        setTimeout(() => renderOnboarding(), 1000);
    }
}

function renderOnboarding() {
    let overlay = document.getElementById('onboarding-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-card">
                <div id="ob-content"></div>
                <div class="onboarding-dots" id="ob-dots"></div>
                <div class="onboarding-actions">
                    <button class="btn" id="ob-skip-btn" style="flex:1; background:transparent; border-color:transparent; color:var(--text-sub);">Пропустить</button>
                    <button class="btn btn-quiz" id="ob-next-btn" style="flex:2;">Далее</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        document.getElementById('ob-skip-btn').onclick = finishOnboarding;
        document.getElementById('ob-next-btn').onclick = nextOnboardingStep;
    }
    
    currentStep = 0;
    updateOnboardingStep();
    
    // Force reflow
    void overlay.offsetWidth;
    overlay.classList.add('active');
}

function nextOnboardingStep() {
    if (currentStep < onboardingSteps.length - 1) {
        currentStep++;
        updateOnboardingStep();
    } else {
        finishOnboarding();
    }
}

function updateOnboardingStep() {
    const step = onboardingSteps[currentStep];
    const content = document.getElementById('ob-content');
    const dots = document.getElementById('ob-dots');
    const btn = document.getElementById('ob-next-btn');
    
    if (content) content.innerHTML = `<span class="onboarding-image">${step.emoji}</span><div class="onboarding-title">${step.title}</div><div class="onboarding-text">${step.text}</div>`;
    if (dots) dots.innerHTML = onboardingSteps.map((_, i) => `<div class="onboarding-dot ${i === currentStep ? 'active' : ''}"></div>`).join('');
    if (btn) btn.textContent = currentStep === onboardingSteps.length - 1 ? 'Начать' : 'Далее';
}

function finishOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
    localStorage.setItem('onboarding_completed_v1', 'true');
    showToast('Удачи в обучении! 🍀');
}
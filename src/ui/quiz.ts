import { state } from '../core/state.ts';
import { showToast, showComboEffect, parseBilingualString, playTone } from '../utils/utils.ts'; 
import { ensureSessionStarted, playAndSpeak, saveAndRender } from './ui.ts'; 
import { closeModal, openModal } from './ui_modal.ts';
import { recordAttempt, scheduleSaveState } from '../core/db.ts';
import { addXP, updateStats } from '../core/stats.ts';
import { applyBackgroundMusic } from './ui_settings.ts';
import { QuizStrategies } from './quiz_strategies.ts';
// @ts-ignore
import { findConfusingWords } from '../core/confusing_words.js';
import { Word } from '../types/index.ts';

let currentQuizMode: string;
let quizWords: Word[] = [];
let quizIndex: number;
let quizStart: number;
let quizStar: string = 'all';
let quizTopic: string = 'all';
let quizCategory: string = 'all';
let quizSearch: string = '';
let quizInterval: number | null = null;
let quizCorrectCount: number = 0;
let quizSecondsElapsed: number = 0; 
let quizTimerValue: number = 0;
let survivalLives: number = 0;
let isQuizPaused: boolean = false;

export function updateDailyChallengeUI() {
    const btn = document.querySelector('.fire-btn') as HTMLElement;
    if (!btn) return;
    
    const today = new Date().toDateString();
    const isCompleted = state.dailyChallenge && state.dailyChallenge.lastDate === today && state.dailyChallenge.completed;
    const isSunday = new Date().getDay() === 0;
    
    if (isSunday) {
        btn.classList.add('super-challenge');
        btn.innerHTML = '🌟';
        btn.title = 'Супер-вызов (x2 Награда)';
    } else {
        btn.classList.remove('super-challenge');
        btn.innerHTML = '🔥';
        btn.title = 'Ежедневный вызов';
    }

    if (!isCompleted) btn.classList.add('has-notification');
    else btn.classList.remove('has-notification');
}

export function checkSuperChallengeNotification() {
    const today = new Date().toDateString();
    const isCompleted = state.dailyChallenge && state.dailyChallenge.lastDate === today && state.dailyChallenge.completed;
    const isSunday = new Date().getDay() === 0;

    if (isSunday && !isCompleted) {
        setTimeout(() => {
            showToast('🌟 Сегодня доступен СУПЕР-ВЫЗОВ! (x2 Награда)', 5000);
        }, 2000);
    }
}

export function buildQuizModes() {
    const searchInput = document.getElementById('quiz-search-input');
    if (searchInput) searchInput.style.display = 'block';
    const quizCount = document.getElementById('quiz-count');
    if (quizCount) quizCount.style.display = 'block';
    const header = document.querySelector('#quiz-modal .modal-header') as HTMLElement;
    if (header) header.style.display = 'flex';
    const quizGame = document.getElementById('quiz-game');
    if (quizGame) quizGame.style.display = 'none';
    const modeSelector = document.getElementById('quiz-mode-selector');
    if (modeSelector) modeSelector.style.display = 'grid';
    const quizDiff = document.getElementById('quiz-difficulty');
    if (quizDiff) quizDiff.style.display = 'flex';
    const quizFilters = document.getElementById('quiz-filters');
    if (quizFilters) quizFilters.style.display = 'flex';

    const modes = [
        { id: 'mix', emoji: '🔀', label: 'Микс (Все режимы)', mode: 'mix' },
        { id: 'multiple-choice', emoji: '🎯', label: 'Множественный выбор', mode: 'multiple-choice' },
        { id: 'flashcard', emoji: '🔄', label: 'Флешкарты', mode: 'flashcard' },
        { id: 'reverse', emoji: '🔄', label: 'Обратно (Рус→Кор)', mode: 'reverse' },
        { id: 'sentence', emoji: '📝', label: 'Заполнить предложение', mode: 'sentence' },
        { id: 'typing', emoji: '⌨️', label: 'Написание (Хардкор)', mode: 'typing' },
        { id: 'dictation', emoji: '✍️', label: 'Диктант (На слух)', mode: 'dictation' },
        { id: 'audio', emoji: '🎧', label: 'Аудирование (Слух)', mode: 'audio' },
        { id: 'dialogue', emoji: '🗣️', label: 'Диалог (Контекст)', mode: 'dialogue' },
        { id: 'true-false', emoji: '✅', label: 'Правда / Ложь', mode: 'true-false' },
        { id: 'sprint', emoji: '⚡', label: 'Спринт (Таймер)', mode: 'sprint' },
        { id: 'survival', emoji: '☠️', label: 'Выживание', mode: 'survival' },
        { id: 'scramble', emoji: '🧩', label: 'Конструктор фраз', mode: 'scramble' },
        { id: 'essay', emoji: '✍️', label: 'Эссе (Письмо)', mode: 'essay' },
        { id: 'confusing', emoji: '🤔', label: 'Похожие слова', mode: 'confusing' },
        { id: 'synonyms', emoji: '🤝', label: 'Синонимы', mode: 'synonyms' },
        { id: 'antonyms', emoji: '↔️', label: 'Антонимы', mode: 'antonyms' },
        { id: 'association', emoji: '🔗', label: 'Соедини пары', mode: 'association' },
        { id: 'pronunciation', emoji: '🎤', label: 'Произношение', mode: 'pronunciation' }
    ];
    
    quizTopic = state.quizTopic || 'all';
    quizCategory = state.quizCategory || 'all';
    quizStar = state.quizDifficulty || 'all';
    quizSearch = '';

    const sInput = document.getElementById('quiz-search-input') as HTMLInputElement;
    if (sInput) {
        sInput.value = '';
        sInput.oninput = (e) => { 
            const target = e.target as HTMLInputElement;
            if (target) {
                quizSearch = target.value.trim().toLowerCase(); 
                updateQuizCount();
            }
        };
    }

    populateQuizFilters();
    populateQuizDifficulty();

    const selector = document.getElementById('quiz-mode-selector');
    if (selector) {
        selector.innerHTML = '';
        modes.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'quiz-mode-btn';
            btn.dataset.mode = m.mode;
            btn.innerHTML = `<span class="mode-icon">${m.emoji}</span><span class="mode-label">${m.label}</span>`;
            btn.onclick = () => startQuizMode(m.mode);
            selector.appendChild(btn);
        });
    }
    updateQuizCount();
}

function populateQuizFilters() {
    const tSelect = document.getElementById('quiz-topic-select') as HTMLSelectElement;
    if (!tSelect || !state.dataStore) return;

    const topics = new Set<string>();
    state.dataStore.forEach((w: Word) => { 
        if (w.type === state.currentType) {
            const t = w.topic || w.topic_ru || w.topic_kr;
            if (t) topics.add(t);
        }
    });
    tSelect.innerHTML = '<option value="all">Все темы</option>';
    Array.from(topics).sort().forEach(t => {
        if(t) {
            const opt = document.createElement('option'); opt.value = t; opt.textContent = parseBilingualString(t).ru; tSelect.appendChild(opt);
        }
    });
    tSelect.value = quizTopic;
    tSelect.onchange = () => { 
        quizTopic = tSelect.value; 
        quizCategory = 'all'; 
        state.quizTopic = quizTopic;
        state.quizCategory = quizCategory;
        localStorage.setItem('quiz_topic_v1', quizTopic);
        localStorage.setItem('quiz_category_v1', quizCategory);
        populateQuizCategories(); updateQuizCount(); 
    };
    populateQuizCategories();
}

function populateQuizCategories() {
    const cSelect = document.getElementById('quiz-category-select') as HTMLSelectElement;
    if (!cSelect || !state.dataStore) return;
    const categories = new Set<string>();
    state.dataStore.forEach((w: Word) => {
        if (w.type !== state.currentType) return;
        const t = w.topic || w.topic_ru || w.topic_kr;
        if (quizTopic !== 'all' && t !== quizTopic) return;
        const c = w.category || w.category_ru || w.category_kr;
        if (c) categories.add(c);
    });
    cSelect.innerHTML = '<option value="all">Все категории</option>';
    Array.from(categories).sort().forEach(c => {
        if(c) {
            const opt = document.createElement('option'); opt.value = c; opt.textContent = parseBilingualString(c).ru; cSelect.appendChild(opt);
        }
    });
    cSelect.value = quizCategory;
    cSelect.onchange = () => { 
        quizCategory = cSelect.value; 
        state.quizCategory = quizCategory;
        localStorage.setItem('quiz_category_v1', quizCategory);
        updateQuizCount(); 
    };
}

function populateQuizDifficulty() {
    const container = document.getElementById('quiz-difficulty');
    if (!container) return;
    container.innerHTML = '';
    const levels = ['all', '★★★', '★★☆', '★☆☆'];
    levels.forEach(lvl => {
        const btn = document.createElement('button');
        btn.className = 'btn quiz-difficulty-btn';
        btn.dataset.lvl = lvl;
        if (lvl === quizStar) btn.classList.add('active');
        btn.textContent = lvl === 'all' ? 'Все уровни' : lvl;
        btn.onclick = () => {
            quizStar = lvl;
            container.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.quizDifficulty = lvl;
            localStorage.setItem('quiz_difficulty_v1', lvl);
            updateQuizCount();
        };
        container.appendChild(btn);
    });
}

export function startQuizMode(mode: string) {
    currentQuizMode = mode;
    ensureSessionStarted();

    const filterFn = (w: Word) => {
        if (w.type !== state.currentType) return false;
        const wTopic = w.topic || w.topic_ru || w.topic_kr;
        const matchTopic = (quizTopic === 'all' || wTopic === quizTopic);
        const wCat = w.category || w.category_ru || w.category_kr;
        const matchCat = (quizCategory === 'all' || wCat === quizCategory);
        const matchStar = (quizStar === 'all' || w.level === quizStar);
        const matchSearch = !quizSearch || (w._searchStr && w._searchStr.includes(quizSearch));
        return matchTopic && matchCat && matchStar && matchSearch;
    };

    let pool = state.dataStore.filter(filterFn);
    let unlearnedPool = pool.filter(w => !state.learned.has(w.id));
    let learnedPool = pool.filter(w => state.learned.has(w.id));
    
    unlearnedPool.sort(() => Math.random() - 0.5);
    learnedPool.sort(() => Math.random() - 0.5);
    
    if (mode === 'confusing') {
        const groups = findConfusingWords();
        if (groups.length === 0) {
            showToast('Не найдено похожих слов для тренировки!');
            return;
        }
        quizWords = groups.flat().sort(() => Math.random() - 0.5).slice(0, 20);
    }
    if (mode === 'association') {
        quizWords = Array(5).fill({ id: 'dummy' } as any); 
    }
    if (mode === 'sprint') quizWords = unlearnedPool.concat(learnedPool).slice(0, 100);
    else if (mode === 'survival') quizWords = unlearnedPool.concat(learnedPool).slice(0, 200);
    else quizWords = unlearnedPool.concat(learnedPool).slice(0, 10);
    
    if (mode === 'scramble' || mode === 'essay') {
        quizWords = quizWords.filter(w => w.example_kr && w.example_kr.length > 5 && w.example_ru);
    }
    if (mode === 'dialogue') {
        quizWords = quizWords.filter(w => w.example_audio && w.example_kr);
    }
    if (mode === 'synonyms') {
        quizWords = quizWords.filter(w => w.synonyms && w.synonyms.trim().length > 0);
    }
    if (mode === 'antonyms') {
        quizWords = quizWords.filter(w => w.antonyms && w.antonyms.trim().length > 0);
    }

    if (quizWords.length === 0) {
        if (quizTopic !== 'all' || quizCategory !== 'all') showToast('Нет слов для тренировки в выбранной теме!');
        else quizWords = state.dataStore.slice(0, 10);
        if (quizWords.length === 0) return;
    }

    const uniqueQuizMap = new Map();
    quizWords.forEach(w => {
        if (!uniqueQuizMap.has(w.id)) uniqueQuizMap.set(w.id, w);
    });
    quizWords = Array.from(uniqueQuizMap.values());

    quizIndex = 0;
    quizStart = Date.now();
    quizCorrectCount = 0;
    quizTimerValue = mode === 'sprint' ? 60 : (mode === 'survival' ? 15 : 0);
    if (mode === 'survival') survivalLives = 3;
    quizSecondsElapsed = 0;
    isQuizPaused = false;

    const bar = document.getElementById('quiz-progress-fill');
    if (bar) { bar.style.transition = ''; bar.style.background = ''; }
    if (mode === 'sprint' || mode === 'survival') if (bar) bar.style.transition = 'width 1s linear, background-color 1s linear';

    if (quizInterval) clearInterval(quizInterval);
    quizInterval = window.setInterval(() => {
        if (isQuizPaused) return;
        if (currentQuizMode === 'sprint') {
            quizTimerValue--;
            const pct = Math.max(0, (quizTimerValue / 60) * 100);
            if (bar) { bar.style.width = `${pct}%`; bar.style.backgroundColor = `hsl(${Math.floor((pct/100)*120)}, 80%, 45%)`; }
            const el = document.getElementById('quiz-timer-display');
            if (el) { el.innerText = `⏳ ${quizTimerValue}`; el.style.color = quizTimerValue < 10 ? 'var(--danger)' : ''; }
            if (quizTimerValue <= 0) endQuiz(true);
        } else if (currentQuizMode === 'survival') {
            quizTimerValue--;
            const el = document.getElementById('quiz-timer-display');
            if (el) { el.innerText = `⏳ ${quizTimerValue}s`; el.style.color = quizTimerValue < 5 ? 'var(--danger)' : ''; }
            const pct = Math.min(100, Math.max(0, (quizTimerValue / 30) * 100));
            if (bar) { bar.style.width = `${pct}%`; bar.style.backgroundColor = `hsl(${Math.min(120, pct * 4)}, 80%, 45%)`; }
            if (quizTimerValue <= 0) endQuiz(true);
        } else {
            quizSecondsElapsed++;
            const el = document.getElementById('quiz-timer-display');
            if (el) { el.innerText = `${String(Math.floor(quizSecondsElapsed/60)).padStart(2,'0')}:${String(quizSecondsElapsed%60).padStart(2,'0')}`; el.style.color = ''; }
        }
    }, 1000);

    const quizDiff = document.getElementById('quiz-difficulty');
    if (quizDiff) quizDiff.style.display = 'none';
    const quizFilters = document.getElementById('quiz-filters');
    if (quizFilters) quizFilters.style.display = 'none';
    const modeSelector = document.getElementById('quiz-mode-selector');
    if (modeSelector) modeSelector.style.display = 'none';
    
    const searchInput = document.getElementById('quiz-search-input');
    if (searchInput) searchInput.style.display = 'none';
    const quizCount = document.getElementById('quiz-count');
    if (quizCount) quizCount.style.display = 'none';
    const header = document.querySelector('#quiz-modal .modal-header') as HTMLElement;
    if (header) header.style.display = 'none';

    const quizGame = document.getElementById('quiz-game');
    if (quizGame) quizGame.style.display = 'flex';
    applyBackgroundMusic(true);

    nextQuizQuestion();
}

export function startDailyChallenge() {
    const today = new Date().toDateString();
    if (state.dailyChallenge && state.dailyChallenge.lastDate === today && state.dailyChallenge.completed) {
        openDailyStatusModal();
        return;
    }

    const launch = () => {
        const isSunday = new Date().getDay() === 0;
        currentQuizMode = isSunday ? 'super-daily' : 'daily';
        ensureSessionStarted();

        const countNew = isSunday ? 7 : 3;
        const countReview = isSunday ? 3 : 2;
        const total = countNew + countReview;

        const unlearned = state.dataStore.filter((w: Word) => !state.learned.has(w.id)).sort(() => Math.random() - 0.5);
        const learned = state.dataStore.filter((w: Word) => state.learned.has(w.id)).sort(() => Math.random() - 0.5);

        quizWords = [
            ...unlearned.slice(0, countNew),
            ...learned.slice(0, countReview)
        ];
        
        if (quizWords.length < total) {
            const needed = total - quizWords.length;
            const currentIds = new Set(quizWords.map(w => w.id));
            
            let easyPool = state.dataStore.filter((w: Word) => !currentIds.has(w.id) && w.level === '★☆☆');
            easyPool.sort(() => Math.random() - 0.5);
            
            const easyToAdd = easyPool.slice(0, needed);
            quizWords = quizWords.concat(easyToAdd);
            
            if (quizWords.length < total) {
                const stillNeeded = total - quizWords.length;
                const currentIdsUpdated = new Set(quizWords.map(w => w.id));
                const others = state.dataStore.filter((w: Word) => !currentIdsUpdated.has(w.id));
                others.sort(() => Math.random() - 0.5);
                quizWords = quizWords.concat(others.slice(0, stillNeeded));
            }
        }

        quizIndex = 0;
        quizStart = Date.now();
        quizCorrectCount = 0;
        
        const quizDiff = document.getElementById('quiz-difficulty');
        if (quizDiff) quizDiff.style.display = 'none';
        const quizFilters = document.getElementById('quiz-filters');
        if (quizFilters) quizFilters.style.display = 'none';
        const modeSelector = document.getElementById('quiz-mode-selector');
        if (modeSelector) modeSelector.style.display = 'none';
        const searchInput = document.getElementById('quiz-search-input');
        if (searchInput) searchInput.style.display = 'none';
        const quizCount = document.getElementById('quiz-count');
        if (quizCount) quizCount.style.display = 'none';
        const header = document.querySelector('#quiz-modal .modal-header') as HTMLElement;
        if (header) header.style.display = 'none';

        const quizGame = document.getElementById('quiz-game');
        if (quizGame) quizGame.style.display = 'flex';
        applyBackgroundMusic(true);

        nextQuizQuestion();
        showToast(isSunday ? '🌟 СУПЕР-ВЫЗОВ начат! (x2 Награда)' : '🔥 Ежедневный вызов начат!');
    };

    const modal = document.getElementById('quiz-modal');
    if (modal && !modal.classList.contains('active')) {
        openModal('quiz-modal');
        setTimeout(launch, 300);
    } else {
        launch();
    }
}

function openDailyStatusModal() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const streak = state.dailyChallenge.streak || 0;
    const isTomorrowSuper = tomorrow.getDay() === 0;
    const multiplier = isTomorrowSuper ? 2 : 1;

    const nextStreak = streak + 1;
    const nextBase = 50 * multiplier;
    const nextBonus = Math.min(nextStreak, 7) * 10 * multiplier;
    const nextTotal = nextBase + nextBonus;

    let modal = document.getElementById('daily-status-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'daily-status-modal';
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.onclick = (e) => { if(e.target === modal) closeModal('daily-status-modal'); };
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content modal-centered" style="text-align: center; max-width: 350px;">
            <div style="position: absolute; top: 15px; right: 15px;">
                <button class="btn btn-icon close-modal-btn" onclick="closeModal('daily-status-modal')">✕</button>
            </div>
            <div style="font-size: 64px; margin-bottom: 10px;">${isTomorrowSuper ? '🌟' : '🔥'}</div>
            <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">Серия: ${streak} дн.</div>
            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 25px;">Вызов на сегодня выполнен!</div>
            
            <div style="background: var(--surface-2); padding: 20px; border-radius: 16px; margin-bottom: 25px; border: 1px solid var(--border-color);">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; margin-bottom: 10px;">
                    ${isTomorrowSuper ? '🌟 Супер-награда завтра' : 'Награда завтра'}
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="font-size: 32px; font-weight: 900; color: var(--gold);">${nextTotal}</div>
                    <div style="font-size: 24px;">💰</div>
                </div>
                <div style="font-size: 12px; color: var(--text-sub); margin-top: 5px;">
                    (${nextBase} база + ${nextBonus} бонус серии)
                </div>
            </div>

            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 10px;">До следующего вызова:</div>
            <div style="font-size: 28px; font-weight: 800; font-family: monospace; color: var(--primary); margin-bottom: 25px;">
                ${h}ч ${String(m).padStart(2, '0')}м
            </div>
            
            <button class="btn btn-quiz" style="width: 100%; padding: 15px; font-size: 16px;" onclick="closeModal('daily-status-modal')">Отлично</button>
        </div>
    `;
    
    openModal('daily-status-modal');
}

export function nextQuizQuestion() {
    if (quizIndex >= quizWords.length) { endQuiz(); return; }
    const container = document.getElementById('quiz-opts');
    
    const infoEl = document.getElementById('quiz-extra-info');
    if (infoEl) infoEl.remove();

    if (container) container.querySelectorAll('.quiz-option').forEach(btn => (btn as HTMLButtonElement).disabled = false);
    const progressEl = document.getElementById('quiz-progress-fill');
    if (progressEl) progressEl.style.backgroundColor = '';

    preloadNextAudio();
    const word = quizWords[quizIndex];
    const scoreEl = document.getElementById('quiz-score');
    if(scoreEl) scoreEl.innerText = `Вопрос ${quizIndex + 1} / ${quizWords.length}`;
    if (currentQuizMode === 'survival') {
        if(scoreEl) scoreEl.innerText = `❤️ ${survivalLives}`;
    }
    
    const qEl = document.getElementById('quiz-q') as HTMLElement;
    
    let strategyKey = currentQuizMode;
    
    if (currentQuizMode === 'daily' || currentQuizMode === 'super-daily') {
        const allowed = ['multiple-choice', 'reverse'];
        if (word.audio_url || word.audio_male) allowed.push('audio');
        strategyKey = allowed[Math.floor(Math.random() * allowed.length)];
    } else if (currentQuizMode === 'mix') {
        const allowed = ['multiple-choice', 'reverse', 'typing', 'flashcard', 'true-false'];
        
        if (word.audio_url || word.audio_male) {
            allowed.push('audio');
            allowed.push('dictation');
        }
        
        if (word.example_kr && word.example_ru && word.example_kr.length > 5) {
            allowed.push('sentence');
            allowed.push('scramble');
        }
        
        if (word.synonyms && word.synonyms.trim()) allowed.push('synonyms');
        if (word.antonyms && word.antonyms.trim()) allowed.push('antonyms');
        
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) allowed.push('pronunciation');
        
        strategyKey = allowed[Math.floor(Math.random() * allowed.length)];
    }

    if (currentQuizMode === 'association') strategyKey = 'association';
    if (currentQuizMode === 'pronunciation') strategyKey = 'pronunciation';
    if (currentQuizMode === 'confusing') strategyKey = 'confusing';
    if (currentQuizMode === 'synonyms') strategyKey = 'synonyms';
    if (currentQuizMode === 'antonyms') strategyKey = 'antonyms';
    if (currentQuizMode === 'survival') strategyKey = 'multiple-choice';

    const strategy = QuizStrategies[strategyKey] || QuizStrategies['multiple-choice'];
    
    strategy.render(word, container as HTMLElement, (isCorrect: boolean | null, autoAdvance?: boolean, forceNext?: boolean) => {
        if (forceNext || isCorrect === null) {
            if (quizIndex < quizWords.length - 1) { quizIndex++; nextQuizQuestion(); } else { endQuiz(true); }
            return;
        }
        recordQuizAnswer(isCorrect as boolean, autoAdvance);
    }, qEl);
}

function preloadNextAudio() {
    try {
        for (let i = 1; i <= 3; i++) {
            const w = quizWords[quizIndex + i];
            if (w) {
                let url = w.audio_url;
                if (state.currentVoice === 'male' && w.audio_male) url = w.audio_male;
                if (url) {
                    const a = new Audio(); a.src = url; a.preload = 'auto';
                }
            }
        }
    } catch (e) { /* ignore */ }
}

function recordQuizAnswer(isCorrect: boolean, autoAdvance: boolean = true) {
    const word = quizWords[quizIndex];
    recordAttempt(word.id, isCorrect);

    let hasExtraInfo = false;
    if ((word.synonyms && word.synonyms.trim()) || (word.antonyms && word.antonyms.trim())) {
        const body = document.querySelector('.quiz-body');
        if (body) {
            let infoEl = document.getElementById('quiz-extra-info');
            if (!infoEl) {
                infoEl = document.createElement('div');
                infoEl.id = 'quiz-extra-info';
                infoEl.style.cssText = 'margin-top: 15px; padding: 12px; background: var(--surface-2); border-radius: 12px; text-align: center; animation: fadeIn 0.3s; border: 1px solid var(--border-color); font-size: 14px;';
                body.appendChild(infoEl);
            }
            
            let content = '';
            if (word.synonyms && word.synonyms.trim()) content += `<div style="margin-bottom:4px;"><span style="font-weight:bold; color:var(--primary);">≈</span> ${word.synonyms}</div>`;
            if (word.antonyms && word.antonyms.trim()) content += `<div><span style="font-weight:bold; color:var(--danger);">≠</span> ${word.antonyms}</div>`;
            
            infoEl.innerHTML = content;
            hasExtraInfo = true;
        }
    }

    if (isCorrect) {
        quizCorrectCount++;
        state.learned.add(word.id);
        state.mistakes.delete(word.id);
        addXP(10);
        if (currentQuizMode === 'sprint') { quizTimerValue += 2; showToast('+2 сек!', 800); }
        if (currentQuizMode === 'survival') { quizTimerValue += 3; showComboEffect('+3 сек!'); }
        document.body.classList.add('correct-flash'); setTimeout(() => document.body.classList.remove('correct-flash'), 700);
    } else {
        state.mistakes.add(word.id);
        addXP(-2);
        const gameEl = document.getElementById('quiz-game');
        if(gameEl) { gameEl.classList.add('shake'); setTimeout(() => gameEl.classList.remove('shake'), 700); }
        if (currentQuizMode === 'sprint') { quizTimerValue -= 5; showToast('-5 сек!', 800); }
        if (currentQuizMode === 'survival') { 
            survivalLives--;
            const scoreEl = document.getElementById('quiz-score');
            if (scoreEl) scoreEl.innerText = `❤️ ${survivalLives}`;
            
            document.body.classList.add('pulse-red-effect');
            setTimeout(() => document.body.classList.remove('pulse-red-effect'), 700);
            
            playTone('life-lost');
            
            if (survivalLives <= 0) {
                showToast('☠️ Жизни закончились!'); endQuiz(true); return; 
            } else {
                showToast('💔 Минус жизнь!', 800);
            }
        }
        document.body.classList.add('wrong-flash'); setTimeout(() => document.body.classList.remove('wrong-flash'), 700);
    }
    saveAndRender();
    if (currentQuizMode !== 'survival' || isCorrect) {
        playTone(isCorrect ? 'success' : 'failure');
    }

    const advance = () => {
        if (currentQuizMode === 'essay' || !autoAdvance) return;
        const delay = hasExtraInfo ? 2500 : 500;
        setTimeout(() => { if (quizIndex < quizWords.length - 1) { quizIndex++; nextQuizQuestion(); } else { endQuiz(); } }, delay);
    };

    if (isCorrect) {
        isQuizPaused = true;
        playAndSpeak(word).then(() => { isQuizPaused = false; advance(); });
    } else {
        advance();
    }
}

function endQuiz(forceEnd: boolean = false) {
    if (quizInterval) clearInterval(quizInterval);
    if (currentQuizMode === 'sprint' && quizCorrectCount > state.userStats.sprintRecord) { state.userStats.sprintRecord = quizCorrectCount; showComboEffect(`🏆 Рекорд: ${quizCorrectCount}!`); }
    if (currentQuizMode === 'survival' && quizCorrectCount > state.userStats.survivalRecord) state.userStats.survivalRecord = quizCorrectCount;
    
    if (currentQuizMode === 'daily') {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        let streak = state.dailyChallenge.streak || 0;
        
        if (state.dailyChallenge.lastDate === yesterday) streak++;
        else if (state.dailyChallenge.lastDate !== today) streak = 1;

        const baseCoins = 50;
        const streakBonus = Math.min(streak, 7) * 10;
        const totalCoins = baseCoins + streakBonus;

        addXP(50);
        state.userStats.coins += totalCoins;
        updateStats();
        
        state.dailyChallenge = { lastDate: today, completed: true, streak: streak };
        localStorage.setItem('daily_challenge_v1', JSON.stringify(state.dailyChallenge));
        showComboEffect(`🔥 Вызов пройден!\n+50 XP | +${totalCoins + 50} 💰\nСерия: ${streak} дн.`);
        updateDailyChallengeUI();
        if (typeof (window as any).confetti === 'function') (window as any).confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    if (state.sessionActive && quizWords && quizIndex >= 0) {
        const count = quizIndex + 1;
        state.sessions.push({ date: new Date().toISOString(), duration: Math.round((Date.now() - quizStart)/1000), wordsReviewed: count, accuracy: count > 0 ? Math.round((quizCorrectCount/count)*100) : 0 });
        localStorage.setItem('sessions_v5', JSON.stringify(state.sessions));
        scheduleSaveState();
    }
    
    const quizGameEl = document.getElementById('quiz-game');
    if (quizGameEl) quizGameEl.style.display = 'none';
    const quizModeSelectorEl = document.getElementById('quiz-mode-selector');
    if (quizModeSelectorEl) quizModeSelectorEl.style.display = 'grid';
    const quizDifficultyEl = document.getElementById('quiz-difficulty');
    if (quizDifficultyEl) quizDifficultyEl.style.display = 'flex';
    const quizFiltersEl = document.getElementById('quiz-filters');
    if (quizFiltersEl) quizFiltersEl.style.display = 'flex';
    applyBackgroundMusic();
    
    const searchInputEl = document.getElementById('quiz-search-input');
    if (searchInputEl) searchInputEl.style.display = 'block';
    const quizCountEl = document.getElementById('quiz-count');
    if (quizCountEl) quizCountEl.style.display = 'block';
    const header = document.querySelector('#quiz-modal .modal-header') as HTMLElement;
    if (header) header.style.display = 'flex';

    showToast('🏁 Квиз завершен!');
}

export function quitQuiz() {
    if (quizInterval) clearInterval(quizInterval);
    endQuiz(false);
}

export function updateQuizCount() {
    const countEl = document.getElementById('quiz-count');
    if (!countEl) return;
    const filterFn = (w: Word) => {
        if (w.type !== state.currentType) return false;
        const wTopic = w.topic || w.topic_ru || w.topic_kr;
        const matchTopic = (quizTopic === 'all' || wTopic === quizTopic);
        const wCat = w.category || w.category_ru || w.category_kr;
        const matchCat = (quizCategory === 'all' || wCat === quizCategory);
        const matchStar = (quizStar === 'all' || w.level === quizStar);
        const matchSearch = !quizSearch || (w._searchStr && w._searchStr.includes(quizSearch));
        return matchTopic && matchCat && matchStar && matchSearch;
    };
    const total = state.dataStore.filter(filterFn).length;
    const notLearned = state.dataStore.filter((w: Word) => filterFn(w) && !state.learned.has(w.id)).length;
    countEl.textContent = `Неизучено: ${notLearned} / Всего: ${total} (по фильтру)`;
    updateQuizModesAvailability();
    updateResetButton();
}

export function updateQuizModesAvailability() {
    const selector = document.getElementById('quiz-mode-selector');
    if (!selector) return;
    const buttons = selector.querySelectorAll('.quiz-mode-btn');
    const filterFn = (w: Word) => {
        if (w.type !== state.currentType) return false;
        const wTopic = w.topic || w.topic_ru || w.topic_kr;
        const matchTopic = (quizTopic === 'all' || wTopic === quizTopic);
        const wCat = w.category || w.category_ru || w.category_kr;
        const matchCat = (quizCategory === 'all' || wCat === quizCategory);
        const matchStar = (quizStar === 'all' || w.level === quizStar);
        const matchSearch = !quizSearch || (w._searchStr && w._searchStr.includes(quizSearch));
        return matchTopic && matchCat && matchStar && matchSearch;
    };
    const basePool = state.dataStore.filter(filterFn);
    buttons.forEach(b => {
        const btn = b as HTMLButtonElement;
        const mode = btn.dataset.mode;
        let count = basePool.length;
        let reason = '';
        let minWords = 1;

        if (mode === 'scramble' || mode === 'essay') {
            minWords = 5;
            count = basePool.filter(w => w.example_kr && w.example_kr.length > 5 && w.example_ru).length;
            if (count < minWords) reason = `Мало примеров (${count}/${minWords})`;
        } else if (mode === 'dialogue') {
            minWords = 5;
            count = basePool.filter(w => w.example_audio && w.example_kr).length;
            if (count < minWords) reason = `Мало аудио-диалогов (${count}/${minWords})`;
        } else if (mode === 'synonyms') {
            minWords = 5;
            count = basePool.filter(w => w.synonyms && w.synonyms.trim().length > 0).length;
            if (count < minWords) reason = `Мало синонимов (${count}/${minWords})`;
        } else if (mode === 'antonyms') {
            minWords = 5;
            count = basePool.filter(w => w.antonyms && w.antonyms.trim().length > 0).length;
            if (count < minWords) reason = `Мало антонимов (${count}/${minWords})`;
        } else if (mode === 'confusing') {
            count = state.dataStore.length; 
        } else if (mode === 'association') {
            count = state.dataStore.length;
        } else {
            if (count < 1) reason = `Нет слов`;
        }
        if (count < minWords) {
            btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; btn.title = reason;
        } else {
            btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.title = '';
        }
    });
}

function updateResetButton() {
    const container = document.getElementById('quiz-filters');
    if (!container) return;
    
    let btn = document.getElementById('quiz-reset-btn');
    const hasFilters = quizTopic !== 'all' || quizCategory !== 'all' || quizStar !== 'all' || quizSearch !== '';

    if (hasFilters) {
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'quiz-reset-btn';
            btn.className = 'btn';
            btn.style.padding = '0 12px';
            btn.style.animation = 'fadeIn 0.5s ease-out';
            btn.innerHTML = '↺';
            btn.title = 'Сбросить фильтры';
            btn.onclick = () => {
                quizTopic = 'all'; state.quizTopic = 'all'; localStorage.setItem('quiz_topic_v1', 'all');
                quizCategory = 'all'; state.quizCategory = 'all'; localStorage.setItem('quiz_category_v1', 'all');
                quizStar = 'all'; state.quizDifficulty = 'all'; localStorage.setItem('quiz_difficulty_v1', 'all');
                
                quizSearch = '';
                const sInput = document.getElementById('quiz-search-input') as HTMLInputElement;
                if(sInput) sInput.value = '';

                populateQuizFilters(); populateQuizDifficulty(); updateQuizCount();
            };
            container.appendChild(btn);
        }
        btn.style.display = 'inline-flex';
    } else {
        if (btn) btn.style.display = 'none';
    }
}
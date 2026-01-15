// c:\Users\demir\OneDrive\Рабочий стол\TOPIK APP\quiz.js

import { state } from '../core/state.js';
import { showToast, showComboEffect, parseBilingualString, playTone } from '../utils/utils.js'; 
import { ensureSessionStarted, playAndSpeak, saveAndRender } from './ui.js'; 
import { closeModal, openModal } from './ui_modal.js';
import { recordAttempt, scheduleSaveState } from '../core/db.js';
import { addXP, updateStats } from '../core/stats.js';
import { applyBackgroundMusic } from './ui_settings.js';
import { QuizStrategies } from './quiz_strategies.js';
import { findConfusingWords } from '../core/confusing_words.js';

let currentQuizMode, quizWords, quizIndex, quizStart, quizStar = 'all', quizTopic = 'all', quizCategory = 'all', quizSearch = '';
let quizInterval = null, quizCorrectCount = 0, quizSecondsElapsed = 0; 
let quizTimerValue = 0;
let survivalLives = 0;
let isQuizPaused = false; // Флаг паузы для таймера

/**
 * Updates the visual indicator on the Daily Challenge button.
 */
export function updateDailyChallengeUI() {
    const btn = document.querySelector('.fire-btn');
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

/**
 * Checks if Super Challenge is available and shows a toast.
 */
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

/**
 * Initializes the quiz modal and renders mode selection.
 */
export function buildQuizModes() {
    // RESET UI STATE (Восстанавливаем элементы при открытии окна)
    document.getElementById('quiz-search-input').style.display = 'block';
    document.getElementById('quiz-count').style.display = 'block';
    const header = document.querySelector('#quiz-modal .modal-header');
    if (header) header.style.display = 'flex';
    document.getElementById('quiz-game').style.display = 'none';
    document.getElementById('quiz-mode-selector').style.display = 'grid';
    document.getElementById('quiz-difficulty').style.display = 'flex';
    document.getElementById('quiz-filters').style.display = 'flex';

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
    
    quizTopic = state.quizTopic;
    quizCategory = state.quizCategory;
    quizStar = state.quizDifficulty;
    quizSearch = '';

    const sInput = document.getElementById('quiz-search-input');
    if (sInput) {
        sInput.value = '';
        sInput.oninput = (e) => { 
            const target = e.target;
            if (target instanceof HTMLInputElement) {
                quizSearch = target.value.trim().toLowerCase(); 
                updateQuizCount();
            }
        };
    }

    populateQuizFilters();
    populateQuizDifficulty();

    const selector = document.getElementById('quiz-mode-selector');
    selector.innerHTML = '';
    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'quiz-mode-btn';
        btn.dataset.mode = m.mode;
        btn.innerHTML = `<span class="mode-icon">${m.emoji}</span><span class="mode-label">${m.label}</span>`;
        btn.onclick = () => startQuizMode(m.mode);
        selector.appendChild(btn);
    });
    updateQuizCount();
}

function populateQuizFilters() {
    const tSelect = /** @type {HTMLSelectElement} */ (document.getElementById('quiz-topic-select'));
    if (!tSelect) return;

    const topics = new Set();
    state.dataStore.forEach(w => { if (w.type === state.currentType) topics.add(w.topic || w.topic_ru || w.topic_kr); });
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
    const cSelect = /** @type {HTMLSelectElement} */ (document.getElementById('quiz-category-select'));
    if (!cSelect) return;
    const categories = new Set();
    state.dataStore.forEach(w => {
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

/**
 * Starts a specific quiz mode.
 * @param {string} mode - The mode ID (e.g., 'multiple-choice', 'sprint').
 */
export function startQuizMode(mode) {
    currentQuizMode = mode;
    ensureSessionStarted();
    
    const filterFn = (w) => {
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
        // Flatten groups into a list of words to quiz on
        quizWords = groups.flat().sort(() => Math.random() - 0.5).slice(0, 20);
    }
    if (mode === 'association') {
        // Association mode generates its own content per question, just need dummy length
        quizWords = Array(5).fill({ id: 'dummy' }); 
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

    // FIX: Финальная защита от дубликатов в квизе
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
    quizInterval = setInterval(() => {
        if (isQuizPaused) return; // Пауза таймера
        if (currentQuizMode === 'sprint') {
            quizTimerValue--;
            const pct = Math.max(0, (quizTimerValue / 60) * 100);
            if (bar) { bar.style.width = `${pct}%`; bar.style.backgroundColor = `hsl(${Math.floor((pct/100)*120)}, 80%, 45%)`; }
            const el = document.getElementById('quiz-timer-display');
            if (el) { el.innerText = `⏳ ${quizTimerValue}`; el.style.color = quizTimerValue < 10 ? 'var(--danger)' : ''; }
            if (quizTimerValue <= 0) endQuiz(true); // Таймер истек = завершение
        } else if (currentQuizMode === 'survival') {
            quizTimerValue--;
            const el = document.getElementById('quiz-timer-display');
            if (el) { el.innerText = `⏳ ${quizTimerValue}s`; el.style.color = quizTimerValue < 5 ? 'var(--danger)' : ''; }
            const pct = Math.min(100, Math.max(0, (quizTimerValue / 30) * 100));
            if (bar) { bar.style.width = `${pct}%`; bar.style.backgroundColor = `hsl(${Math.min(120, pct * 4)}, 80%, 45%)`; }
            if (quizTimerValue <= 0) endQuiz(true); // Таймер истек = завершение
        } else {
            // FIX: Инкрементируем счетчик, а не вычисляем из Date.now(), чтобы пауза работала
            quizSecondsElapsed++;
            const el = document.getElementById('quiz-timer-display');
            if (el) { el.innerText = `${String(Math.floor(quizSecondsElapsed/60)).padStart(2,'0')}:${String(quizSecondsElapsed%60).padStart(2,'0')}`; el.style.color = ''; }
        }
    }, 1000);

    document.getElementById('quiz-difficulty').style.display = 'none';
    document.getElementById('quiz-filters').style.display = 'none';
    document.getElementById('quiz-mode-selector').style.display = 'none';
    
    // HIDE EXTRA UI (Скрываем поиск, счетчик и шапку с крестиком)
    document.getElementById('quiz-search-input').style.display = 'none';
    document.getElementById('quiz-count').style.display = 'none';
    const header = document.querySelector('#quiz-modal .modal-header');
    if (header) header.style.display = 'none';

    document.getElementById('quiz-game').style.display = 'flex';
    applyBackgroundMusic(true); // Включаем музыку при старте квиза

    nextQuizQuestion();
}

/**
 * Starts the Daily Challenge mode.
 * Selects 5 random words (mix of new and learned) and starts a quiz.
 */
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

        // Super Challenge: 10 words (7 new, 3 review). Normal: 5 words (3 new, 2 review).
        const countNew = isSunday ? 7 : 3;
        const countReview = isSunday ? 3 : 2;
        const total = countNew + countReview;

        const unlearned = state.dataStore.filter(w => !state.learned.has(w.id)).sort(() => Math.random() - 0.5);
        const learned = state.dataStore.filter(w => state.learned.has(w.id)).sort(() => Math.random() - 0.5);

        quizWords = [
            ...unlearned.slice(0, countNew),
            ...learned.slice(0, countReview)
        ];
        
        // FIX: Улучшенная логика заполнения (Fallback)
        // Если слов не хватает (например, мало изученных для повторения),
        // добираем из базы, отдавая приоритет легким словам (★☆☆).
        if (quizWords.length < total) {
            const needed = total - quizWords.length;
            const currentIds = new Set(quizWords.map(w => w.id));
            
            // Сначала ищем легкие слова, которых еще нет в списке
            let easyPool = state.dataStore.filter(w => !currentIds.has(w.id) && w.level === '★☆☆');
            easyPool.sort(() => Math.random() - 0.5);
            
            // Берем сколько есть легких, но не больше чем нужно
            const easyToAdd = easyPool.slice(0, needed);
            quizWords = quizWords.concat(easyToAdd);
            
            // Если все еще не хватает, добираем из остальных
            if (quizWords.length < total) {
                const stillNeeded = total - quizWords.length;
                const currentIdsUpdated = new Set(quizWords.map(w => w.id));
                const others = state.dataStore.filter(w => !currentIdsUpdated.has(w.id));
                others.sort(() => Math.random() - 0.5);
                quizWords = quizWords.concat(others.slice(0, stillNeeded));
            }
        }

        quizIndex = 0;
        quizStart = Date.now();
        quizCorrectCount = 0;
        
        // UI Setup
        document.getElementById('quiz-difficulty').style.display = 'none';
        document.getElementById('quiz-filters').style.display = 'none';
        document.getElementById('quiz-mode-selector').style.display = 'none';
        document.getElementById('quiz-search-input').style.display = 'none';
        document.getElementById('quiz-count').style.display = 'none';
        const header = document.querySelector('#quiz-modal .modal-header');
        if (header) header.style.display = 'none';

        document.getElementById('quiz-game').style.display = 'flex';
        applyBackgroundMusic(true); // Включаем музыку при старте квиза

        nextQuizQuestion();
        showToast(isSunday ? '🌟 СУПЕР-ВЫЗОВ начат! (x2 Награда)' : '🔥 Ежедневный вызов начат!');
    };

    // FIX: Если окно закрыто, открываем и ждем инициализации, чтобы не сбить UI
    const modal = document.getElementById('quiz-modal');
    if (!modal.classList.contains('active')) {
        openModal('quiz-modal');
        setTimeout(launch, 300);
    } else {
        launch();
    }
}

function openDailyStatusModal() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const streak = state.dailyChallenge.streak || 0;
    // Если серия продолжится завтра, она увеличится на 1
    // Проверяем, будет ли завтра воскресенье (Супер-вызов)
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

/**
 * Renders the next question in the quiz sequence.
 */
export function nextQuizQuestion() {
    if (quizIndex >= quizWords.length) { endQuiz(); return; }
    const container = document.getElementById('quiz-opts');
    
    // Очищаем доп. информацию от предыдущего вопроса
    const infoEl = document.getElementById('quiz-extra-info');
    if (infoEl) infoEl.remove();

    if (container) container.querySelectorAll('.quiz-option').forEach(btn => btn.disabled = false);
    const progressEl = document.getElementById('quiz-progress-fill');
    if (progressEl) progressEl.style.backgroundColor = '';

    preloadNextAudio();
    const word = quizWords[quizIndex];
    const scoreEl = document.getElementById('quiz-score');
    if(scoreEl) scoreEl.innerText = `Вопрос ${quizIndex + 1} / ${quizWords.length}`;
    if (currentQuizMode === 'survival') {
        if(scoreEl) scoreEl.innerText = `❤️ ${survivalLives}`;
    }
    
    const qEl = document.getElementById('quiz-q');
    
    // Определяем стратегию. Для 'survival' и 'true-false' используем существующие стратегии
    let strategyKey = currentQuizMode;
    
    // FIX: Для ежедневных вызовов выбираем случайный режим для каждого вопроса
    if (currentQuizMode === 'daily' || currentQuizMode === 'super-daily') {
        const allowed = ['multiple-choice', 'reverse'];
        // Добавляем аудио-режим, если есть озвучка
        if (word.audio_url || word.audio_male) allowed.push('audio');
        strategyKey = allowed[Math.floor(Math.random() * allowed.length)];
    } else if (currentQuizMode === 'mix') {
        // Логика для режима Микс: используем все доступные стратегии для конкретного слова
        const allowed = ['multiple-choice', 'reverse', 'typing', 'flashcard', 'true-false'];
        
        // Если есть аудио
        if (word.audio_url || word.audio_male) {
            allowed.push('audio');
            allowed.push('dictation');
        }
        
        // Если есть примеры
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
    
    strategy.render(word, container, (isCorrect, autoAdvance, forceNext) => {
        if (forceNext) {
            if (quizIndex < quizWords.length - 1) { quizIndex++; nextQuizQuestion(); } else { endQuiz(true); }
            return;
        }
        recordQuizAnswer(isCorrect, autoAdvance);
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

function recordQuizAnswer(isCorrect, autoAdvance = true) {
    const word = quizWords[quizIndex];
    recordAttempt(word.id, isCorrect);

    // Отображаем синонимы/антонимы, если они есть
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
            
            // Визуальный эффект пульсации при потере жизни
            document.body.classList.add('pulse-red-effect');
            setTimeout(() => document.body.classList.remove('pulse-red-effect'), 700);
            
            playTone('life-lost', 400);
            
            if (survivalLives <= 0) {
                showToast('☠️ Жизни закончились!'); endQuiz(true); return; 
            } else {
                showToast('💔 Минус жизнь!', 800);
            }
        }
        document.body.classList.add('wrong-flash'); setTimeout(() => document.body.classList.remove('wrong-flash'), 700);
    }
    saveAndRender();
    // Не проигрываем обычный звук ошибки в режиме выживания, так как уже сыграли life-lost
    if (currentQuizMode !== 'survival' || isCorrect) {
        playTone(isCorrect ? 'success' : 'failure');
    }

    const advance = () => {
        if (currentQuizMode === 'essay' || !autoAdvance) return;
        // Если есть доп. информация, даем больше времени на чтение (2.5 сек), иначе стандартные 0.5 сек
        const delay = hasExtraInfo ? 2500 : 500;
        setTimeout(() => { if (quizIndex < quizWords.length - 1) { quizIndex++; nextQuizQuestion(); } else { endQuiz(); } }, delay);
    };

    if (isCorrect) {
        isQuizPaused = true; // Ставим на паузу во время озвучки
        playAndSpeak(word).then(() => { isQuizPaused = false; advance(); });
    } else {
        advance();
    }
}

function endQuiz() {
    if (quizInterval) clearInterval(quizInterval);
    if (currentQuizMode === 'sprint' && quizCorrectCount > state.userStats.sprintRecord) { state.userStats.sprintRecord = quizCorrectCount; showComboEffect(`🏆 Рекорд: ${quizCorrectCount}!`); }
    if (currentQuizMode === 'survival' && quizCorrectCount > state.userStats.survivalRecord) state.userStats.survivalRecord = quizCorrectCount;
    
    if (currentQuizMode === 'daily') {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        let streak = state.dailyChallenge.streak || 0;
        
        // Логика серии: если последний раз был вчера, увеличиваем. Иначе сброс (если не сегодня).
        if (state.dailyChallenge.lastDate === yesterday) streak++;
        else if (state.dailyChallenge.lastDate !== today) streak = 1;

        // Награда: 50 база + 10 за каждый день серии (макс 70 бонуса)
        const baseCoins = 50;
        const streakBonus = Math.min(streak, 7) * 10;
        const totalCoins = baseCoins + streakBonus;

        addXP(50); // XP (+50 coins implicitly from XP)
        state.userStats.coins += totalCoins; // Extra coins
        updateStats();
        
        state.dailyChallenge = { lastDate: today, completed: true, streak: streak };
        localStorage.setItem('daily_challenge_v1', JSON.stringify(state.dailyChallenge));
        showComboEffect(`🔥 Вызов пройден!\n+50 XP | +${totalCoins + 50} 💰\nСерия: ${streak} дн.`);
        updateDailyChallengeUI();
        if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    // FIX: Условие было неверным. Сессия всегда активна во время квиза.
    if (state.sessionActive && quizWords && quizIndex >= 0) {
        const count = quizIndex + 1;
        state.sessions.push({ date: new Date().toISOString(), duration: Math.round((Date.now() - quizStart)/1000), wordsReviewed: count, accuracy: count > 0 ? Math.round((quizCorrectCount/count)*100) : 0 });
        localStorage.setItem('sessions_v5', JSON.stringify(state.sessions));
        scheduleSaveState(); // FIX: Синхронизируем сессию с облаком
    }
    
    const quizGameEl = document.getElementById('quiz-game');
    if (quizGameEl) quizGameEl.style.display = 'none';
    const quizModeSelectorEl = document.getElementById('quiz-mode-selector');
    if (quizModeSelectorEl) quizModeSelectorEl.style.display = 'grid';
    const quizDifficultyEl = document.getElementById('quiz-difficulty');
    if (quizDifficultyEl) quizDifficultyEl.style.display = 'flex';
    const quizFiltersEl = document.getElementById('quiz-filters');
    if (quizFiltersEl) quizFiltersEl.style.display = 'flex';
    applyBackgroundMusic(); // Обновляем трек (возврат к меню/дзену)
    
    // RESTORE UI (Возвращаем скрытые элементы)
    const searchInputEl = document.getElementById('quiz-search-input');
    if (searchInputEl) searchInputEl.style.display = 'block';
    const quizCountEl = document.getElementById('quiz-count');
    if (quizCountEl) quizCountEl.style.display = 'block';
    const header = document.querySelector('#quiz-modal .modal-header');
    if (header) header.style.display = 'flex';

    showToast('🏁 Квиз завершен!');
    // FIX: Не закрываем модалку, а возвращаемся к выбору режимов
    // closeModal('quiz-modal'); 
}

/**
 * Forcefully stops the quiz (used when modal is closed externally).
 */
export function quitQuiz() {
    if (quizInterval) clearInterval(quizInterval);
    endQuiz(false); // false означает досрочный выход
}

/**
 * Updates the count of available words for the quiz based on filters.
 */
export function updateQuizCount() {
    const countEl = document.getElementById('quiz-count');
    if (!countEl) return;
    const filterFn = (w) => {
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
    const notLearned = state.dataStore.filter(w => filterFn(w) && !state.learned.has(w.id)).length;
    countEl.textContent = `Неизучено: ${notLearned} / Всего: ${total} (по фильтру)`;
    updateQuizModesAvailability();
    updateResetButton();
}

/**
 * Enables/disables quiz modes based on word availability.
 */
export function updateQuizModesAvailability() {
    const selector = document.getElementById('quiz-mode-selector');
    if (!selector) return;
    const buttons = selector.querySelectorAll('.quiz-mode-btn');
    const filterFn = (w) => {
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
    buttons.forEach(btn => {
        const mode = btn.dataset.mode;
        let count = basePool.length;
        let reason = '';
        let minWords = 1; // Базовый минимум для старта (остальное добьем паддингом)

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
            // Always available if we have enough words in general
            count = state.dataStore.length; 
        } else if (mode === 'association') {
            count = state.dataStore.length; // Simplified check
        } else {
            // Для обычных режимов разрешаем старт от 1 слова
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
                const sInput = /** @type {HTMLInputElement} */ (document.getElementById('quiz-search-input'));
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

// c:\Users\demir\OneDrive\Рабочий стол\TOPIK APP\stats.js

import { state } from './state.js';
import { client } from './supabaseClient.js';
import { showToast, parseBilingualString } from '../utils/utils.js';
import { scheduleSaveState } from './db.js';
import { showLevelUpAnimation } from '../ui/ui_interactions.js';
import { Scheduler } from './scheduler.js';

/**
 * Calculates XP required for the next level.
 * @param {number} lvl 
 * @returns {number}
 */
export function getXPForNextLevel(lvl) {
    return 100 + (lvl * 50);
}

/**
 * Adds XP to user stats and handles level up.
 * @param {number} val 
 */
export function addXP(val) {
    state.userStats.xp += val;
    if (val > 0) state.userStats.coins += val; // Earn coins for positive XP
    let required = getXPForNextLevel(state.userStats.level);
    while (state.userStats.xp >= required) {
        state.userStats.xp -= required;
        state.userStats.level++;
        required = getXPForNextLevel(state.userStats.level);
        showLevelUpAnimation(state.userStats.level);
    }
    updateXPUI();
}

/**
 * Updates the XP bar and level display in the UI.
 */
export function updateXPUI() {
    const lvl = state.userStats.level;
    const xp = state.userStats.xp;
    const denom = getXPForNextLevel(lvl);
    const userLevel = document.getElementById('user-level');
    if(userLevel) userLevel.innerText = String(lvl);
    const xpText = document.getElementById('xp-text');
    if (xpText) xpText.innerText = `${xp}/${denom}`;
    
    const bar = document.getElementById('xp-fill');
    if (bar) {
        const targetWidth = `${(xp / denom) * 100}%`;
        // Анимация при первой загрузке (когда inline-стиль еще пуст)
        if (!bar.style.width) setTimeout(() => { bar.style.width = targetWidth; }, 500);
        else bar.style.width = targetWidth;
    }
}

/**
 * Updates the stats display in the main UI strip.
 */
export function updateStats() {
    const s = /** @type {any} */ (state);
    // Update header coin count
    const headerCoins = document.getElementById('coins-count-header');
    if (headerCoins) headerCoins.innerText = String(state.userStats.coins);

    // Update stats strip inside the modal
    const strip = document.getElementById('stats-strip');
    if (!strip) return;

    const accuracy = calculateOverallAccuracy();
    const stats = [
        { label: 'Серия', value: s.streak.count, icon: '🔥', color: 'var(--danger)' },
        { label: 'Изучено', value: state.learned.size, icon: '📚', color: 'var(--success)' },
        { label: 'Точность', value: accuracy, icon: '🎯', color: 'var(--primary)', isChart: true },
        { label: 'Ошибок', value: state.mistakes.size, icon: '⚠️', color: 'var(--warning)' },
        { label: 'Сессии', value: s.sessions.length, icon: '⏱', color: 'var(--info)' },
    ];

    strip.innerHTML = stats.map(s => {
        if (s.isChart) {
            return `
                <div class="stat-card-primary" style="border-bottom: 3px solid ${s.color}">
                    <div class="stat-chart-wrapper">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle-fill" stroke="${s.color}" stroke-dasharray="${s.value}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="stat-chart-text">${s.value}%</div>
                    </div>
                    <div class="stat-label-primary">${s.label}</div>
                </div>
            `;
        }
        return `
        <div class="stat-card-primary" style="border-bottom: 3px solid ${s.color}">
            <div class="stat-icon-primary">${s.icon}</div>
            <div class="stat-info-primary">
                <div class="stat-value-primary">${s.value}</div>
                <div class="stat-label-primary">${s.label}</div>
            </div>
        </div>
    `}).join('');
}

/**
 * Updates the SRS badge count and review button state.
 */
export function updateSRSBadge() {
    try {
        Scheduler.init({ dataStore: state.dataStore, wordHistory: state.wordHistory });
        const q = Scheduler.getQueue({ limit: 999 });
        const badge = document.getElementById('srs-badge');
        if (badge) { badge.textContent = String(q.length); badge.style.display = q.length > 0 ? 'inline-block' : 'none'; }
        
        const reviewBtn = document.querySelector('.nav-btn[onclick="openReviewMode()"]');
        if (reviewBtn) {
            if (q.length > 0) {
                reviewBtn.classList.add('has-reviews');
            } else {
                reviewBtn.classList.remove('has-reviews');
            }
        }
    } catch(e) {
        console.warn('SRS Badge update failed:', e);
    }
}

/**
 * Calculates overall accuracy percentage based on word history.
 * @returns {number} 0-100
 */
export function calculateOverallAccuracy() {
    let totalAttempts = 0, totalCorrect = 0;
    Object.values(state.wordHistory).forEach(w => {
        if (w && typeof w.attempts === 'number') { totalAttempts += w.attempts; totalCorrect += w.correct; }
    });
    if (totalAttempts === 0) return 0;
    return Math.round((totalCorrect / totalAttempts) * 100);
}

/**
 * Sets the daily study goal.
 * @param {'words'|'time'} type 
 * @param {string|number} target 
 */
export function setStudyGoal(type, target) {
    const s = /** @type {any} */ (state);
    s.studyGoal = { type, target: parseInt(String(target)) };
    localStorage.setItem('study_goal_v1', JSON.stringify(s.studyGoal));
    scheduleSaveState();
    renderDetailedStats(); // Re-render to show updates
    showToast('Цель обновлена! 🎯');
}

/**
 * Calculates progress towards the daily goal.
 * @returns {{current: number, target: number, percent: number}}
 */
function getGoalProgress() {
    const s = /** @type {any} */ (state);
    const today = new Date().toDateString();
    let current = 0;
    
    if (s.studyGoal.type === 'words') {
        // Count words learned today based on wordHistory lastReview
        // Note: This is an approximation. Ideally we'd track "learnedDate".
        // Using 'learned' set size change is hard without history.
        // Instead, let's count unique words reviewed today in sessions.
        // Or simpler: count sessions wordsReviewed for today.
        s.sessions.forEach((/** @type {any} */ session) => {
            if (new Date(session.date).toDateString() === today) {
                current += (session.wordsReviewed || 0);
            }
        });
    } else {
        s.sessions.forEach((/** @type {any} */ session) => {
            if (new Date(session.date).toDateString() === today) {
                current += Math.round((session.duration || 0) / 60); // Minutes
            }
        });
    }
    
    const percent = Math.min(100, Math.round((current / s.studyGoal.target) * 100));
    return { current, target: s.studyGoal.target, percent };
}

/**
 * Renders detailed statistics into the stats modal.
 */
export function renderDetailedStats() {
    const s = /** @type {any} */ (state);
    // FIX: Memory Leak. Отписываемся от обновлений лидерборда при возврате к статистике или закрытии окна
    if (leaderboardSubscription) {
        client.removeChannel(leaderboardSubscription);
        leaderboardSubscription = null;
    }

    const container = document.getElementById('stats-details');
    if (!container) return;
    
    const totalTimeSeconds = s.sessions.reduce((/** @type {number} */ acc, /** @type {any} */ s) => acc + (s.duration || 0), 0);
    const totalHours = Math.floor(totalTimeSeconds / 3600);
    const totalMinutes = Math.floor((totalTimeSeconds % 3600) / 60);
    const totalReviews = s.sessions.reduce((/** @type {number} */ acc, /** @type {any} */ s) => acc + (s.wordsReviewed || 0), 0);
    
    // Count Mastered Words (>90% accuracy)
    const masteredCount = Object.values(state.wordHistory).filter(h => {
        return h.attempts >= 3 && (h.correct / h.attempts) >= 0.9;
    }).length;

    // Weakest words logic
    const weakWords = Object.entries(state.wordHistory)
        .map(([id, stats]) => {
            const word = state.dataStore.find(w => String(w.id) === String(id));
            if (!word) return null;
            const acc = stats.attempts > 0 ? (stats.correct / stats.attempts) : 1;
            return { ...word, acc, attempts: stats.attempts };
        })
        .filter(w => w && w.acc < 0.85 && w.attempts >= 3)
        .sort((a, b) => a.acc - b.acc)
        .slice(0, 5);

    let weakHtml = '';
    if (weakWords.length > 0) {
        weakHtml = `
            <div style="margin-top: 25px;">
                <div class="stats-title" style="margin-bottom:10px;">⚠️ Требуют внимания</div>
                <div class="weak-words-list">
                    ${weakWords.map(w => `
                        <div class="weak-word-item">
                            <div>
                                <div style="font-weight:bold;">${w.word_kr}</div>
                                <div style="font-size:12px; opacity:0.8;">${w.translation}</div>
                            </div>
                            <div class="weak-word-acc" style="color:var(--danger); font-weight:bold;">${Math.round(w.acc * 100)}%</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Goal UI
    const goal = getGoalProgress();
    const goalHtml = `
        <div class="goal-card">
            <div class="goal-header">
                <div class="goal-title">🎯 Цель на день</div>
                <div class="goal-percent">${goal.percent}%</div>
            </div>
            <div class="goal-progress-container">
                <div class="goal-progress-bar" style="width:${goal.percent}%; background: ${goal.percent >= 100 ? 'var(--success)' : 'var(--primary)'}"></div>
            </div>
            <div class="goal-footer">
                <span class="goal-status">${goal.current} / ${goal.target} ${s.studyGoal.type === 'words' ? 'слов' : 'мин'}</span>
                <select id="goal-select" class="goal-select" onchange="import('./js/core/stats.js').then(m => m.setStudyGoal(this.value.split(':')[0], this.value.split(':')[1]))">
                    <option value="words:10" ${s.studyGoal.type === 'words' && s.studyGoal.target === 10 ? 'selected' : ''}>10 слов</option>
                    <option value="words:30" ${s.studyGoal.type === 'words' && s.studyGoal.target === 30 ? 'selected' : ''}>30 слов</option>
                    <option value="words:50" ${s.studyGoal.type === 'words' && s.studyGoal.target === 50 ? 'selected' : ''}>50 слов</option>
                    <option value="time:10" ${s.studyGoal.type === 'time' && s.studyGoal.target === 10 ? 'selected' : ''}>10 мин</option>
                    <option value="time:30" ${s.studyGoal.type === 'time' && s.studyGoal.target === 30 ? 'selected' : ''}>30 мин</option>
                </select>
            </div>
        </div>
    `;

    // Detailed Grid (Grouped)
    const detailsHtml = `
        <div class="stats-section-title">Общая статистика</div>
        <div class="stats-grid-detailed">
            <div class="stat-box-detailed"><div class="stat-icon-sm">⏳</div><div class="stat-content-det"><div class="stat-val-det">${totalHours}ч ${totalMinutes}м</div><div class="stat-lbl-det">Время</div></div></div>
            <div class="stat-box-detailed"><div class="stat-icon-sm">🎓</div><div class="stat-content-det"><div class="stat-val-det">${state.userStats.xp}</div><div class="stat-lbl-det">XP</div></div></div>
            <div class="stat-box-detailed"><div class="stat-icon-sm">🔄</div><div class="stat-content-det"><div class="stat-val-det">${totalReviews}</div><div class="stat-lbl-det">Повторений</div></div></div>
            <div class="stat-box-detailed"><div class="stat-icon-sm">👑</div><div class="stat-content-det"><div class="stat-val-det">${masteredCount}</div><div class="stat-lbl-det">Мастер</div></div></div>
        </div>

        <div class="stats-section-title">Рекорды</div>
        <div class="stats-grid-detailed">
            <div class="stat-box-detailed record-box"><div class="stat-icon-sm">⚡</div><div class="stat-content-det"><div class="stat-val-det">${state.userStats.sprintRecord || 0}</div><div class="stat-lbl-det">Спринт</div></div></div>
            <div class="stat-box-detailed record-box"><div class="stat-icon-sm">☠️</div><div class="stat-content-det"><div class="stat-val-det">${state.userStats.survivalRecord || 0}</div><div class="stat-lbl-det">Выживание</div></div></div>
        </div>
    `;

    container.innerHTML = `
        ${goalHtml}
        ${detailsHtml}
        <button class="btn leaderboard-btn" onclick="import('./js/core/stats.js').then(m => m.renderLeaderboard())">
            <span>🏆</span> Таблица лидеров
        </button>
        ${weakHtml}
    `;
}

/**
 * Renders topic mastery progress bars.
 */
export function renderTopicMastery() {
    /** @type {Record<string, {total: number, learned: number, display: string}>} */
    const topics = {};
    state.dataStore.forEach(word => {
        let parsed;
        if (word.topic) parsed = parseBilingualString(word.topic);
        else if (word.topic_kr || word.topic_ru) parsed = { kr: word.topic_kr || word.topic_ru, ru: word.topic_ru || word.topic_kr };
        else parsed = { kr: '기타', ru: 'Общее' };

        const topicKey = parsed.kr !== parsed.ru ? parsed.kr : parsed.ru;
        if (!topics[topicKey]) topics[topicKey] = { total: 0, learned: 0, display: `${parsed.kr} (${parsed.ru})` };
        topics[topicKey].total++;
        if (state.learned.has(word.id)) topics[topicKey].learned++;
    });

    const container = document.getElementById('topic-mastery');
    if (!container) return;
    
    container.innerHTML = '<div class="stats-section-title">Прогресс по темам</div>';
    const grid = document.createElement('div');
    grid.className = 'topic-mastery-grid';
    
    Object.values(topics).forEach(data => {
        const percent = Math.round((data.learned / data.total) * 100);
        const div = document.createElement('div');
        div.className = 'topic-bar';
        div.innerHTML = `
            <div class="topic-info">
                <div class="topic-name">${data.display}</div>
                <div class="topic-stats">${data.learned}/${data.total}</div>
            </div>
            <div class="mastery-bar"><div class="mastery-fill" style="width:${percent}%"></div></div>
        `;
        grid.appendChild(div);
    });
    container.appendChild(grid);
}

/**
 * Renders the activity chart (sessions per day).
 */
export function renderActivityChart() {
    const s = /** @type {any} */ (state);
    const last7Days = [];
    /** @type {Record<string, number>} */
    const sessionsByDay = {};

    // Инициализация последних 7 дней с корректным расчетом дат
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toDateString();
        last7Days.push({ key: dateKey, label: d.toLocaleDateString('ru-RU', { weekday: 'short' }) });
        sessionsByDay[dateKey] = 0;
    }

    s.sessions.forEach((/** @type {any} */ s) => {
        const key = new Date(s.date).toDateString();
        if (sessionsByDay[key] !== undefined) sessionsByDay[key]++;
    });

    const sessionValues = Object.values(sessionsByDay);
    const maxSessions = sessionValues.length > 0 ? Math.max(...sessionValues, 1) : 1;
    const chart = document.getElementById('activity-chart');
    if (!chart) return;
    chart.innerHTML = '';
    
    last7Days.forEach(day => {
        const count = sessionsByDay[day.key];
        const height = count > 0 ? (count / maxSessions) * 80 : 0;
        const bar = document.createElement('div'); bar.className = 'chart-bar';
        if (count > 0) {
            const fill = document.createElement('div'); fill.className = 'chart-fill'; fill.style.height = `${height}px`; bar.appendChild(fill);
        }
        const label = document.createElement('div'); label.className = 'chart-label'; label.textContent = day.label; bar.appendChild(label);
        chart.appendChild(bar);
    });
}

/**
 * Renders the learned words chart.
 */
export function renderLearnedChart() {
    const s = /** @type {any} */ (state);
    const last7Days = [];
    /** @type {Record<string, number>} */
    const learnedByDay = {};
    
    // Инициализация последних 7 дней
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toDateString();
        last7Days.push({ key: dateKey, label: d.toLocaleDateString('ru-RU', { weekday: 'short' }) });
        learnedByDay[dateKey] = 0;
    }

    // FIX: Используем данные сессий для точного отображения активности за день
    s.sessions.forEach((/** @type {any} */ s) => {
        const d = new Date(s.date).toDateString();
        if (learnedByDay[d] !== undefined) {
            learnedByDay[d] += (s.wordsReviewed || 0);
        }
    });

    const chart = document.getElementById('learned-chart');
    if (!chart) return;
    chart.innerHTML = '';
    
    const maxVal = Math.max(...Object.values(learnedByDay), 1);

    last7Days.forEach(day => {
        const count = learnedByDay[day.key];
        const height = count > 0 ? (count / maxVal) * 80 : 0;
        const bar = document.createElement('div'); bar.className = 'chart-bar';
        if (count > 0) {
            const fill = document.createElement('div'); fill.className = 'chart-fill'; 
            fill.style.height = `${height}px`; fill.style.background = 'var(--info)'; fill.title = `${count} слов`;
            bar.appendChild(fill);
        }
        const label = document.createElement('div'); label.className = 'chart-label'; label.textContent = day.label;
        bar.appendChild(label);
        chart.appendChild(bar);
    });
}

/**
 * Renders the forgetting curve chart based on SRS data.
 */
export function renderForgettingCurve() {
    const container = document.getElementById('forgetting-chart');
    if (!container) return;

    const counts = new Array(15).fill(0);
    const now = Date.now();
    const oneDay = 86400000;

    // FIX: Учитываем все слова с историей (включая ошибки), а не только learned
    state.dataStore.forEach(word => {
        const id = word.id;
        const h = state.wordHistory[id];
        if (!h || (!h.lastReview && !h.sm2)) return;

        let nextReview = 0;
        if (h.sm2 && h.sm2.nextReview) nextReview = h.sm2.nextReview;
        
        let diffDays = 0;
        if (nextReview > now) {
            diffDays = Math.ceil((nextReview - now) / oneDay);
        }
        
        if (diffDays < 0) diffDays = 0;
        if (diffDays >= 14) diffDays = 14;
        
        counts[diffDays]++;
    });
    
    const maxVal = Math.max(...counts, 1);
    
    container.innerHTML = counts.map((count, i) => {
        const height = (count / maxVal) * 100;
        const label = i === 0 ? 'Сейч.' : (i === 14 ? '14+' : i);
        const color = i === 0 ? 'var(--danger)' : (i < 3 ? 'var(--warning)' : 'var(--success)');
        
        return `
            <div class="chart-bar" style="justify-content: flex-end; background: var(--surface-1); border: 1px solid var(--surface-2); padding-top: 10px;">
                <div style="font-weight: bold; font-size: 10px; margin-bottom: 5px;">${count > 0 ? count : ''}</div>
                <div class="chart-fill" style="height: ${height}%; background: ${color}; min-height: ${count > 0 ? '4px' : '0'};" title="${label}: ${count}"></div>
                <div class="chart-label" style="margin-top: 5px;">${label}</div>
            </div>
        `;
    }).join('');
}


/** @type {any} */
let leaderboardSubscription = null;

/**
 * Returns the list of all available achievements.
 */
export function getAchievementDefinitions() {
    const s = /** @type {any} */ (state);
    // Helper to count mastered words
    const getMasteredCount = () => Object.values(state.wordHistory).filter(h => h.attempts >= 3 && (h.correct / h.attempts) >= 0.9).length;

    return [
        // Learning
        { id: 'first_10', title: 'Первые шаги', description: 'Выучить 10 слов', emoji: '🎯', progress: () => state.learned.size, max: 10 },
        { id: 'first_50', title: 'Словарный запас', description: 'Выучить 50 слов', emoji: '💪', progress: () => state.learned.size, max: 50 },
        { id: 'first_100', title: 'Сотня!', description: 'Выучить 100 слов', emoji: '🔥', progress: () => state.learned.size, max: 100 },
        { id: 'master_10', title: 'Мастер', description: 'Довести 10 слов до 90% точности', emoji: '👑', progress: getMasteredCount, max: 10 },
        { id: 'master_50', title: 'Сэнсэй', description: 'Довести 50 слов до 90% точности', emoji: '🎓', progress: getMasteredCount, max: 50 },
        { id: 'first_favorite', title: 'На заметку', description: 'Добавить первое слово в избранное', emoji: '❤️', progress: () => state.favorites.size, max: 1 },
        { id: 'zero_mistakes', title: 'Перфекционист', description: 'Выучить 5 слов без единой ошибки', emoji: '✨', progress: () => (state.mistakes.size === 0 && state.learned.size >= 5) ? 1 : 0, max: 1 },
        
        // Streak & Sessions
        { id: 'streak_3', title: 'Начало положено', description: 'Серия занятий 3 дня подряд', emoji: '🌱', progress: () => s.streak.count, max: 3 },
        { id: 'streak_7', title: 'Марафонец', description: 'Серия занятий 7 дней подряд', emoji: '🏆', progress: () => s.streak.count, max: 7 },
        { id: 'sessions_5', title: 'Регулярность', description: 'Завершить 5 учебных сессий', emoji: '📚', progress: () => s.sessions.length, max: 5 },
        
        // Quiz & Economy
        { id: 'sprint_20', title: 'Спринтер', description: 'Набрать 20 очков в Спринте', emoji: '⚡', progress: () => state.userStats.sprintRecord || 0, max: 20 },
        { id: 'survival_20', title: 'Выживший', description: 'Набрать 20 очков в Выживании', emoji: '☠️', progress: () => state.userStats.survivalRecord || 0, max: 20 },
        { id: 'collector_1000', title: 'Коллекционер', description: 'Накопить 1000 монет', emoji: '💰', progress: () => state.userStats.coins, max: 1000 },
        { id: 'shopaholic', title: 'Покупатель', description: 'Купить предмет в магазине', emoji: '🛍️', progress: () => state.userStats.streakFreeze > 0 ? 1 : 0, max: 1 },

        // Level
        { id: 'level_5', title: 'Пятый уровень', description: 'Достичь 5 уровня', emoji: '⭐', progress: () => state.userStats.level, max: 5 },
        { id: 'level_10', title: 'Десятый уровень', description: 'Достичь 10 уровня', emoji: '🌟', progress: () => state.userStats.level, max: 10 },

        // Secret
        { id: 'night_owl', title: 'Ночная сова', description: 'Секретное достижение', secretDesc: 'Заниматься после 23:00', emoji: '🦉', progress: () => new Date().getHours() >= 23 ? 1 : 0, max: 1, secret: true },
        { id: 'early_bird', title: 'Жаворонок', description: 'Секретное достижение', secretDesc: 'Заниматься до 6:00 утра', emoji: '🌅', progress: () => new Date().getHours() < 6 ? 1 : 0, max: 1, secret: true }
    ];
}

/**
 * Checks if any new achievements have been unlocked.
 * @param {boolean} [showAlert=true] 
 */
export function checkAchievements(showAlert = true) {
    const s = /** @type {any} */ (state);
    const defs = getAchievementDefinitions();
    defs.forEach(ach => {
        if (s.achievements.find((/** @type {any} */ a) => a.id === ach.id)) return;
        // Use progress and max for condition
        if (ach.progress() >= ach.max) {
            s.achievements.push({ id: ach.id, date: Date.now() });
            if (showAlert) {
                showToast(`🎉 Новое достижение: ${ach.emoji} ${ach.title}`);
                // Запуск конфетти
                // @ts-ignore
                if (typeof confetti === 'function') {
                    // @ts-ignore
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        zIndex: 20005 // Поверх модальных окон
                    });
                }
            }
        }
    });
    localStorage.setItem('achievements_v5', JSON.stringify(s.achievements));
}

/**
 * Renders the achievements list in the modal.
 */
export function renderAchievements() {
    const s = /** @type {any} */ (state);
    const container = document.getElementById('achievements-list');
    const header = document.getElementById('achievements-header');
    if (!container) return;

    container.innerHTML = '';
    const defs = getAchievementDefinitions();
    const unlockedIds = new Set(s.achievements.map((/** @type {any} */ a) => a.id));
    const unlockedCount = unlockedIds.size;
    const totalCount = defs.length;

    // Render header
    if (header) {
        header.innerHTML = `
            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 8px;">Открыто ${unlockedCount} из ${totalCount}</div>
            <div class="xp-bar-container" style="height: 8px; max-width: 300px; margin: 0 auto;">
                <div class="xp-bar-fill" style="width: ${(unlockedCount / totalCount) * 100}%; background: var(--gold);"></div>
            </div>
        `;
    }

    defs.forEach(ach => {
        const isUnlocked = unlockedIds.has(ach.id);
        const card = document.createElement('div');
        card.className = 'achievement-card';
        if (isUnlocked) {
            card.classList.add('unlocked');
        } else {
            card.classList.add('locked');
        }
        
        let icon = ach.emoji, title = ach.title, desc = ach.description;
        if (!isUnlocked && ach.secret) {
            card.classList.add('secret');
            icon = '❓';
            title = 'Секретное достижение';
            desc = 'Выполните особое условие';
        }

        const currentProgress = ach.progress();
        const progressPercent = Math.min(100, (currentProgress / ach.max) * 100);

        let progressBar = '';
        if (!isUnlocked && ach.max > 1) {
            progressBar = `
                <div class="ach-progress-bar">
                    <div class="ach-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="ach-progress-text">${currentProgress} / ${ach.max}</div>
            `;
        }

        card.innerHTML = `
            <div class="achievement-icon">${icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">${title}</div>
                <div class="achievement-desc">${desc}</div>
            </div>
            ${progressBar}
        `;
        container.appendChild(card);
    });
}

/**
 * Fetches and renders the global leaderboard.
 */
export async function renderLeaderboard() {
    const container = document.getElementById('stats-details');
    if (!container) return;

    // Отписываемся от предыдущей подписки, если она была
    if (leaderboardSubscription) {
        client.removeChannel(leaderboardSubscription);
        leaderboardSubscription = null;
    }

    container.innerHTML = '<div style="text-align:center; padding:40px;"><div class="loader-circle" style="width:40px; height:40px; border-width:4px; position:relative; margin:0 auto;"></div><div style="margin-top:15px;">Загрузка топа...</div></div>';

    try {
        const { data, error } = await client
            .from('user_global_stats')
            .select('xp, level, user_id')
            .order('xp', { ascending: false })
            .limit(10);

        if (error) throw error;

        let html = `
            <div style="margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;">
                <h3 style="margin:0;">🏆 Топ-10 Студентов</h3>
                <button class="btn-mini" onclick="import('./js/core/stats.js').then(m => m.renderDetailedStats())">✕</button>
            </div>
            <div class="leaderboard-list" style="display:flex; flex-direction:column; gap:10px;">
        `;

        const currentUserId = (await client.auth.getUser()).data.user?.id;

        data.forEach((/** @type {any} */ user, /** @type {number} */ idx) => {
            const isMe = user.user_id === currentUserId;
            const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
            const bg = isMe ? 'var(--bg-learned)' : 'var(--surface-1)';
            const border = isMe ? '2px solid var(--success)' : '1px solid var(--border-color)';
            
            html += `<div style="display:flex; align-items:center; padding:12px; background:${bg}; border-radius:12px; border:${border};"><div style="font-size:20px; width:40px; font-weight:bold;">${medal}</div><div style="flex:1; font-weight:600;">Студент LVL ${user.level}</div><div style="font-weight:800; color:var(--primary);">${user.xp} XP</div></div>`;
        });

        html += '</div>';
        container.innerHTML = html;

        // Подписка на обновления в реальном времени
        leaderboardSubscription = client
            .channel('public:user_global_stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_global_stats' }, (/** @type {any} */ payload) => {
                // При любом изменении просто перезагружаем список
                renderLeaderboard();
            })
            .subscribe();

    } catch (/** @type {any} */ e) {
        console.error(e);
        container.innerHTML = `<div style="color:var(--danger); text-align:center;">Ошибка загрузки: ${e.message}</div><button class="btn" style="width:100%; margin-top:10px;" onclick="import('./js/core/stats.js').then(m => m.renderDetailedStats())">Назад</button>`;
    }
}
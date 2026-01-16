import { state } from './state.ts';
import { client } from './supabaseClient.ts';
import { showToast } from '../utils/utils.ts';
import { scheduleSaveState } from './db.ts';
// @ts-ignore
import { showLevelUpAnimation } from '../ui/ui_interactions.ts';
import { Scheduler } from './scheduler.ts';
import { Word } from '../types/index.ts';

export function getXPForNextLevel(lvl: number): number {
    return 100 + (lvl * 50);
}

export function addXP(val: number) {
    state.userStats.xp += val;
    if (val > 0) state.userStats.coins += val;
    let required = getXPForNextLevel(state.userStats.level);
    while (state.userStats.xp >= required) {
        state.userStats.xp -= required;
        state.userStats.level++;
        required = getXPForNextLevel(state.userStats.level);
        showLevelUpAnimation(state.userStats.level);
    }
    updateXPUI();
}

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
        if (!bar.style.width) setTimeout(() => { bar.style.width = targetWidth; }, 500);
        else bar.style.width = targetWidth;
    }
}

export function updateStats() {
    const headerCoins = document.getElementById('coins-count-header');
    if (headerCoins) headerCoins.innerText = String(state.userStats.coins);

    const strip = document.getElementById('stats-strip');
    if (!strip) return;

    const accuracy = calculateOverallAccuracy();
    const stats = [
        { label: 'Серия', value: state.streak.count, icon: '🔥', color: 'var(--danger)', isChart: false },
        { label: 'Изучено', value: state.learned.size, icon: '📚', color: 'var(--success)', isChart: false },
        { label: 'Точность', value: accuracy, icon: '🎯', color: 'var(--primary)', isChart: true },
        { label: 'Ошибок', value: state.mistakes.size, icon: '⚠️', color: 'var(--warning)', isChart: false },
        { label: 'Сессии', value: state.sessions.length, icon: '⏱', color: 'var(--info)', isChart: false },
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

export function calculateOverallAccuracy(): number {
    let totalAttempts = 0, totalCorrect = 0;
    Object.values(state.wordHistory).forEach(w => {
        if (w && typeof w.attempts === 'number') { totalAttempts += w.attempts; totalCorrect += w.correct; }
    });
    if (totalAttempts === 0) return 0;
    return Math.round((totalCorrect / totalAttempts) * 100);
}

export function setStudyGoal(type: 'words' | 'time', target: string | number) {
    state.studyGoal = { type, target: parseInt(String(target)) };
    localStorage.setItem('study_goal_v1', JSON.stringify(state.studyGoal));
    scheduleSaveState();
    renderDetailedStats();
    showToast('Цель обновлена! 🎯');
}

let leaderboardSubscription: any = null;

export function getAchievementDefinitions() {
    const getMasteredCount = () => Object.values(state.wordHistory).filter(h => h.attempts >= 3 && (h.correct / h.attempts) >= 0.9).length;

    return [
        { id: 'first_10', title: 'Первые шаги', description: 'Выучить 10 слов', emoji: '🎯', progress: () => state.learned.size, max: 10 },
        { id: 'first_50', title: 'Словарный запас', description: 'Выучить 50 слов', emoji: '💪', progress: () => state.learned.size, max: 50 },
        { id: 'first_100', title: 'Сотня!', description: 'Выучить 100 слов', emoji: '🔥', progress: () => state.learned.size, max: 100 },
        { id: 'master_10', title: 'Мастер', description: 'Довести 10 слов до 90% точности', emoji: '👑', progress: getMasteredCount, max: 10 },
        { id: 'master_50', title: 'Сэнсэй', description: 'Довести 50 слов до 90% точности', emoji: '🎓', progress: getMasteredCount, max: 50 },
        { id: 'first_favorite', title: 'На заметку', description: 'Добавить первое слово в избранное', emoji: '❤️', progress: () => state.favorites.size, max: 1 },
        { id: 'zero_mistakes', title: 'Перфекционист', description: 'Выучить 5 слов без единой ошибки', emoji: '✨', progress: () => (state.mistakes.size === 0 && state.learned.size >= 5) ? 1 : 0, max: 1 },
        { id: 'streak_3', title: 'Начало положено', description: 'Серия занятий 3 дня подряд', emoji: '🌱', progress: () => state.streak.count, max: 3 },
        { id: 'streak_7', title: 'Марафонец', description: 'Серия занятий 7 дней подряд', emoji: '🏆', progress: () => state.streak.count, max: 7 },
        { id: 'sessions_5', title: 'Регулярность', description: 'Завершить 5 учебных сессий', emoji: '📚', progress: () => state.sessions.length, max: 5 },
        { id: 'sprint_20', title: 'Спринтер', description: 'Набрать 20 очков в Спринте', emoji: '⚡', progress: () => state.userStats.sprintRecord || 0, max: 20 },
        { id: 'survival_20', title: 'Выживший', description: 'Набрать 20 очков в Выживании', emoji: '☠️', progress: () => state.userStats.survivalRecord || 0, max: 20 },
        { id: 'collector_1000', title: 'Коллекционер', description: 'Накопить 1000 монет', emoji: '💰', progress: () => state.userStats.coins, max: 1000 },
        { id: 'shopaholic', title: 'Покупатель', description: 'Купить предмет в магазине', emoji: '🛍️', progress: () => state.userStats.streakFreeze > 0 ? 1 : 0, max: 1 },
        { id: 'level_5', title: 'Пятый уровень', description: 'Достичь 5 уровня', emoji: '⭐', progress: () => state.userStats.level, max: 5 },
        { id: 'level_10', title: 'Десятый уровень', description: 'Достичь 10 уровня', emoji: '🌟', progress: () => state.userStats.level, max: 10 },
        { id: 'night_owl', title: 'Ночная сова', description: 'Секретное достижение', secretDesc: 'Заниматься после 23:00', emoji: '🦉', progress: () => new Date().getHours() >= 23 ? 1 : 0, max: 1, secret: true },
        { id: 'early_bird', title: 'Жаворонок', description: 'Секретное достижение', secretDesc: 'Заниматься до 6:00 утра', emoji: '🌅', progress: () => new Date().getHours() < 6 ? 1 : 0, max: 1, secret: true }
    ];
}

export function checkAchievements(showAlert = true) {
    const defs = getAchievementDefinitions();
    defs.forEach(ach => {
        if (state.achievements.find((a: any) => a.id === ach.id)) return;
        if (ach.progress() >= ach.max) {
            state.achievements.push({ id: ach.id, date: Date.now() });
            if (showAlert) {
                showToast(`🎉 Новое достижение: ${ach.emoji} ${ach.title}`);
                if (typeof (window as any).confetti === 'function') {
                    (window as any).confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 20005 });
                }
            }
        }
    });
    localStorage.setItem('achievements_v5', JSON.stringify(state.achievements));
}

export function renderAchievements() {
    const container = document.getElementById('achievements-list');
    const header = document.getElementById('achievements-header');
    if (!container) return;

    container.innerHTML = '';
    const defs = getAchievementDefinitions();
    const unlockedIds = new Set(state.achievements.map((a: any) => a.id));
    const unlockedCount = unlockedIds.size;
    const totalCount = defs.length;

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
        if (isUnlocked) card.classList.add('unlocked'); else card.classList.add('locked');
        
        let icon = ach.emoji, title = ach.title, desc = ach.description;
        if (!isUnlocked && (ach as any).secret) {
            card.classList.add('secret');
            icon = '❓';
            title = 'Секретное достижение';
            desc = 'Выполните особое условие';
        }

        const currentProgress = ach.progress();
        const progressPercent = Math.min(100, (currentProgress / ach.max) * 100);

        let progressBar = '';
        if (!isUnlocked && ach.max > 1) {
            progressBar = `<div class="ach-progress-bar"><div class="ach-progress-fill" style="width: ${progressPercent}%"></div></div><div class="ach-progress-text">${currentProgress} / ${ach.max}</div>`;
        }

        card.innerHTML = `<div class="achievement-icon">${icon}</div><div class="achievement-info"><div class="achievement-title">${title}</div><div class="achievement-desc">${desc}</div></div>${progressBar}`;
        container.appendChild(card);
    });
}

export async function renderLeaderboard() {
    const container = document.getElementById('stats-details');
    if (!container) return;

    if (leaderboardSubscription) {
        client.removeChannel(leaderboardSubscription);
        leaderboardSubscription = null;
    }

    container.innerHTML = '<div style="text-align:center; padding:40px;"><div class="loader-circle" style="width:40px; height:40px; border-width:4px; position:relative; margin:0 auto;"></div><div style="margin-top:15px;">Загрузка топа...</div></div>';

    try {
        const { data, error } = await client.from('user_global_stats').select('xp, level, user_id').order('xp', { ascending: false }).limit(10);
        if (error) throw error;

        let html = `<div style="margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;"><h3 style="margin:0;">🏆 Топ-10 Студентов</h3><button class="btn-mini" onclick="import('./js/core/stats.js').then(m => m.renderDetailedStats())">✕</button></div><div class="leaderboard-list" style="display:flex; flex-direction:column; gap:10px;">`;
        let html = `<div style="margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;"><h3 style="margin:0;">🏆 Топ-10 Студентов</h3><button class="btn-mini" onclick="window.renderDetailedStats()">✕</button></div><div class="leaderboard-list" style="display:flex; flex-direction:column; gap:10px;">`;

        const currentUserId = (await client.auth.getUser()).data.user?.id;

        data.forEach((user: any, idx: number) => {
            const isMe = user.user_id === currentUserId;
            const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
            const bg = isMe ? 'var(--bg-learned)' : 'var(--surface-1)';
            const border = isMe ? '2px solid var(--success)' : '1px solid var(--border-color)';
            html += `<div style="display:flex; align-items:center; padding:12px; background:${bg}; border-radius:12px; border:${border};"><div style="font-size:20px; width:40px; font-weight:bold;">${medal}</div><div style="flex:1; font-weight:600;">Студент LVL ${user.level}</div><div style="font-weight:800; color:var(--primary);">${user.xp} XP</div></div>`;
        });

        html += '</div>';
        container.innerHTML = html;

        leaderboardSubscription = client.channel('public:user_global_stats').on('postgres_changes', { event: '*', schema: 'public', table: 'user_global_stats' }, () => { renderLeaderboard(); }).subscribe();

    } catch (e: any) {
        console.error(e);
        container.innerHTML = `<div style="color:var(--danger); text-align:center;">Ошибка загрузки: ${e.message}</div><button class="btn" style="width:100%; margin-top:10px;" onclick="import('./js/core/stats.js').then(m => m.renderDetailedStats())">Назад</button>`;
        container.innerHTML = `<div style="color:var(--danger); text-align:center;">Ошибка загрузки: ${e.message}</div><button class="btn" style="width:100%; margin-top:10px;" onclick="window.renderDetailedStats()">Назад</button>`;
    }
}

export function renderTopicMastery() {
    const container = document.getElementById('topic-mastery-list');
    if (!container) return;
    container.innerHTML = '';

    const topics: Record<string, { total: number; learned: number }> = {};
    
    state.dataStore.forEach(w => {
        if (w.type !== state.currentType) return;
        const t = w.topic || w.topic_ru || w.topic_kr || 'Other';
        if (!topics[t]) topics[t] = { total: 0, learned: 0 };
        topics[t].total++;
        if (state.learned.has(w.id)) topics[t].learned++;
    });

    Object.entries(topics).forEach(([topic, stats]) => {
        const pct = Math.round((stats.learned / stats.total) * 100);
        const el = document.createElement('div');
        el.className = 'topic-mastery-item';
        el.innerHTML = `
            <div class="topic-name">${topic}</div>
            <div class="topic-progress">
                <div class="topic-bar" style="width: ${pct}%"></div>
            </div>
            <div class="topic-stats">${stats.learned}/${stats.total}</div>
        `;
        container.appendChild(el);
    });
}

// Заглушки для графиков (реализация требует Chart.js или сложной DOM-манипуляции)
export function renderDetailedStats() { console.log('renderDetailedStats called'); }
export function renderActivityChart() {}
export function renderLearnedChart() {}
export function renderAccuracyChart() {}
export function renderForgettingCurve() {}
export function renderSRSDistributionChart() {}
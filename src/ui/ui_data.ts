import { state } from '../core/state.ts';
import { client } from '../core/supabaseClient.ts';
import { showToast } from '../utils/utils.ts';
import { immediateSaveState } from '../core/db.ts';
import { updateStats, updateSRSBadge, updateXPUI, checkAchievements } from '../core/stats.ts';
import { render } from './ui_card.ts';
import { openConfirm } from './ui_modal.ts';
import { saveAndRender } from './ui.ts';

export async function resetAllProgress() {
    try {
        const progressKeys = [
            'user_stats_v5',
            'learned_v5',
            'mistakes_v5',
            'favorites_v5',
            'word_history_v5',
            'streak_v5',
            'sessions_v5',
            'achievements_v5',
            'daily_challenge_v1',
            'dirty_ids_v1'
        ];
        progressKeys.forEach(k => localStorage.removeItem(k));
        
        state.userStats = { xp: 0, level: 1, sprintRecord: 0, survivalRecord: 0, coins: 0, streakFreeze: 0, lastDailyReward: null, achievements: [] };
        state.learned = new Set(); 
        state.mistakes = new Set(); 
        state.favorites = new Set();
        state.wordHistory = {}; 
        state.streak = { count: 0, lastDate: null }; 
        state.sessions = []; 
        state.achievements = [];
        state.dailyChallenge = { lastDate: null, completed: false, streak: 0 };
        state.dirtyWordIds = new Set();

        const { data } = await client.auth.getSession();
        if (data && data.session) {
            showToast('☁️ Очистка облака...');
            await client.from('user_progress').delete().eq('user_id', data.session.user.id);
            await client.from('user_global_stats').delete().eq('user_id', data.session.user.id);
            await client.from('user_global_stats').insert([{ 
                user_id: data.session.user.id, 
                xp: 0, 
                level: 1,
                coins: 0,
                streak_freeze: 0,
                sprint_record: 0,
                survival_record: 0,
                achievements: [],
                sessions: []
            }]);
        }

        const shopBalance = document.getElementById('shop-balance');
        if (shopBalance) shopBalance.innerText = '0';

        immediateSaveState(); updateStats(); updateXPUI(); render(); updateSRSBadge();
        showToast('✅ Прогресс полностью сброшен');
    } catch (e: any) { console.error('resetAllProgress error', e); showToast('Ошибка: ' + e.message); }
}

export async function clearData() { 
    const { data: { session } } = await client.auth.getSession();
    const providers = session?.user?.app_metadata?.providers || [];
    const isEmailAuth = session && providers.includes('email');

    openConfirm(
        isEmailAuth ? 'Для сброса прогресса введите ваш пароль:' : 'Сбросить весь прогресс? Это действие нельзя отменить.', 
        () => resetAllProgress(),
        {
            showInput: isEmailAuth,
            inputPlaceholder: 'Ваш пароль',
            onValidate: isEmailAuth ? async (val: string) => {
                if (!val) { showToast('Введите пароль'); return false; }
                showToast('⏳ Проверка...');
                if (!session?.user?.email) return false;
                const { error } = await client.auth.signInWithPassword({ email: session.user.email, password: val });
                if (error) { showToast('❌ Неверный пароль'); return false; }
                return true;
            } : undefined
        }
    ); 
}

export function exportProgress() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
        stats: state.userStats, learned:[...state.learned], mistakes:[...state.mistakes], favorites:[...state.favorites],
        wordHistory: state.wordHistory, streak: state.streak, sessions: state.sessions, achievements: state.achievements, dailyChallenge: state.dailyChallenge,
        settings: {
            darkMode: state.darkMode, hanjaMode: state.hanjaMode, audioSpeed: state.audioSpeed,
            currentVoice: state.currentVoice, autoUpdate: state.autoUpdate, focusMode: state.focusMode,
            zenMode: state.zenMode, viewMode: state.viewMode, studyGoal: state.studyGoal, themeColor: state.themeColor
        },
        searchHistory: state.searchHistory
    }, null, 2)]));
    const date = new Date().toISOString().split('T')[0];
    a.download = `topik_backup_${date}.json`;
    a.click();
}

export function importProgress(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const target = e.target as FileReader;
            const data = JSON.parse(target.result as string);
            if (!data || typeof data !== 'object') throw new Error('Invalid data format');

            if (data.stats) {
                state.userStats.xp = Number(data.stats.xp) || 0;
                state.userStats.level = Math.max(1, Number(data.stats.level) || 1);
                state.userStats.sprintRecord = data.stats.sprintRecord || 0;
                state.userStats.survivalRecord = data.stats.survivalRecord || 0;
                state.userStats.coins = data.stats.coins || 0;
                state.userStats.streakFreeze = data.stats.streakFreeze || 0;
                state.userStats.lastDailyReward = data.stats.lastDailyReward || null;
            }
            if (Array.isArray(data.learned)) state.learned = new Set(data.learned);
            if (Array.isArray(data.mistakes)) state.mistakes = new Set(data.mistakes);
            if (Array.isArray(data.favorites)) state.favorites = new Set(data.favorites);
            if (data.wordHistory) state.wordHistory = data.wordHistory;
            if (data.streak) state.streak = data.streak;
            if (Array.isArray(data.sessions)) state.sessions = data.sessions;
            if (Array.isArray(data.achievements)) state.achievements = data.achievements;
            if (data.dailyChallenge) state.dailyChallenge = data.dailyChallenge;
            if (Array.isArray(data.searchHistory)) state.searchHistory = data.searchHistory;

            if (data.settings) {
                const s = data.settings;
                if (s.darkMode !== undefined) state.darkMode = s.darkMode;
                if (s.hanjaMode !== undefined) state.hanjaMode = s.hanjaMode;
                if (s.audioSpeed !== undefined) state.audioSpeed = s.audioSpeed;
                if (s.currentVoice !== undefined) state.currentVoice = s.currentVoice;
                if (s.autoUpdate !== undefined) state.autoUpdate = s.autoUpdate;
                if (s.focusMode !== undefined) state.focusMode = s.focusMode;
                if (s.zenMode !== undefined) state.zenMode = s.zenMode;
                if (s.viewMode !== undefined) state.viewMode = s.viewMode;
                if (s.studyGoal !== undefined) state.studyGoal = s.studyGoal;
                if (s.themeColor !== undefined) state.themeColor = s.themeColor;
                if (s.lastDailyReward !== undefined) state.userStats.lastDailyReward = s.lastDailyReward;
            }

            saveAndRender();
            checkAchievements(false);
            showToast('✅ Данные импортированы!');
        } catch (err: any) { showToast('❌ Ошибка импорта: ' + err.message); }
    };
    reader.readAsText(file);
}
import { client } from './supabaseClient.js';
import { state } from './state.js';
import { debounce } from '../utils/utils.js';

/**
 * Internal function to perform the actual sync with Supabase.
 * Pushes local stats to the 'user_global_stats' table.
 */
async function _syncGlobalStats() {
    try {
        const { data: { session } } = await client.auth.getSession();
        if (!session || !session.user) return;

        const updates = {
            user_id: session.user.id,
            xp: state.userStats.xp,
            level: state.userStats.level,
            sprint_record: state.userStats.sprintRecord || 0,
            survival_record: state.userStats.survivalRecord || 0,
            coins: state.userStats.coins || 0,
            streak_freeze: state.userStats.streakFreeze || 0,
            streak_count: state.streak ? state.streak.count : 0,
            achievements: state.achievements || [],
            sessions: state.sessions || [],
            settings: {
                darkMode: state.darkMode,
                hanjaMode: state.hanjaMode,
                audioSpeed: state.audioSpeed,
                currentVoice: state.currentVoice,
                autoUpdate: state.autoUpdate,
                studyGoal: state.studyGoal,
                lastDailyReward: state.userStats.lastDailyReward,
                themeColor: state.themeColor,
                streakLastDate: state.streak ? state.streak.lastDate : null
            },
            updated_at: new Date().toISOString()
        };

        const { error } = await client
            .from('user_global_stats')
            .upsert(updates, { onConflict: 'user_id' });

        if (error) {
            console.warn('⚠️ Global stats sync failed:', error.message);
            if (error.message && error.message.includes('settings')) {
                console.error('🚨 ОШИБКА БД: В таблице user_global_stats нет колонки "settings".\n👉 Скопируйте SQL из файла supabase_leaderboard.sql (раздел 8) и выполните в Supabase SQL Editor.');
            }
        }
    } catch (err) {
        console.warn('⚠️ Global stats sync error:', err);
    }
}

/**
 * Debounced synchronization function.
 * Call this whenever stats change (XP, records, achievements).
 * It will push changes to 'user_global_stats' at most once every 10 seconds.
 */
export const syncGlobalStats = debounce(_syncGlobalStats, 10000);
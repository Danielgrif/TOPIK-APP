import { client } from './supabaseClient.ts';
import { state } from './state.ts';
import { showToast, parseBilingualString } from '../utils/utils.ts';
import { syncGlobalStats } from './sync.ts';
import { Scheduler } from './scheduler.ts';

let _saveTimer: number | null = null;

function validateSchema(data: any[]) {
    if (!data || data.length === 0) return;
    const sample = data[0];
    const required = ['id', 'word_kr', 'translation', 'level', 'type'];
    const missing = required.filter(field => !(field in sample));
    
    if (missing.length > 0) {
        console.error('🚨 CRITICAL: Database schema mismatch. Missing columns:', missing);
        showToast(`⚠️ Ошибка БД: нет колонок ${missing.join(', ')}`);
    }
}

export function scheduleSaveState(delay: number = 300) {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = window.setTimeout(() => {
        immediateSaveState();
        _saveTimer = null;
        syncGlobalStats();
    }, delay);
}

export function immediateSaveState() {
    try {
        localStorage.setItem('user_stats_v5', JSON.stringify(state.userStats));
        localStorage.setItem('learned_v5', JSON.stringify([...state.learned]));
        localStorage.setItem('mistakes_v5', JSON.stringify([...state.mistakes]));
        localStorage.setItem('favorites_v5', JSON.stringify([...state.favorites]));
        localStorage.setItem('word_history_v5', JSON.stringify(state.wordHistory));
        localStorage.setItem('streak_v5', JSON.stringify(state.streak));
        localStorage.setItem('sessions_v5', JSON.stringify(state.sessions));
        localStorage.setItem('achievements_v5', JSON.stringify(state.achievements));
        localStorage.setItem('dirty_ids_v1', JSON.stringify([...state.dirtyWordIds]));
        localStorage.setItem('custom_words_v1', JSON.stringify(state.customWords));
    } catch (e) {
        console.error('Save error:', e);
    }
}

export function updateStreak() {
    const today = new Date().toLocaleDateString('en-CA');
    if (state.streak.lastDate !== today) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yesterday = d.toLocaleDateString('en-CA');
        
        if (state.streak.lastDate === yesterday) state.streak.count++;
        else {
            if (state.userStats.streakFreeze > 0) {
                state.userStats.streakFreeze--;
                showToast('❄️ Заморозка спасла серию!');
                state.streak.count++;
            } else {
                state.streak.count = 1;
            }
        }
        state.streak.lastDate = today;
        localStorage.setItem('streak_v5', JSON.stringify(state.streak));
    }
}

export function recordAttempt(id: number | string, isCorrect: boolean) {
    if (!state.wordHistory[id]) state.wordHistory[id] = { attempts: 0, correct: 0, lastReview: null };
    const stats = state.wordHistory[id];
    stats.attempts++; if (isCorrect) stats.correct++;
    stats.lastReview = Date.now();
    
    if (!isCorrect && stats.sm2) {
        const result = Scheduler.calculate(0, stats.sm2);
        stats.sm2.interval = result.interval;
        stats.sm2.repetitions = result.repetitions;
        stats.sm2.ef = result.ef;
        stats.sm2.nextReview = Date.now();
    }
    
    updateStreak();
    if (state.sessionActive) state.sessionWordsReviewed++;
    scheduleSaveState();
}

export async function fetchVocabulary() {
    try {
        const { data, error } = await client.from('vocabulary').select('*');
        if (error) throw error;
        
        const serverData = data || [];
        
        const serverWordsSet = new Set(serverData.map((w: any) => w.word_kr));
        state.customWords = state.customWords.filter((cw: any) => !serverWordsSet.has(cw.word_kr));
        immediateSaveState();

        state.dataStore = [...serverData, ...state.customWords];
        
        const uniqueMap = new Map();
        state.dataStore.forEach((w: any) => {
            if (w.id && !uniqueMap.has(w.id)) uniqueMap.set(w.id, w);
        });
        state.dataStore = Array.from(uniqueMap.values());

        state.dataStore.forEach((w: any) => {
            if (!w.type) w.type = 'word';
            w._parsedTopic = parseBilingualString(w.topic || w.topic_ru || w.topic_kr);
            w._parsedCategory = parseBilingualString(w.category || w.category_ru || w.category_kr);
            w._searchStr = [w.word_kr, w.translation, w.word_hanja, w.synonyms, w.my_notes].filter(Boolean).join(' ').toLowerCase();
        });

        validateSchema(state.dataStore);
        
        const validIds = new Set(state.dataStore.map((w: any) => String(w.id)));
        
        const cleanSet = (s: Set<any>): Set<string | number> => {
            const newSet = new Set();
            s.forEach((id: any) => { 
                if (validIds.has(String(id))) newSet.add(id);
            });
            return newSet as Set<string | number>;
        };

        state.learned = cleanSet(state.learned);
        state.mistakes = cleanSet(state.mistakes);
        state.favorites = cleanSet(state.favorites);

        for (const key in state.wordHistory) {
            if (!validIds.has(String(key))) {
                delete state.wordHistory[key];
            }
        }
        
        immediateSaveState();
    } catch (e) {
        console.error('Vocabulary fetch failed:', e);
        showToast('Ошибка загрузки словаря');
    }
}

export async function loadFromSupabase(user: any) {
    const { applyTheme, updateVoiceUI } = await import('../ui/ui_settings.ts');

    if (!navigator.onLine) return;
    try {
        showToast('☁️ Синхронизация...');

        const { error: rpcError } = await client.rpc('cleanup_user_progress');
        if (rpcError) console.warn('Server cleanup skipped:', rpcError.message);

        const { data: globalData } = await client.from('user_global_stats').select('*').eq('user_id', user.id).single();
        if (globalData) {
            state.userStats.xp = globalData.xp ?? state.userStats.xp;
            state.userStats.level = globalData.level ?? state.userStats.level;
            state.userStats.sprintRecord = globalData.sprint_record ?? state.userStats.sprintRecord;
            state.userStats.survivalRecord = globalData.survival_record ?? state.userStats.survivalRecord;
            state.userStats.coins = globalData.coins ?? state.userStats.coins;
            state.userStats.streakFreeze = globalData.streak_freeze ?? state.userStats.streakFreeze;
            
            if (globalData.achievements && Array.isArray(globalData.achievements)) {
                const localIds = new Set(state.achievements.map(a => a.id));
                globalData.achievements.forEach((a: any) => {
                    if (!localIds.has(a.id)) state.achievements.push(a);
                });
            }

            if (globalData.settings) {
                const s = globalData.settings;
                if (s.darkMode !== undefined) state.darkMode = s.darkMode;
                if (s.hanjaMode !== undefined) state.hanjaMode = s.hanjaMode;
                if (s.audioSpeed !== undefined) state.audioSpeed = s.audioSpeed;
                if (s.currentVoice !== undefined) state.currentVoice = s.currentVoice;
                if (s.autoUpdate !== undefined) state.autoUpdate = s.autoUpdate;
                if (s.studyGoal !== undefined) state.studyGoal = s.studyGoal;
                if (s.lastDailyReward !== undefined) state.userStats.lastDailyReward = s.lastDailyReward;
                if (s.themeColor !== undefined) state.themeColor = s.themeColor;
                if (s.backgroundMusicEnabled !== undefined) state.backgroundMusicEnabled = s.backgroundMusicEnabled;
                if (s.backgroundMusicVolume !== undefined) state.backgroundMusicVolume = s.backgroundMusicVolume;
                if (s.streakLastDate !== undefined) state.streak.lastDate = s.streakLastDate;
                
                applyTheme();
                updateVoiceUI();
            }

            if (globalData.sessions && Array.isArray(globalData.sessions)) {
                const localDates = new Set(state.sessions.map((s: any) => s.date));
                globalData.sessions.forEach((s: any) => { if (!localDates.has(s.date)) state.sessions.push(s); });
                state.sessions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
        }

        const { data: wordData } = await client.from('user_progress').select('*').eq('user_id', user.id);
        
        const validIds = new Set(state.dataStore.map((w: any) => String(w.id)));

        if (wordData) {
            wordData.forEach((row: any) => {
                const id = row.word_id;
                if (!validIds.has(String(id))) return;

                if (row.is_learned) state.learned.add(id);
                if (row.is_mistake) state.mistakes.add(id);
                if (row.is_favorite) state.favorites.add(id);
                
                state.wordHistory[id] = {
                    attempts: row.attempts,
                    correct: row.correct,
                    lastReview: row.last_review ? new Date(row.last_review).getTime() : null,
                    sm2: {
                        interval: row.sm2_interval ?? 0,
                        repetitions: row.sm2_repetitions ?? 0,
                        ef: row.sm2_ef ?? 2.5,
                        nextReview: row.sm2_next_review ? new Date(row.sm2_next_review).getTime() : undefined
                    }
                };
            });
        }

        const cleanSet = (s: Set<any>): Set<string | number> => {
            const newSet = new Set();
            s.forEach((id: any) => { 
                if (validIds.has(String(id))) newSet.add(id);
            });
            return newSet as Set<string | number>;
        };
        state.learned = cleanSet(state.learned);
        state.mistakes = cleanSet(state.mistakes);
        state.favorites = cleanSet(state.favorites);

        for (const key in state.wordHistory) {
            if (!validIds.has(String(key))) {
                delete state.wordHistory[key];
            }
        }

        showToast('✅ Профиль загружен');
    } catch (e) { console.error('Load Error:', e); }
}
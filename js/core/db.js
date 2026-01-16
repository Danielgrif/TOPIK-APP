import { client } from './supabaseClient.js';
import { state } from './state.js';
import { showToast, parseBilingualString } from '../utils/utils.js';
import { syncGlobalStats } from './sync.js';
import { Scheduler } from './scheduler.js';

/** @type {any} */
let _saveTimer = null;

/**
 * Validates that the fetched data contains expected columns.
 * Warns in console and UI if critical fields are missing.
 * @param {Array<any>} data - The vocabulary data fetched from DB.
 */
function validateSchema(data) {
    if (!data || data.length === 0) return;
    const sample = data[0];
    // Essential columns for the app to function
    const required = ['id', 'word_kr', 'translation', 'level', 'type'];
    const missing = required.filter(field => !(field in sample));
    
    if (missing.length > 0) {
        console.error('🚨 CRITICAL: Database schema mismatch. Missing columns:', missing);
        showToast(`⚠️ Ошибка БД: нет колонок ${missing.join(', ')}`);
    }
}

/**
 * Schedules a state save to LocalStorage and a sync with Supabase. Debounced.
 * @param {number} delay - Задержка в мс
 */
export function scheduleSaveState(delay = 300) {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        immediateSaveState();
        _saveTimer = null;
        syncGlobalStats(); // Используем полную функцию синхронизации
    }, delay);
}

/**
 * Immediately saves the current application state to LocalStorage.
 */
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
        localStorage.setItem('dirty_ids_v1', JSON.stringify([...state.dirtyWordIds])); // Сохраняем очередь
    } catch (e) {
        console.error('Save error:', e);
    }
}

/**
 * Updates the user's daily streak.
 * Checks if the last activity was yesterday or today to maintain or reset the streak.
 */
export function updateStreak() {
    const today = new Date().toLocaleDateString('en-CA');
    if (state.streak.lastDate !== today) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yesterday = d.toLocaleDateString('en-CA');
        
        if (state.streak.lastDate === yesterday) state.streak.count++;
        else {
            // Логика заморозки
            if (state.userStats.streakFreeze > 0) {
                state.userStats.streakFreeze--;
                showToast('❄️ Заморозка спасла серию!');
                state.streak.count++; // Серия продолжается
            } else {
                state.streak.count = 1; // Сброс
            }
        }
        state.streak.lastDate = today;
        localStorage.setItem('streak_v5', JSON.stringify(state.streak));
    }
}

/**
 * Records a user's attempt for a specific word.
 * Updates local history, streak, and session stats.
 * @param {number|string} id - ID слова
 * @param {boolean} isCorrect - Правильно ли ответил пользователь
 */
export function recordAttempt(id, isCorrect) {
    if (!state.wordHistory[id]) state.wordHistory[id] = { attempts: 0, correct: 0, lastReview: null };
    const stats = state.wordHistory[id];
    stats.attempts++; if (isCorrect) stats.correct++;
    stats.lastReview = Date.now();
    
    // FIX: Если ошибка, сбрасываем SRS интервал, чтобы слово появилось в повторении
    if (!isCorrect && stats.sm2) {
        // Используем логику Scheduler для расчета штрафа (Grade 0)
        const result = Scheduler.calculate(0, stats.sm2);
        stats.sm2.interval = result.interval;
        stats.sm2.repetitions = result.repetitions;
        stats.sm2.ef = result.ef;
        stats.sm2.nextReview = Date.now(); // Ставим в очередь немедленно
    }
    
    updateStreak();
    if (state.sessionActive) state.sessionWordsReviewed++;
    scheduleSaveState();
}

/**
 * Fetches the entire vocabulary from the 'vocabulary' table in Supabase,
 * preprocesses it for search, and cleans up local state based on fetched data.
 * @returns {Promise<void>}
 */
export async function fetchVocabulary() {
    try {
        const { data, error } = await client.from('vocabulary').select('*');
        if (error) throw error;
        
        state.dataStore = data || [];
        
        // FIX: Удаление дубликатов из dataStore по ID
        const uniqueMap = new Map();
        state.dataStore.forEach((/** @type {any} */ w) => {
            if (w.id && !uniqueMap.has(w.id)) uniqueMap.set(w.id, w);
        });
        state.dataStore = Array.from(uniqueMap.values());

        // Предварительная обработка для поиска (как было в старом app.js)
        state.dataStore.forEach(w => {
            if (!w.type) w.type = 'word';
            w._parsedTopic = parseBilingualString(w.topic || w.topic_ru || w.topic_kr);
            w._parsedCategory = parseBilingualString(w.category || w.category_ru || w.category_kr);
            w._searchStr = [w.word_kr, w.translation, w.word_hanja, w.synonyms, w.my_notes].filter(Boolean).join(' ').toLowerCase();
        });

        // Валидация после нормализации (чтобы type='word' по умолчанию не вызывал ошибку)
        validateSchema(state.dataStore);
        
        // Очистка локального состояния от несуществующих слов (синхронизация счетчиков)
        // FIX: Используем String для надежного сравнения ID (числа vs строки)
        const validIds = new Set(/** @type {any[]} */ (state.dataStore).map(w => String(w.id)));
        
        const cleanSet = (/** @type {Set<any>} */ s) => {
            const newSet = new Set();
            s.forEach((/** @type {any} */ id) => { 
                if (validIds.has(String(id))) newSet.add(id);
            });
            return newSet;
        };

        state.learned = cleanSet(state.learned);
        state.mistakes = cleanSet(state.mistakes);
        state.favorites = cleanSet(state.favorites);

        // Очистка истории для удаленных слов
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

/**
 * Loads and merges user progress from Supabase into the local state.
 * @param {any} user - Объект пользователя Supabase Auth
 * @returns {Promise<void>}
 */
export async function loadFromSupabase(user) {
    // Динамический импорт, чтобы избежать циклических зависимостей при загрузке
    const { applyTheme, updateVoiceUI } = await import('../ui/ui_settings.js');

    if (!navigator.onLine) return;
    try {
        showToast('☁️ Синхронизация...');

        // Очистка устаревших записей на сервере (удаляет прогресс для удаленных слов)
        const { error: rpcError } = await client.rpc('cleanup_user_progress');
        if (rpcError) console.warn('Server cleanup skipped:', rpcError.message);

        // 1. Global Stats
        const { data: globalData } = await client.from('user_global_stats').select('*').eq('user_id', user.id).single();
        if (globalData) {
            state.userStats.xp = globalData.xp ?? state.userStats.xp;
            state.userStats.level = globalData.level ?? state.userStats.level;
            state.userStats.sprintRecord = globalData.sprint_record ?? state.userStats.sprintRecord;
            state.userStats.survivalRecord = globalData.survival_record ?? state.userStats.survivalRecord;
            state.userStats.coins = globalData.coins ?? state.userStats.coins;
            state.userStats.streakFreeze = globalData.streak_freeze ?? state.userStats.streakFreeze;
            // lastDailyReward is stored in userStats JSON in localStorage, but not explicitly in SQL columns yet.
            // It will be synced via the 'settings' JSONB column or we need to add a column.
            // For now, let's store it in 'settings' JSONB to avoid schema migration for every small field.
            
            if (globalData.achievements && Array.isArray(globalData.achievements)) {
                const localIds = new Set(state.achievements.map(a => a.id));
                globalData.achievements.forEach((/** @type {any} */ a) => {
                    if (!localIds.has(a.id)) state.achievements.push(a);
                });
            }

            // 1.1 Sync Settings
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
                
                // Apply UI changes
                applyTheme();
                updateVoiceUI();
                // Audio speed is just a variable, no UI update needed except slider which updates on open
            }

            // 1.2 Sync Sessions (Merge)
            if (globalData.sessions && Array.isArray(globalData.sessions)) {
                const localDates = new Set(state.sessions.map((/** @type {any} */ s) => s.date));
                globalData.sessions.forEach((/** @type {any} */ s) => { if (!localDates.has(s.date)) state.sessions.push(s); });
                state.sessions.sort((/** @type {any} */ a, /** @type {any} */ b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
        }

        // 2. Word Progress
        const { data: wordData } = await client.from('user_progress').select('*').eq('user_id', user.id);
        
        // Создаем Set валидных ID для фильтрации мусора из облака
        const validIds = new Set(/** @type {any[]} */ (state.dataStore).map(w => String(w.id)));

        if (wordData) {
            wordData.forEach((/** @type {any} */ row) => {
                const id = row.word_id;
                // FIX: Пропускаем слова, которых нет в актуальном словаре
                if (!validIds.has(String(id))) return;

                if (row.is_learned) state.learned.add(id);
                if (row.is_mistake) state.mistakes.add(id);
                if (row.is_favorite) state.favorites.add(id);
                
                state.wordHistory[id] = {
                    attempts: row.attempts,
                    correct: row.correct,
                    lastReview: row.last_review ? new Date(row.last_review).getTime() : null, // Convert ISO to timestamp
                    sm2: {
                        interval: row.sm2_interval ?? 0,
                        repetitions: row.sm2_repetitions ?? 0,
                        ef: row.sm2_ef ?? 2.5,
                        nextReview: row.sm2_next_review ? new Date(row.sm2_next_review).getTime() : undefined // Convert ISO to timestamp
                    }
                };
            });
        }

        // FIX: Финальная зачистка state после слияния с облаком.
        // Удаляем из памяти любые записи, ID которых нет в текущем словаре.
        
        // 1. Очистка множеств
        const cleanSet = (/** @type {Set<any>} */ s) => {
            const newSet = new Set();
            s.forEach((/** @type {any} */ id) => { 
                if (validIds.has(String(id))) newSet.add(id);
            });
            return newSet;
        };
        state.learned = cleanSet(state.learned);
        state.mistakes = cleanSet(state.mistakes);
        state.favorites = cleanSet(state.favorites);

        // 2. Очистка истории
        for (const key in state.wordHistory) {
            if (!validIds.has(String(key))) {
                delete state.wordHistory[key];
            }
        }

        showToast('✅ Профиль загружен');
    } catch (e) { console.error('Load Error:', e); }
}
/**
 * @typedef {Object} UserStats
 * @property {number} xp - Опыт пользователя
 * @property {number} level - Текущий уровень
 * @property {number} sprintRecord - Рекорд в режиме Спринт
 * @property {number} survivalRecord - Рекорд в режиме Выживание
 * @property {number} coins - Количество монет
 * @property {number} streakFreeze - Количество заморозок серии
 * @property {number|null} lastDailyReward - Timestamp последней ежедневной награды
 */

/**
 * @typedef {Object} WordHistoryItem
 * @property {number} attempts - Всего попыток
 * @property {number} correct - Успешных попыток
 * @property {number|null} lastReview - Timestamp последнего повторения
 * @property {import('./scheduler.js').SM2State} [sm2] - Данные алгоритма SRS
 */

/**
 * @typedef {Object} AppState
 * @property {Array<any>} dataStore - Полный список слов
 * @property {Array<any>|null} searchResults - Результаты поиска (или null)
 * @property {UserStats} userStats - Статистика игрока
 * @property {Set<number|string>} learned - ID изученных слов
 * @property {Set<number|string>} mistakes - ID слов с ошибками
 * @property {Set<number|string>} favorites - ID избранных слов
 * @property {Object.<string, WordHistoryItem>} wordHistory - История по каждому слову
 */

/** @type {AppState} */
export const state = {
    dataStore: [],
    searchResults: null, // Результаты поиска из Web Worker
    userStats: { xp: 0, level: 1, sprintRecord: 0, survivalRecord: 0, coins: 0, streakFreeze: 0, lastDailyReward: null },
    learned: new Set(),
    mistakes: new Set(),
    favorites: new Set(),
    wordHistory: {},
    streak: { count: 0, lastDate: null },
    sessions: [],
    achievements: [],
    dailyChallenge: { lastDate: null, completed: false, streak: 0 },
    searchHistory: [], // История поиска (массив строк)
    studyGoal: { type: 'words', target: 10 }, // 'words' | 'time' (minutes)
    
    // Настройки UI
    currentStar: 'all',
    currentTopic: ['all'],
    currentCategory: 'all',
    currentType: 'word',
    hanjaMode: localStorage.getItem('hanja_mode_v1') === 'true',
    currentVoice: localStorage.getItem('voice_pref') || 'female',
    audioSpeed: Number(localStorage.getItem('audio_speed_v1')) || 0.9,
    darkMode: localStorage.getItem('dark_mode_v1') === 'true',
    focusMode: localStorage.getItem('focus_mode_v1') === 'true',
    zenMode: localStorage.getItem('zen_mode_v1') === 'true',
    viewMode: localStorage.getItem('view_mode_v1') || 'grid',
    themeColor: localStorage.getItem('theme_color_v1') || 'purple', // purple, blue, green, orange, pink
    autoUpdate: localStorage.getItem('auto_update_v1') !== 'false', // По умолчанию включено
    backgroundMusicEnabled: localStorage.getItem('background_music_enabled_v1') === 'true',
    backgroundMusicVolume: Number(localStorage.getItem('background_music_volume_v1')) || 0.3,
    
    // Список доступных музыкальных треков
    MUSIC_TRACKS: [ 
        { id: 'default', name: 'Seoul Lounge (Instrumental)', filename: 'Seoul Lounge (Instrumental).mp3' },
        { id: 'zen', name: 'K-Drama Study (Instrumental)', filename: 'K-Drama Study (Instrumental).mp3' },
        { id: 'quiz', name: 'Future Bass Pop (Instrumental)', filename: 'Future Bass Pop (Instrumental).mp3' }
    ],
    quizDifficulty: 'all',
    quizTopic: 'all',
    quizCategory: 'all',
    
    // Состояние синхронизации
    dirtyWordIds: new Set(),
    isSyncing: false,
    
    // Сессия
    sessionActive: false,
    sessionSeconds: 0,
    sessionInterval: null,
    sessionWordsReviewed: 0
};

// Инициализация из LocalStorage
try {
    const load = (key, def) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : def;
    };

    state.userStats = load('user_stats_v5', state.userStats);
    state.learned = new Set(load('learned_v5', []));
    state.mistakes = new Set(load('mistakes_v5', []));
    state.favorites = new Set(load('favorites_v5', []));
    state.wordHistory = load('word_history_v5', state.wordHistory);
    state.streak = load('streak_v5', { count: 0, lastDate: null });
    if (state.streak.count === undefined) state.streak.count = 0;
    if (state.streak.lastDate === undefined) state.streak.lastDate = null;
    state.sessions = load('sessions_v5', state.sessions);
    state.achievements = load('achievements_v5', state.achievements);
    state.dailyChallenge = load('daily_challenge_v1', { lastDate: null, completed: false, streak: 0 });
    if (state.dailyChallenge.lastDate === undefined) state.dailyChallenge.lastDate = null;
    if (state.dailyChallenge.completed === undefined) state.dailyChallenge.completed = false;
    if (state.dailyChallenge.streak === undefined) state.dailyChallenge.streak = 0; // Миграция для старых данных
    state.searchHistory = load('search_history_v1', []);
    state.studyGoal = load('study_goal_v1', { type: 'words', target: 10 });
    state.dirtyWordIds = new Set(load('dirty_ids_v1', [])); // Восстанавливаем очередь синхронизации
    state.quizDifficulty = localStorage.getItem('quiz_difficulty_v1') || 'all';
    state.quizTopic = localStorage.getItem('quiz_topic_v1') || 'all';
    state.quizCategory = localStorage.getItem('quiz_category_v1') || 'all';
    
    // Гарантия полей
    if (state.userStats.sprintRecord === undefined) state.userStats.sprintRecord = 0;
    if (state.userStats.survivalRecord === undefined) state.userStats.survivalRecord = 0;
    if (state.userStats.coins === undefined) state.userStats.coins = 0;
    if (state.userStats.streakFreeze === undefined) state.userStats.streakFreeze = 0;
    if (state.userStats.lastDailyReward === undefined) state.userStats.lastDailyReward = null;
} catch (e) {
    console.error('State init error:', e);
}
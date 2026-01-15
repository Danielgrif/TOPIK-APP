/**
 * @typedef {Object} SM2State
 * @property {number} interval - Интервал в днях
 * @property {number} repetitions - Количество успешных повторений подряд
 * @property {number} ef - Ease Factor (Фактор легкости), мин 1.3
 * @property {number} [nextReview] - Timestamp следующего повторения (мс)
 */

/**
 * @typedef {Object} ReviewResult
 * @property {number} interval - Новый интервал
 * @property {number} repetitions - Новое кол-во повторений
 * @property {number} ef - Новый EF
 */

/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm Implementation
 * Enhanced with Anki-like features: Late Review Compensation, Easy Bonus, Hard Interval.
 * 
 * Logic:
 * - Splits review into grades: 5 (Perfect), 3 (Hard), 0 (Forgot)
 * - Calculates next interval based on previous performance and Ease Factor (EF)
 */
export const Scheduler = {
    _data: [],
    _history: {},

    /**
     * Initialize the scheduler with current app data
     * @param {Object} context
     * @param {Array} context.dataStore - Массив слов
     * @param {Object} context.wordHistory - История слов { [id]: { sm2: ... } }
     */
    init({ dataStore, wordHistory }) {
        this._data = dataStore || [];
        this._history = wordHistory || {};
    },

    /**
     * Core SM-2 Calculation
     * @param {number} grade - 0 to 5 (0=Fail, 3=Pass, 5=Easy)
     * @param {SM2State} item - Previous SM-2 state
     * @param {number|null} lastReviewTime - Timestamp of last review (for late review logic)
     * @returns {ReviewResult}
     */
    calculate(grade, item, lastReviewTime = null) {
        let { interval, repetitions, ef } = item;

        // Clamp grade to valid range 0-5
        grade = Math.max(0, Math.min(5, grade));

        // --- LATE REVIEW LOGIC (Anki-style) ---
        // If user reviews late and succeeds, give credit for the extra time.
        let effectiveInterval = interval;
        if (lastReviewTime && grade >= 3) {
            const daysSinceLast = (Date.now() - lastReviewTime) / (1000 * 60 * 60 * 24);
            if (daysSinceLast > interval) {
                // If late, use the actual elapsed time as the basis for the next calculation
                effectiveInterval = daysSinceLast;
            }
        }

        if (grade >= 3) {
            // Correct response
            if (repetitions === 0) {
                // FIX: Если интервал уже больше 1 (после мягкого сброса), не сбрасываем в 1, а растем от него
                if (interval > 1) {
                    interval = Math.round(interval * 1.2); // Восстановление после ошибки (медленный рост)
                } else {
                    interval = 1;
                }
            } else if (repetitions === 1) {
                interval = 6;
            } else if (grade === 3) {
                // Hard: Grow slower (x1.2) regardless of EF
                interval = Math.round(effectiveInterval * 1.2);
            } else if (grade === 5) {
                // Easy: Bonus multiplier (x1.3) on top of EF
                interval = Math.round(effectiveInterval * ef * 1.3);
            } else {
                // Good (4): Standard EF multiplier
                interval = Math.round(effectiveInterval * ef);
            }
            
            // FIX: Интервал не может быть меньше 1 дня при успехе
            if (interval < 1) interval = 1;
            
            repetitions++;
        } else {
            // Instead of full reset to 1 day, retain 20% of interval for mature words.
            if (interval > 10) {
                interval = Math.max(1, Math.round(interval * 0.2));
            } else {
                interval = 1;
            }
            repetitions = 0;
        }

        // Update Ease Factor (EF)
        // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
        if (ef < 1.3) ef = 1.3; // Minimum EF threshold

        // Add "Fuzz" to interval to prevent review bunching (only for intervals > 2 days)
        if (interval > 2) {
            const fuzz = (Math.random() * 0.1) - 0.05; // +/- 5% random deviation
            interval = Math.round(interval * (1 + fuzz));
        }

        return { interval, repetitions, ef };
    },

    /**
     * Get list of words due for review
     * @param {Object} options
     * @param {number} [options.limit=50]
     */
    getQueue({ limit = 50 } = {}) {
        const now = Date.now();
        const due = [];
        const seen = new Set(); // Защита от дубликатов

        this._data.forEach(word => {
            const key = word.id || word.word_kr; // Use ID, fallback to word for backward compat
            
            if (seen.has(key)) return; // Если слово уже добавлено, пропускаем
            
            const h = this._history[key];

            // Only review words that have history or are marked as learned
            if (!h) return;

            // If word has no SM-2 data yet but has history, treat as due immediately
            if (!h.sm2) {
                due.push({ ...word, nextReview: 0 });
                seen.add(key);
                return;
            }

            // Check if due date has passed
            if (h.sm2.nextReview <= now) {
                due.push({ ...word, nextReview: h.sm2.nextReview });
                seen.add(key);
            }
        });

        // Sort: Overdue items first
        due.sort((a, b) => a.nextReview - b.nextReview);
        return due.slice(0, limit);
    },

    /**
     * Process a review attempt
     * @param {number|string} wordKey - ID слова
     * @param {number} grade - Оценка (0-5)
     * @returns {ReviewResult}
     */
    submitReview(wordKey, grade) {
        if (!this._history[wordKey]) {
            this._history[wordKey] = { attempts: 0, correct: 0, lastReview: Date.now() };
        }
        
        const entry = this._history[wordKey];
        
        // Initialize SM-2 state if missing
        if (!entry.sm2) {
            entry.sm2 = { interval: 0, repetitions: 0, ef: 2.5, nextReview: 0 };
        }

        // Calculate new state
        const result = this.calculate(grade, entry.sm2, entry.lastReview);
        
        // Apply updates
        entry.sm2.interval = result.interval;
        entry.sm2.repetitions = result.repetitions;
        entry.sm2.ef = result.ef;
        
        // Set next review date (Interval is in days, convert to ms)
        // For debugging/testing, you might want to use minutes instead of days. 
        // Currently: Days.
        const nextReviewDate = Date.now() + (result.interval * 24 * 60 * 60 * 1000);
        entry.sm2.nextReview = nextReviewDate;
        entry.lastReview = Date.now();

        // Update standard stats
        entry.attempts++;
        if (grade >= 3) entry.correct++;

        // Trigger save in main app
        if (typeof window.scheduleSaveState === 'function') {
            window.scheduleSaveState();
        }

        return result;
    },

    /**
     * Preview next intervals for UI buttons (without saving)
     * @param {number|string} wordKey
     * @returns {{ fail: number, hard: number, easy: number }} Intervals in days
     */
    previewNextIntervals(wordKey) {
        const entry = this._history[wordKey] || { sm2: null };
        const lastReview = entry.lastReview || null;
        // Default state if new
        const sm2 = entry.sm2 || { interval: 0, repetitions: 0, ef: 2.5 };
        
        return {
            fail: this.calculate(0, sm2, lastReview).interval,
            hard: this.calculate(3, sm2, lastReview).interval,
            easy: this.calculate(5, sm2, lastReview).interval
        };
    }
};
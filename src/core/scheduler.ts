import { WordHistoryItem, SM2State, Word } from "../types/index.ts";

export interface ReviewResult {
  interval: number;
  repetitions: number;
  ef: number;
}

export const Scheduler = {
  _data: [] as Word[],
  _history: Object.create(null) as Record<string | number, WordHistoryItem>,

  init({
    dataStore,
    wordHistory,
  }: {
    dataStore: Word[];
    wordHistory: Record<string | number, WordHistoryItem>;
  }) {
    this._data = dataStore || [];
    this._history = wordHistory || Object.create(null);
  },

  calculate(
    grade: number,
    item: SM2State | null | undefined,
    lastReviewTime: number | null = null,
  ): ReviewResult {
    let { interval = 0, repetitions = 0, ef = 2.5 } = item || {};

    grade = Math.max(0, Math.min(5, grade));

    let effectiveInterval = interval;
    if (lastReviewTime && grade >= 3) {
      const daysSinceLast =
        (Date.now() - lastReviewTime) / (1000 * 60 * 60 * 24);
      if (daysSinceLast > interval) {
        effectiveInterval = daysSinceLast;
      }
    }

    if (grade >= 3) {
      if (repetitions === 0) {
        if (interval > 1) {
          interval = Math.round(interval * 1.2);
        } else {
          interval = 1;
        }
      } else if (repetitions === 1) {
        interval = Math.max(6, Math.round(effectiveInterval * ef));
      } else if (grade === 3) {
        interval = Math.round(effectiveInterval * 1.2);
      } else if (grade === 5) {
        interval = Math.round(effectiveInterval * ef * 1.3);
      } else {
        interval = Math.round(effectiveInterval * ef);
      }

      if (interval < 1) interval = 1;

      repetitions++;
    } else {
      if (interval > 10) {
        interval = Math.max(1, Math.round(interval * 0.2));
      } else {
        interval = 1;
      }
      repetitions = 0;
    }

    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (ef < 1.3) ef = 1.3;

    if (interval > 2) {
      const fuzz = Math.random() * 0.1 - 0.05;
      interval = Math.round(interval * (1 + fuzz));
    }

    return { interval, repetitions, ef };
  },

  getQueue({ limit = 50 } = {}): (Word & { nextReview: number })[] {
    const now = Date.now();
    const due: (Word & { nextReview: number })[] = [];
    const seen = new Set();

    const data = this._data;
    for (let i = 0; i < data.length; i++) {
      const word = data[i];
      const key = word.id || word.word_kr;

      if (seen.has(key)) continue;

      const h = this._history[key];

      if (!h) continue;

      if (!h.sm2) {
        due.push({ ...word, nextReview: 0 });
        seen.add(key);
        continue;
      }

      if (h.sm2 && h.sm2.nextReview !== undefined && h.sm2.nextReview <= now) {
        due.push({ ...word, nextReview: h.sm2.nextReview });
        seen.add(key);
      }
    }

    due.sort((a, b) => a.nextReview - b.nextReview);
    return due.slice(0, limit);
  },

  submitReview(wordKey: string | number, grade: number): ReviewResult {
    if (!this._history[wordKey]) {
      this._history[wordKey] = {
        attempts: 0,
        correct: 0,
        lastReview: Date.now(),
      };
    }

    const entry = this._history[wordKey];

    if (!entry.sm2) {
      entry.sm2 = { interval: 0, repetitions: 0, ef: 2.5, nextReview: 0 };
    }

    const result = this.calculate(grade, entry.sm2, entry.lastReview);

    entry.sm2.interval = result.interval;
    entry.sm2.repetitions = result.repetitions;
    entry.sm2.ef = result.ef;

    const nextReviewDate = Date.now() + result.interval * 24 * 60 * 60 * 1000;
    entry.sm2.nextReview = nextReviewDate;
    entry.lastReview = Date.now();

    entry.attempts++;
    if (grade >= 3) entry.correct++;

    return result;
  },

  previewNextIntervals(wordKey: string | number): {
    fail: number;
    hard: number;
    easy: number;
  } {
    const entry = this._history[wordKey] || { sm2: null };
    const lastReview = entry.lastReview || null;
    const sm2 = entry.sm2 || { interval: 0, repetitions: 0, ef: 2.5 };

    return {
      fail: this.calculate(0, sm2, lastReview).interval,
      hard: this.calculate(3, sm2, lastReview).interval,
      easy: this.calculate(5, sm2, lastReview).interval,
    };
  },
};

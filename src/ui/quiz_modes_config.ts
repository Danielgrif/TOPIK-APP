import { Word } from "../types/index.ts";
import { state } from "../core/state.ts";
import { findConfusingWords } from "../core/confusing_words.ts";
import { showComboEffect, showToast } from "../utils/utils.ts";
import { addXP, updateStats } from "../core/stats.ts";

export interface TickResult {
  gameOver: boolean;
  nextTimer: number;
  ui?: {
    text: string;
    barPercent: number;
    isDanger: boolean;
  };
}

export interface QuizConfig {
  getWords(pool: Word[]): Word[];
  initialTimer: number;
  isTimerCountdown: boolean;
  initialLives: number;
  onTick(currentTimer: number): TickResult;
  onAnswer(isCorrect: boolean, currentTimer: number, lives: number): {
    timeChange: number;
    livesChange: number;
    gameOver: boolean;
    msg?: string;
  };
  onEnd(correctCount: number): void;
}

class BaseQuizConfig implements QuizConfig {
  initialTimer = 0;
  isTimerCountdown = false;
  initialLives = 0;

  getWords(pool: Word[]): Word[] {
    const unlearned = pool.filter((w) => !state.learned.has(w.id));
    const learned = pool.filter((w) => state.learned.has(w.id));
    unlearned.sort(() => Math.random() - 0.5);
    learned.sort(() => Math.random() - 0.5);
    return unlearned.concat(learned).slice(0, 10);
  }

  onTick(t: number): TickResult {
    const nextTimer = t + 1;
    const mins = Math.floor(nextTimer / 60);
    const secs = nextTimer % 60;
    return {
      gameOver: false,
      nextTimer: nextTimer,
      ui: {
        text: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
        barPercent: 100,
        isDanger: false,
      },
    };
  }

  onAnswer(_isCorrect: boolean, _t: number, _l: number) {
    return { timeChange: 0, livesChange: 0, gameOver: false };
  }

  onEnd(_correctCount: number) {}
}

class SprintQuizConfig extends BaseQuizConfig {
  initialTimer = 60;
  isTimerCountdown = true;

  getWords(pool: Word[]): Word[] {
    const unlearned = pool.filter((w) => !state.learned.has(w.id));
    const learned = pool.filter((w) => state.learned.has(w.id));
    return unlearned.concat(learned).sort(() => Math.random() - 0.5).slice(0, 100);
  }

  onTick(t: number): TickResult {
    const next = t - 1;
    const pct = Math.max(0, (next / 60) * 100);
    return {
      gameOver: next <= 0,
      nextTimer: next,
      ui: {
        text: `⏳ ${next}`,
        barPercent: pct,
        isDanger: next < 10,
      },
    };
  }

  onAnswer(isCorrect: boolean, _t: number, _l: number) {
    if (isCorrect) {
      showToast("+2 сек!", 800);
      return { timeChange: 2, livesChange: 0, gameOver: false };
    } else {
      showToast("-5 сек!", 800);
      return { timeChange: -5, livesChange: 0, gameOver: false };
    }
  }

  onEnd(correctCount: number) {
    if (correctCount > state.userStats.sprintRecord) {
      state.userStats.sprintRecord = correctCount;
      showComboEffect(`🏆 Рекорд: ${correctCount}!`);
    }
  }
}

class SurvivalQuizConfig extends BaseQuizConfig {
  initialTimer = 15; // Time bank
  isTimerCountdown = true;
  initialLives = 3;

  getWords(pool: Word[]): Word[] {
    const unlearned = pool.filter((w) => !state.learned.has(w.id));
    const learned = pool.filter((w) => state.learned.has(w.id));
    return unlearned.concat(learned).sort(() => Math.random() - 0.5).slice(0, 200);
  }

  onTick(t: number): TickResult {
    const next = t - 1;
    const pct = Math.min(100, Math.max(0, (next / 30) * 100));
    return {
      gameOver: next <= 0,
      nextTimer: next,
      ui: {
        text: `⏳ ${next}s`,
        barPercent: pct,
        isDanger: next < 5,
      },
    };
  }

  onAnswer(isCorrect: boolean, _t: number, lives: number) {
    if (isCorrect) {
      showComboEffect("+3 сек!");
      return { timeChange: 3, livesChange: 0, gameOver: false };
    } else {
      const newLives = lives - 1;
      if (newLives <= 0) {
        showToast("☠️ Жизни закончились!");
        return { timeChange: 0, livesChange: -1, gameOver: true };
      }
      showToast("💔 Минус жизнь!", 800);
      return { timeChange: 0, livesChange: -1, gameOver: false };
    }
  }

  onEnd(correctCount: number) {
    if (correctCount > state.userStats.survivalRecord) {
      state.userStats.survivalRecord = correctCount;
    }
  }
}

class DailyQuizConfig extends BaseQuizConfig {
  getWords(pool: Word[]): Word[] {
    const isSunday = new Date().getDay() === 0;
    const countNew = isSunday ? 7 : 3;
    const countReview = isSunday ? 3 : 2;
    const total = countNew + countReview;

    const unlearned = pool.filter((w) => !state.learned.has(w.id)).sort(() => Math.random() - 0.5);
    const learned = pool.filter((w) => state.learned.has(w.id)).sort(() => Math.random() - 0.5);

    let words = [...unlearned.slice(0, countNew), ...learned.slice(0, countReview)];

    if (words.length < total) {
      const currentIds = new Set(words.map((w) => w.id));
      const easyPool = pool.filter((w) => !currentIds.has(w.id) && w.level === "★☆☆");
      easyPool.sort(() => Math.random() - 0.5);
      words = words.concat(easyPool.slice(0, total - words.length));
      
      if (words.length < total) {
        const currentIds2 = new Set(words.map((w) => w.id));
        const others = pool.filter((w) => !currentIds2.has(w.id)).sort(() => Math.random() - 0.5);
        words = words.concat(others.slice(0, total - words.length));
      }
    }
    return words;
  }

  onEnd(_correctCount: number) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let streak = state.dailyChallenge.streak || 0;

    if (state.dailyChallenge.lastDate === yesterday) streak++;
    else if (state.dailyChallenge.lastDate !== today) streak = 1;

    const baseCoins = 50;
    const streakBonus = Math.min(streak, 7) * 10;
    const totalCoins = baseCoins + streakBonus;

    addXP(50);
    state.userStats.coins += totalCoins;
    updateStats();

    state.dailyChallenge = { lastDate: today, completed: true, streak: streak };
    localStorage.setItem("daily_challenge_v1", JSON.stringify(state.dailyChallenge));
    
    showComboEffect(`🔥 Вызов пройден!\n+50 XP | +${totalCoins} 💰\nСерия: ${streak} дн.`);
    
    if (typeof window.confetti === "function") {
      window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }
}

class ConfusingQuizConfig extends BaseQuizConfig {
  getWords(_pool: Word[]): Word[] {
    const groups = findConfusingWords();
    if (groups.length === 0) return [];
    return groups.flat().sort(() => Math.random() - 0.5).slice(0, 20);
  }
}

class AssociationQuizConfig extends BaseQuizConfig {
  getWords(_pool: Word[]): Word[] {
    return Array(5).fill({ id: "dummy" } as Word);
  }
}

class FilteredQuizConfig extends BaseQuizConfig {
  constructor(private filterFn: (w: Word) => boolean, private minLength: number = 10) {
    super();
  }
  getWords(pool: Word[]): Word[] {
    const filtered = pool.filter(this.filterFn);
    return super.getWords(filtered);
  }
}

export function getQuizConfig(mode: string): QuizConfig {
  switch (mode) {
    case "sprint": return new SprintQuizConfig();
    case "survival": return new SurvivalQuizConfig();
    case "daily": 
    case "super-daily": return new DailyQuizConfig();
    case "confusing": return new ConfusingQuizConfig();
    case "association": return new AssociationQuizConfig();
    case "scramble":
    case "essay":
      return new FilteredQuizConfig(w => !!(w.example_kr && w.example_kr.length > 5 && w.example_ru));
    case "dialogue":
      return new FilteredQuizConfig(w => !!(w.example_audio && w.example_kr));
    case "synonyms":
      return new FilteredQuizConfig(w => !!(w.synonyms && w.synonyms.trim().length > 0));
    case "antonyms":
      return new FilteredQuizConfig(w => !!(w.antonyms && w.antonyms.trim().length > 0));
    default: return new BaseQuizConfig();
  }
}

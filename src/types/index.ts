export interface Word {
  id: string | number;
  word_kr: string;
  translation: string;
  word_hanja?: string;
  level?: string;
  type?: string;
  audio_url?: string;
  audio_male?: string;
  image?: string;
  image_source?: string;
  example_kr?: string;
  example_ru?: string;
  example_audio?: string;
  my_notes?: string;
  synonyms?: string;
  antonyms?: string;
  collocations?: string;
  grammar_info?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;

  // Внутренние поля (поиск, парсинг)
  _searchStr?: string;
  _parsedTopic?: { kr: string; ru: string };
  _parsedCategory?: { kr: string; ru: string };
  isLocal?: boolean;

  // Поля для совместимости с разными версиями БД
  topic?: string;
  category?: string;
  topic_ru?: string;
  topic_kr?: string;
  category_ru?: string;
  category_kr?: string;
  deleted_at?: string;
  created_by?: string | null;
  is_public?: boolean;
}

export interface Achievement {
  id: string;
  date: number;
}

export interface UserStats {
  lastFreezeDate: number | null;
  user_id?: string;
  xp: number;
  level: number;
  sprintRecord: number;
  survivalRecord: number;
  streakFreeze: number;
  coins: number;
  lastDailyReward: number | null;
  dailyRewardStreak: number;
  achievements: Achievement[]; // Массив объектов достижений
  survivalHealth: number;
  timeFreeze?: number;
  skipQuestion?: number;
  fiftyFifty?: number;
  weeklyXp?: number;
  league?: string;
  lastWeekId?: string;
}

export interface SM2State {
  interval: number;
  repetitions: number;
  ef: number;
  nextReview?: number;
}

export interface WordHistoryItem {
  attempts: number;
  correct: number;
  lastReview: number | null;
  sm2?: SM2State;
  learnedDate?: number;
}

export interface DailyChallenge {
  lastDate: string | null;
  completed: boolean;
  streak: number;
}

export interface StudyGoal {
  type: "words" | "time";
  target: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  filename: string;
}

export interface UserWordProgress {
  attempts: number;
  correct: number;
  last_review?: number;
  sm2_interval?: number;
  sm2_repetitions?: number;
  sm2_ef?: number;
  sm2_next_review?: number;
}

export interface Quote {
  id: number;
  quote_kr: string;
  quote_ru: string;
  literal_translation?: string;
  explanation?: string;
  audio_url?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "theme" | "feature";
  value: string;
  icon: string;
}

// Minimal Supabase User interface to avoid full dependency
export interface User {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
    [key: string]: unknown;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
    [key: string]: unknown;
  };
}

export interface LeaderboardEntry {
  user_id: string;
  xp: number;
  weekly_xp: number;
  level: number;
  full_name: string | null;
  avatar_url: string | null;
  league: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  translation?: string;
  level: string;
  topic: string;
  image_url?: string;
  audio_url?: string;
  created_at: string;
  source?: string;
}

export interface ConfirmOptions {
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  onValidate?: (value: string) => boolean | Promise<boolean>;
  showCopy?: boolean;
  copyText?: string;
  showCancel?: boolean;
}

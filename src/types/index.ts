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

  // Внутренние поля (поиск, парсинг)
  _searchStr?: string;
  _parsedTopic?: { kr: string; ru: string };
  _parsedCategory?: { kr: string; ru: string };
  isLocal?: boolean;

  // Поля для совместимости с разными версиями БД
  topic?: string;
  topic_ru?: string;
  topic_kr?: string;
  category?: string;
  category_ru?: string;
  category_kr?: string;
}

export interface Achievement {
  id: string;
  date: number;
}

export interface UserStats {
  user_id?: string;
  xp: number;
  level: number;
  sprintRecord: number;
  survivalRecord: number;
  streakFreeze: number;
  coins: number;
  lastDailyReward: number | null;
  achievements: Achievement[]; // Массив объектов достижений
  survivalHealth: number;
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

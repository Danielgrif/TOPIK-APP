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

export interface UserStats {
    user_id?: string;
    xp: number;
    level: number;
    sprint_record: number;
    survival_record: number;
    streak_count: number;
    achievements: string[];
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
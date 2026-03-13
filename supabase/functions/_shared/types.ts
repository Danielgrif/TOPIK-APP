export interface WordData {
  id: string;
  word_kr: string;
  translation?: string;
  example_kr?: string;
  example_ru?: string;
  audio_url?: string;
  audio_male?: string;
  example_audio?: string;
  image?: string;
  image_source?: string;
  topic?: string;
  category?: string;
  level?: string;
  topic_ru?: string;
  category_ru?: string;
  created_by?: string;
  is_public?: boolean;
}

export interface ImageResult {
  finalUrl: string;
  source: string;
  url?: string;
}

export interface AIExampleItem {
  kr?: string;
  ru?: string;
}
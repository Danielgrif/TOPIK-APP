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
  // Fields from AI generation
  topik_level?: string;
  grammar_info?: string;
  frequency?: string;
  tone?: string;
  word_hanja?: string;
  synonyms?: string;
  antonyms?: string;
  collocations?: string;
  type?: string;
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
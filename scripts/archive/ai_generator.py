import json
import logging
import asyncio
from google import genai
from google.genai import types
from constants import GEMINI_MODELS

class AIContentGenerator:
    def __init__(self, api_key):
        self.api_key = api_key
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key) # Теперь синхронный
        
        # Списки для валидации (используются в промпте)
        self.valid_topics = [
            "일상생활 (Повседневная жизнь)", "음식 (Еда)", "여행 (Путешествия)", 
            "교육 (Образование)", "직장 (Работа)", "건강 (Здоровье)", 
            "자연 (Природа)", "인간관계 (Отношения)", "쇼핑 (Покупки)", 
            "문화 (Культура)", "정치/경제 (Политика/Экономика)", "기타 (Другое)"
        ]
        
        self.valid_categories = [
            "명사 (Существительные)", "동사 (Глаголы)", "형용사 (Прилагательные)", 
            "부사 (Наречия)", "조사 (Частицы)", "관용구 (Идиомы)", 
            "문구 (Фразы)", "문법 (Грамматика)"
        ]

    def _build_prompt(self, word_kr):
        return f"""You are an expert Korean language teacher for Russian speakers.
Analyze the following Korean word: '{word_kr}' for use in TOPIK II exam preparation. The response should be in Russian. Also find frequency of use for this word (high, medium, low), and approximately to which TOPIK level this word corresponds (TOPIK I, TOPIK II level 3, TOPIK II level 4, TOPIK II level 5, TOPIK II level 6). Always explain Hanja component if it is available.

### 1. Identification & Correction
- Detect if the input is Korean, a typo (e.g. 'gks' -> '한'), or Romanization (e.g. 'annyeong' -> '안녕').
- Use the **corrected Korean word** for analysis.
- Provide frequency of use AND TOPIK Level
- If the input is gibberish or not a valid Korean word, return: {{"error": "Invalid input"}}
### 2. Hanja Explaination 
- Always explain hanja component if it is available.
### 2. Analysis Rules
- If the word has multiple distinct meanings (homonyms), return a JSON ARRAY of objects (max 3 most common).
- If it has a single meaning, return a single JSON object instead of an array.
- **Strictly** follow the JSON structure below. Do NOT use Markdown formatting (no ```json).

### 3. JSON Structure
Each object must have:
- "word_kr": string (The corrected Korean word)
- "translation": string (Concise Russian translation, MUST be less than 4 words)
- "frequency": string ("high" or "medium" or "low")
- "topik_level": string ("TOPIK I", "TOPIK II level 3", "TOPIK II level 4", "TOPIK II level 5", "TOPIK II level 6")
- "tone": string (Describe the tone/register. Options: Formal, Informal, Poetic, Technical, Slang. Be consistent with example sentences.)
- "word_hanja": string (Hanja characters ONLY if applicable. Empty string if native Korean)
- "topic": string (One from: {', '.join(self.valid_topics)}. If unsure, use "기타 (Другое)")
- "category": string (One from: {', '.join(self.valid_categories)}. If unsure, use "기타 (Другое)")
- "level": string (One of: "★★★" (Beginner), "★★☆" (Intermediate), "★☆☆" (Advanced))
- "example_kr": string (A simple, natural Korean sentence using the word in **polite informal style (해요체)**)
- "example_ru": string (Russian translation of the example)
- "synonyms": string (Comma-separated Korean synonyms **matching this specific meaning**, max 3. Empty if none)
- "antonyms": string (Comma-separated Korean antonyms **matching this specific meaning**, max 3. Empty if none)
- "collocations": string (Common word pairings, e.g. "make friends", max 3)
- "grammar_info": string (Brief usage note, conjugation tip, or Hanja meaning breakdown. E.g. "Irregular verb" or "學(learn) 校(school)")
- "type": string ("word" or "grammar")

### 4. Constraints
- Topic/Category MUST be exactly from the provided lists. If unsure, use "기타 (Другое)".
- Examples should be suitable for the word's difficulty level AND maintain consistent tone (formal, informal, etc.).
- Return ONLY a valid JSON string. No explanations or extra text.

Input: '{word_kr}'
"""

    async def generate_word_data(self, word_kr):
        """
        Генерирует данные о слове через Gemini API.
        Возвращает кортеж: (список_данных, сообщение_об_ошибке)
        """
        if not self.client:
            return [], "Missing Gemini API Key"

        prompt = self._build_prompt(word_kr)
        
        # Список моделей для перебора (Fallback стратегия)
        models_to_try = GEMINI_MODELS
        
        last_error = None

        for model_name in models_to_try:
            try:
                # Асинхронный вызов через aio
                response = await self.client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                text = response.text.strip()
                
                # Очистка от markdown форматирования
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                
                # Парсинг JSON
                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    # Попытка "мягкого" восстановления JSON, если модель обрезала ответ
                    if text.endswith("}"): 
                        # Иногда бывает лишняя запятая перед закрывающей скобкой
                        text = text.replace(",}", "}")
                        data = json.loads(text)
                    else:
                        raise

                # Обработка ошибок от самой модели (если она вернула JSON с ошибкой)
                if isinstance(data, dict) and "error" in data:
                    return [], f"AI Error: {data['error']}"
                
                # Нормализация результата в список
                if isinstance(data, dict):
                    items = [data]
                elif isinstance(data, list):
                    items = data
                else:
                    return [], "Invalid JSON format received"

                logging.info(f"✅ Gemini ({model_name}): Успешно сгенерировано для '{word_kr}'")
                return items, None

            except Exception as e:
                if "429" in str(e):
                    logging.warning(f"⚠️ Quota exceeded for {model_name}. Trying next...")
                    last_error = "Quota Exceeded"
                    await asyncio.sleep(1)
                    continue
                logging.warning(f"⚠️ Error with {model_name}: {e}")
                last_error = str(e)
                # Если ошибка не связана с квотами, пробуем следующую модель
                continue
        
        return [], f"All models failed. Last error: {last_error}"

    def list_available_models(self):
        """Возвращает список доступных моделей, поддерживающих генерацию контента."""
        if not self.client: # Не можем использовать асинхронный клиент для list
            return []
        
        try:
            return [m.name for m in self.client.models.list()]
        except Exception as e:
            logging.error(f"❌ Ошибка при получении списка моделей: {e}")
            return []
import os
import sys
import asyncio
import logging
from dotenv import load_dotenv
from supabase import create_client
from google import genai
from constants import GEMINI_MODELS

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Загрузка переменных окружения
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Очистка ключей
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")
if GEMINI_API_KEY: GEMINI_API_KEY = GEMINI_API_KEY.replace('"', '').replace("'", "")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    logging.error("❌ ОШИБКА: Не найдены необходимые переменные окружения.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
client = genai.Client(api_key=GEMINI_API_KEY)

async def generate_synonyms(word_kr, current_synonyms=None):
    """Генерирует список синонимов через Gemini."""
    existing = [s.strip() for s in (current_synonyms or "").split(',')] if current_synonyms else []
    
    prompt = f"""You are a Korean language expert.
Provide 3-5 common synonyms for the Korean word '{word_kr}'.
Output ONLY a comma-separated list of Korean words.
"""
    models_to_try = GEMINI_MODELS

    for model_name in models_to_try:
        try:
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt
            )
            text = response.text.strip()
            
            new_synonyms = [s.strip() for s in text.split(',') if s.strip()]
            all_synonyms = list(set(existing + new_synonyms))
            
            # Убираем само слово из синонимов, если оно там есть
            if word_kr in all_synonyms:
                all_synonyms.remove(word_kr)
                
            return ", ".join(all_synonyms[:5])
        except Exception as e:
            logging.warning(f"⚠️ Ошибка модели {model_name} для {word_kr}: {e}")
            continue
            
    logging.error(f"❌ Все модели AI недоступны для {word_kr}")
    return None

async def process_batch():
    logging.info("🚀 Запуск обновления синонимов...")
    
    offset = 0
    batch_size = 50
    processed_count = 0
    updated_count = 0

    while True:
        # Получаем пачку слов
        response = supabase.table("vocabulary").select("id, word_kr, synonyms").range(offset, offset + batch_size - 1).execute()
        rows = response.data
        
        if not rows:
            break
            
        tasks = []
        
        for row in rows:
            word = row.get('word_kr')
            syns = row.get('synonyms') or ""
            syn_list = [s for s in syns.split(',') if s.strip()]
            
            # Если синонимов меньше 3, обновляем
            if len(syn_list) < 3:
                tasks.append((row['id'], word, syns))
        
        if tasks:
            logging.info(f"🔄 Обработка пачки {offset}-{offset+batch_size}: найдено {len(tasks)} кандидатов.")
            
            for row_id, word, current_syns in tasks:
                new_syns = await generate_synonyms(word, current_syns)
                if new_syns and new_syns != current_syns:
                    supabase.table("vocabulary").update({"synonyms": new_syns}).eq("id", row_id).execute()
                    logging.info(f"✅ Обновлено: {word} -> {new_syns}")
                    updated_count += 1
                # Небольшая пауза, чтобы не упереться в лимиты API
                await asyncio.sleep(0.5)
                
        offset += batch_size
        processed_count += len(rows)
        logging.info(f"📊 Прогресс: обработано {processed_count} слов...")

    logging.info(f"🏁 Готово! Обновлено слов: {updated_count}")

if __name__ == "__main__":
    asyncio.run(process_batch())
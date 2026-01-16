import os
import sys
import logging
from dotenv import load_dotenv
from supabase import create_client

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Загрузка переменных окружения
script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(script_dir, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(script_dir, "env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY.")
    sys.exit(1)

# Очистка ключей
SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def validate_vocabulary_schema():
    """Проверяет наличие необходимых колонок в таблице vocabulary"""
    logging.info("🔍 Проверка схемы таблицы 'vocabulary'...")
    
    # Ожидаемые колонки и их примерные типы (для справки)
    expected_columns = [
        'id', 'word_kr', 'translation', 'word_hanja', 
        'topic', 'category', 'level', 'type',
        'audio_url', 'audio_male', 
        'image', 'image_source', 
        'example_kr', 'example_ru', 'example_audio',
        'synonyms', 'antonyms', 'collocations', 
        'my_notes', 'grammar_info'
    ]

    try:
        # Пытаемся получить одну запись со всеми колонками
        # Если какой-то колонки нет, Supabase (PostgREST) вернет ошибку 400
        res = supabase.table('vocabulary').select("*").limit(1).execute()
        
        if not res.data:
            logging.warning("⚠️ Таблица 'vocabulary' пуста. Невозможно проверить структуру через выборку.")
            # В этом случае мы не можем проверить колонки, если нет доступа к information_schema
            return

        row = res.data[0]
        if not isinstance(row, dict):
            logging.error(f"❌ Неожиданный формат данных из БД. Получен тип: {type(row)}")
            sys.exit(1)
        existing_columns = row.keys()
        
        missing = [col for col in expected_columns if col not in existing_columns]
        
        if missing:
            logging.error("❌ НЕСООТВЕТСТВИЕ СХЕМЫ! В таблице 'vocabulary' отсутствуют колонки:")
            for col in missing:
                logging.error(f"   - {col}")
            logging.info("💡 Решение: Добавьте эти колонки через SQL Editor в Supabase Dashboard.")
            sys.exit(1)
        else:
            logging.info("✅ Схема таблицы 'vocabulary' корректна.")
            
    except Exception as e:
        logging.error(f"❌ Ошибка при проверке схемы: {e}")
        # Часто ошибка выглядит как: {'code': 'PGRST100', 'details': None, 'hint': None, 'message': 'Could not find the column ...'}
        if 'Could not find the column' in str(e):
             logging.error("💡 Вероятно, вы запрашиваете колонку, которой нет в базе.")
        sys.exit(1)

def validate_buckets():
    """Проверяет наличие необходимых бакетов"""
    logging.info("🔍 Проверка Storage Buckets...")
    required_buckets = ['audio-files', 'image-files']
    
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        for req in required_buckets:
            if req not in bucket_names:
                logging.warning(f"⚠️ Отсутствует бакет: '{req}'")
            else:
                logging.info(f"✅ Бакет '{req}' найден.")
    except Exception as e:
        logging.error(f"❌ Ошибка проверки бакетов: {e}")

def validate_user_progress_schema():
    """Проверяет наличие необходимых колонок в таблице user_progress"""
    logging.info("🔍 Проверка схемы таблицы 'user_progress'...")
    
    expected_columns = [
        'user_id', 'word_id', 'is_learned', 'is_mistake', 'is_favorite',
        'attempts', 'correct', 'last_review',
        'sm2_interval', 'sm2_repetitions', 'sm2_ef', 'sm2_next_review'
    ]

    try:
        res = supabase.table('user_progress').select("*").limit(1).execute()
        
        if not res.data:
            logging.warning("⚠️ Таблица 'user_progress' пуста. Невозможно проверить структуру через выборку.")
            return

        row = res.data[0]
        if not isinstance(row, dict):
            logging.error(f"❌ Неожиданный формат данных из БД. Получен тип: {type(row)}")
            sys.exit(1)
            
        existing_columns = row.keys()
        
        missing = [col for col in expected_columns if col not in existing_columns]
        
        if missing:
            logging.error("❌ НЕСООТВЕТСТВИЕ СХЕМЫ! В таблице 'user_progress' отсутствуют колонки:")
            for col in missing:
                logging.error(f"   - {col}")
            logging.info("💡 Решение: Добавьте эти колонки через SQL Editor в Supabase Dashboard.")
            sys.exit(1)
        else:
            logging.info("✅ Схема таблицы 'user_progress' корректна.")
            
    except Exception as e:
        logging.error(f"❌ Ошибка при проверке схемы user_progress: {e}")
        if 'Could not find the column' in str(e):
             logging.error("💡 Вероятно, вы запрашиваете колонку, которой нет в базе.")
        sys.exit(1)

if __name__ == "__main__":
    validate_buckets()
    validate_vocabulary_schema()
    validate_user_progress_schema()
    logging.info("🏁 Валидация завершена.")
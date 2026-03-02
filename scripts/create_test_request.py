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
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")

# Очистка ключей
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения (SUPABASE_URL/VITE_SUPABASE_URL или ключи).")
    sys.exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def create_request():
    word = "테스트" # "Тест" на корейском
    logging.info(f"🚀 Создание тестовой заявки для слова: {word}")
    
    data = {
        "word_kr": word,
        "status": "pending",
        "topic": "System Test",
        "category": "Other"
    }
    
    try:
        res = supabase.table("word_requests").insert(data).execute()
        if res.data:
            logging.info(f"✅ Заявка успешно создана! ID: {res.data[0]['id']}")
            logging.info("👉 Теперь запустите 'python scripts/content_worker.py' и следите за логами.")
        else:
            logging.error("❌ Не удалось создать заявку (пустой ответ от БД).")
            
    except Exception as e:
        logging.error(f"❌ Ошибка при создании заявки: {e}")
        if "violates foreign key constraint" in str(e):
             logging.info("💡 Подсказка: Возможно, таблица требует user_id. Попробуйте добавить его вручную в скрипт.")

if __name__ == "__main__":
    create_request()
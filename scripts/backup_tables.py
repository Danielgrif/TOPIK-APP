import os
import sys
import json
import logging
from datetime import datetime
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

# Список таблиц для резервного копирования
TABLES_TO_BACKUP = [
    "vocabulary",
    "user_vocabulary",
    "quotes",
    "word_requests",
    "user_progress",
    "user_global_stats",
    "user_lists",
    "list_items"
]

def fetch_all_data(table_name):
    """Получает все данные из таблицы, используя пагинацию."""
    all_rows = []
    offset = 0
    limit = 1000
    
    logging.info(f"📥 Скачивание данных из '{table_name}'...")
    
    while True:
        try:
            # Запрос с пагинацией
            response = supabase.table(table_name).select("*").range(offset, offset + limit - 1).execute()
            data = response.data
            
            if not data:
                break
                
            all_rows.extend(data)
            
            # Если получили меньше лимита, значит это последняя страница
            if len(data) < limit:
                break
                
            offset += limit
            logging.info(f"   ... получено {len(all_rows)} строк")
            
        except Exception as e:
            logging.error(f"❌ Ошибка при чтении {table_name}: {e}")
            return None
            
    return all_rows

def backup_tables():
    """Основная функция бэкапа."""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_dir = os.path.join(project_root, "backups", timestamp)
    
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        
    logging.info(f"📂 Папка для бэкапа: {backup_dir}")
    
    for table in TABLES_TO_BACKUP:
        data = fetch_all_data(table)
        
        if data is not None:
            filename = os.path.join(backup_dir, f"{table}.json")
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logging.info(f"✅ Сохранено {table} ({len(data)} строк) в {filename}")
            except Exception as e:
                logging.error(f"❌ Ошибка записи файла {filename}: {e}")
        else:
            logging.warning(f"⚠️ Пропуск {table} из-за ошибки скачивания.")

if __name__ == "__main__":
    backup_tables()
    logging.info("🏁 Процесс резервного копирования завершен.")
import os
import sys
import json
import logging
import argparse
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

# Очистка ключей
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY.")
    sys.exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

# --- Constants ---
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

RESTORE_ORDER = [
    "vocabulary",
    "quotes",
    "user_global_stats",
    "user_lists",
    "user_vocabulary",
    "word_requests",
    "list_items",
    "user_progress"
]

BATCH_SIZE = 1000

# --- Backup Functions ---

def fetch_all_data(table_name):
    """Получает все данные из таблицы, используя пагинацию."""
    all_rows = []
    offset = 0
    limit = 1000
    
    logging.info(f"📥 Скачивание данных из '{table_name}'...")
    
    while True:
        try:
            response = supabase.table(table_name).select("*").range(offset, offset + limit - 1).execute()
            data = response.data
            
            if not data:
                break
                
            all_rows.extend(data)
            
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

# --- Restore Functions ---

def get_backups():
    """Возвращает список доступных папок с бэкапами, отсортированных по дате."""
    backup_root = os.path.join(project_root, "backups")
    if not os.path.exists(backup_root):
        return []
    dirs = [d for d in os.listdir(backup_root) if os.path.isdir(os.path.join(backup_root, d))]
    dirs.sort(reverse=True)
    return dirs

def restore_table(table_name, file_path):
    """Восстанавливает данные одной таблицы из JSON файла."""
    if not os.path.exists(file_path):
        logging.warning(f"⚠️ Файл не найден: {file_path}. Пропуск таблицы '{table_name}'.")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        logging.error(f"❌ Ошибка чтения {file_path}: {e}")
        return

    if not data:
        logging.info(f"ℹ️ Таблица '{table_name}' пуста в бэкапе.")
        return

    logging.info(f"🚀 Восстановление '{table_name}' ({len(data)} строк)...")

    total = len(data)
    for i in range(0, total, BATCH_SIZE):
        batch = data[i:i + BATCH_SIZE]
        try:
            supabase.table(table_name).upsert(batch).execute()
            logging.info(f"   ✅ Обработано {min(i + BATCH_SIZE, total)}/{total}")
        except Exception as e:
            logging.error(f"   ❌ Ошибка восстановления пакета {i}-{i+BATCH_SIZE} для '{table_name}': {e}")

def restore_backup(backup_name=None, force=False):
    """Основная функция восстановления."""
    backups = get_backups()
    if not backups:
        logging.error("❌ В папке 'backups/' не найдено резервных копий.")
        return

    selected_backup = None
    if backup_name:
        if backup_name in backups:
            selected_backup = backup_name
        else:
            logging.error(f"❌ Бэкап '{backup_name}' не найден.")
            return
    else:
        print("\nДоступные резервные копии:")
        for idx, b in enumerate(backups):
            print(f"{idx + 1}. {b}")

        try:
            choice = input("\nВыберите номер бэкапа для восстановления (или 'q' для выхода): ")
            if choice.lower() == 'q': return
            
            idx = int(choice) - 1
            if idx < 0 or idx >= len(backups):
                print("Неверный выбор.")
                return
            selected_backup = backups[idx]
        except ValueError:
            print("Неверный ввод.")
            return

    backup_path = os.path.join(project_root, "backups", selected_backup)
    
    if not force:
        print(f"\n⚠️  ВНИМАНИЕ: Это действие перезапишет существующие данные в базе '{SUPABASE_URL}'.")
        confirm = input(f"Вы уверены, что хотите восстановить данные из '{selected_backup}'? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Отмена.")
            return

    logging.info(f"Начало восстановления из {selected_backup}...")
    
    for table in RESTORE_ORDER:
        file_path = os.path.join(backup_path, f"{table}.json")
        restore_table(table, file_path)
        
    logging.info("🏁 Процесс восстановления завершен.")

# --- Validation Functions ---

def validate_vocabulary_schema():
    logging.info("🔍 Проверка схемы таблицы 'vocabulary'...")
    expected_columns = [
        'id', 'word_kr', 'translation', 'word_hanja', 
        'topic', 'category', 'level', 'type',
        'audio_url', 'audio_male', 
        'image', 'image_source', 
        'example_kr', 'example_ru', 'example_audio',
        'synonyms', 'antonyms', 'collocations',
        'my_notes', 'grammar_info',
        'created_by', 'is_public'
    ]
    _validate_table_schema('vocabulary', expected_columns)

def validate_user_progress_schema():
    logging.info("🔍 Проверка схемы таблицы 'user_progress'...")
    expected_columns = [
        'user_id', 'word_id', 'is_learned', 'is_mistake', 'is_favorite',
        'attempts', 'correct', 'last_review',
        'sm2_interval', 'sm2_repetitions', 'sm2_ef', 'sm2_next_review'
    ]
    _validate_table_schema('user_progress', expected_columns)

def validate_user_global_stats_schema():
    logging.info("🔍 Проверка схемы таблицы 'user_global_stats'...")
    expected_columns = [
        'user_id', 'xp', 'level', 'coins', 'streak_freeze', 
        'sprint_record', 'survival_record', 'achievements', 'sessions', 'settings',
        'avatar_url', 'full_name'
    ]
    _validate_table_schema('user_global_stats', expected_columns)

def _validate_table_schema(table_name, expected_columns):
    try:
        res = supabase.table(table_name).select("*").limit(1).execute()
        if not res.data:
            logging.warning(f"⚠️ Таблица '{table_name}' пуста. Невозможно проверить структуру через выборку.")
            return

        row = res.data[0]
        if not isinstance(row, dict):
            logging.error(f"❌ Неожиданный формат данных из БД для '{table_name}'.")
            return
            
        existing_columns = row.keys()
        missing = [col for col in expected_columns if col not in existing_columns]
        
        if missing:
            logging.error(f"❌ НЕСООТВЕТСТВИЕ СХЕМЫ! В таблице '{table_name}' отсутствуют колонки:")
            for col in missing:
                logging.error(f"   - {col}")
        else:
            logging.info(f"✅ Схема таблицы '{table_name}' корректна.")
            
    except Exception as e:
        logging.error(f"❌ Ошибка при проверке схемы '{table_name}': {e}")

def validate_buckets():
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

def validate_all():
    validate_buckets()
    validate_vocabulary_schema()
    validate_user_progress_schema()
    validate_user_global_stats_schema()
    logging.info("🏁 Валидация завершена.")

# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="TOPIK Database Manager")
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Backup
    subparsers.add_parser('backup', help='Backup database tables')
    
    # Restore
    restore_parser = subparsers.add_parser('restore', help='Restore database tables')
    restore_parser.add_argument('--backup', type=str, help='Name of the backup folder to restore')
    restore_parser.add_argument('--force', action='store_true', help='Skip confirmation')
    
    # Validate
    subparsers.add_parser('validate', help='Validate database schema and buckets')
    
    args = parser.parse_args()
    
    if args.command == 'backup':
        backup_tables()
    elif args.command == 'restore':
        restore_backup(args.backup, args.force)
    elif args.command == 'validate':
        validate_all()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
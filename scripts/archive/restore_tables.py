import os
import sys
import json
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

# Порядок восстановления важен из-за Foreign Keys!
# 1. Независимые таблицы
# 2. Таблицы, зависящие от пользователей
# 3. Таблицы, зависящие от других таблиц
RESTORE_ORDER = [
    "vocabulary",
    "quotes",
    "user_global_stats",
    "user_lists",
    "user_vocabulary",
    "word_requests",
    "list_items",   # Зависит от user_lists
    "user_progress" # Зависит от vocabulary
]

BATCH_SIZE = 1000

def get_backups():
    """Возвращает список доступных папок с бэкапами, отсортированных по дате."""
    backup_root = os.path.join(project_root, "backups")
    if not os.path.exists(backup_root):
        return []
    dirs = [d for d in os.listdir(backup_root) if os.path.isdir(os.path.join(backup_root, d))]
    dirs.sort(reverse=True) # Самые новые первыми
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

    # Пакетная вставка (Upsert)
    total = len(data)
    for i in range(0, total, BATCH_SIZE):
        batch = data[i:i + BATCH_SIZE]
        try:
            # Используем upsert для предотвращения дубликатов по ID
            supabase.table(table_name).upsert(batch).execute()
            logging.info(f"   ✅ Обработано {min(i + BATCH_SIZE, total)}/{total}")
        except Exception as e:
            logging.error(f"   ❌ Ошибка восстановления пакета {i}-{i+BATCH_SIZE} для '{table_name}': {e}")

def main():
    backups = get_backups()
    if not backups:
        logging.error("❌ В папке 'backups/' не найдено резервных копий.")
        return

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
        backup_path = os.path.join(project_root, "backups", selected_backup)
        
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

    except ValueError:
        print("Неверный ввод.")
    except KeyboardInterrupt:
        print("\nОтмена.")

if __name__ == "__main__":
    main()
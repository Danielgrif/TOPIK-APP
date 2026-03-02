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

def get_exports():
    """Возвращает список доступных папок с экспортом схемы."""
    export_root = os.path.join(project_root, "schema_export")
    if not os.path.exists(export_root):
        return []
    dirs = [d for d in os.listdir(export_root) if os.path.isdir(os.path.join(export_root, d))]
    dirs.sort(reverse=True) # Самые новые первыми
    return dirs

def import_schema():
    """Основная функция импорта."""
    exports = get_exports()
    if not exports:
        logging.error("❌ В папке 'schema_export/' не найдено резервных копий схемы.")
        return

    print("\nДоступные экспорты схемы:")
    for idx, d in enumerate(exports):
        print(f"{idx + 1}. {d}")

    try:
        choice = input("\nВыберите номер экспорта для восстановления (или 'q' для выхода): ")
        if choice.lower() == 'q': return
        
        idx = int(choice) - 1
        if idx < 0 or idx >= len(exports):
            print("Неверный выбор.")
            return
            
        selected_export = exports[idx]
        export_path = os.path.join(project_root, "schema_export", selected_export)
        
        print(f"\n⚠️  ВНИМАНИЕ: Скрипт попытается создать таблицы в базе '{SUPABASE_URL}'.")
        print("Если таблицы уже существуют, выполнение CREATE TABLE приведет к ошибке (данные не будут перезаписаны).")
        confirm = input(f"Вы уверены, что хотите применить схему из '{selected_export}'? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Отмена.")
            return

        logging.info(f"🚀 Начало импорта схемы из {selected_export}...")
        
        files = [f for f in os.listdir(export_path) if f.endswith(".sql")]
        
        for file in files:
            file_path = os.path.join(export_path, file)
            table_name = file.replace(".sql", "")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
                
            logging.info(f"📄 Обработка {table_name}...")
            try:
                supabase.rpc('exec_sql', {'sql': sql_content}).execute()
                logging.info(f"   ✅ SQL выполнен для {table_name}")
            except Exception as e:
                logging.error(f"   ❌ Ошибка при создании {table_name}: {e}")

        logging.info("🏁 Импорт схемы завершен.")

    except ValueError:
        print("Неверный ввод.")
    except KeyboardInterrupt:
        print("\nОтмена.")

if __name__ == "__main__":
    import_schema()
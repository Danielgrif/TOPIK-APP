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
    logging.error("❌ ОШИБКА: Не найдены переменные окружения (SUPABASE_URL/VITE_SUPABASE_URL или ключи).")
    sys.exit(1)

# Очистка ключей
SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def run_migration():
    """Выполняет SQL миграцию для добавления недостающих колонок"""
    logging.info("🚀 Запуск миграции схемы БД...")

    # SQL для добавления колонок, если они не существуют
    # Supabase (PostgreSQL) поддерживает IF NOT EXISTS
    sql_commands = """
    ALTER TABLE public.user_global_stats
    ADD COLUMN IF NOT EXISTS league text DEFAULT 'Bronze',
    ADD COLUMN IF NOT EXISTS weekly_xp bigint DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_week_id text,
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS full_name text;

    ALTER TABLE public.vocabulary
    ADD COLUMN IF NOT EXISTS grammar_info text;
    """

    try:
        # Попытка выполнить миграцию через RPC
        try:
            logging.info("🔄 Попытка автоматической миграции через RPC...")
            supabase.rpc('exec_sql', {'sql': sql_commands}).execute()
            logging.info("✅ Миграция успешно применена!")
            return
        except Exception:
            # Если ошибка (например, функции нет), выводим инструкцию
            pass

        logging.info("ℹ️ Для выполнения миграции выполните следующий SQL в Supabase SQL Editor:")
        print("\n" + "="*60)
        print("-- 1. ВАЖНО: Сначала создайте функцию-хелпер (если её нет):")
        print("CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; END; $$;")
        print("REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public, anon, authenticated;")
        print("GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;")
        print("\n-- 2. Затем выполните SQL для обновления схемы:")
        print(sql_commands.strip())
        print("="*60 + "\n")
        
    except Exception as e:
        logging.error(f"❌ Ошибка при подготовке миграции: {e}")

if __name__ == "__main__":
    run_migration()
    logging.info("🏁 Скрипт завершен.")
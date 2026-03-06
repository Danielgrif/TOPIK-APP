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
    logging.error("❌ ОШИБКА: Не найдены переменные окружения.")
    sys.exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def fix_column_types():
    """Исправляет типы колонок word_id с text на bigint."""
    logging.info("🔧 Исправление типов колонок (text -> bigint)...")
    
    sql = """
    DO $$
    DECLARE
        col_type text;
    BEGIN
        -- 1. Проверка и исправление user_progress.word_id
        SELECT data_type INTO col_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'word_id';
        
        IF col_type = 'text' OR col_type = 'character varying' THEN
            RAISE NOTICE 'Converting user_progress.word_id to bigint...';
            -- Удаляем записи с нечисловыми ID (старые UUID или мусор), так как они несовместимы с bigint
            DELETE FROM public.user_progress WHERE word_id !~ '^[0-9]+$';
            -- Конвертируем тип колонки
            ALTER TABLE public.user_progress ALTER COLUMN word_id TYPE bigint USING word_id::bigint;
        END IF;

        -- 2. Проверка и исправление list_items.word_id
        SELECT data_type INTO col_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'list_items' AND column_name = 'word_id';
        
        IF col_type = 'text' OR col_type = 'character varying' THEN
            RAISE NOTICE 'Converting list_items.word_id to bigint...';
            DELETE FROM public.list_items WHERE word_id !~ '^[0-9]+$';
            ALTER TABLE public.list_items ALTER COLUMN word_id TYPE bigint USING word_id::bigint;
        END IF;
    END $$;
    
    -- Обновляем кэш схемы Supabase (обязательно!)
    NOTIFY pgrst, 'reload';
    """

    try:
        supabase.rpc('exec_sql', {'sql': sql}).execute()
        logging.info("✅ Типы колонок успешно исправлены (или уже были корректны).")
        logging.info("👉 Теперь перезагрузите страницу приложения в браузере.")
    except Exception as e:
        logging.error(f"❌ Ошибка при выполнении SQL: {e}")
        logging.info("💡 Убедитесь, что функция exec_sql существует (запустите scripts/setup_rpc.py если нет).")

if __name__ == "__main__":
    fix_column_types()
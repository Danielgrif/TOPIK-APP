import os
import sys
import logging
from dotenv import load_dotenv
from supabase import create_client

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# Загрузка переменных
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

# Очистка ключей
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def migrate_articles():
    logging.info("🚀 Создание таблицы articles...")

    sql = """
    CREATE TABLE IF NOT EXISTS public.articles (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        title text NOT NULL,
        content text NOT NULL,
        translation text,
        level text DEFAULT 'TOPIK I',
        topic text,
        image_url text,
        audio_url text,
        source text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.articles;
    CREATE POLICY "Enable read access for all users" ON public.articles FOR SELECT USING (true);
    """

    supabase.rpc('exec_sql', {'sql': sql}).execute()
    logging.info("✅ Таблица articles создана и настроена.")

if __name__ == "__main__":
    migrate_articles()
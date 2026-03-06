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

def run_migration():
    """Объединяет user_vocabulary и vocabulary."""
    logging.info("🚀 Запуск миграции объединения таблиц...")

    sql_commands = """
    -- 1. Добавляем колонки владельца и видимости в основную таблицу
    ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
    ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

    -- 2. Делаем существующие системные слова публичными
    UPDATE public.vocabulary SET is_public = true WHERE created_by IS NULL;

    -- 3. Переносим данные (если таблица user_vocabulary существует)
    DO $$
    DECLARE
        r RECORD;
        new_id_val bigint;
        table_exists boolean;
    BEGIN
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_vocabulary') INTO table_exists;
        
        IF table_exists THEN
            FOR r IN EXECUTE 'SELECT * FROM public.user_vocabulary' LOOP
                -- Вставляем слово в общую таблицу как личное
                INSERT INTO public.vocabulary (
                    word_kr, translation, image, image_source, audio_url, audio_male, example_audio, type, 
                    created_by, is_public, topic, category, level
                )
                VALUES (
                    r.word_kr, r.translation, r.image, r.image_source, r.audio_url, r.audio_male, r.example_audio, r.type, 
                    r.user_id, false, 'My Words', 'Custom', 'User'
                )
                RETURNING id INTO new_id_val;

                -- Обновляем ссылки в user_progress (прогресс изучения)
                UPDATE public.user_progress 
                SET word_id = new_id_val 
                WHERE user_id = r.user_id AND word_id = r.id;

                -- Обновляем ссылки в списках слов
                UPDATE public.list_items
                SET word_id = new_id_val
                WHERE word_id = r.id AND list_id IN (SELECT id FROM public.user_lists WHERE user_id = r.user_id);
                
            END LOOP;

            -- Переименовываем старую таблицу, чтобы не мешалась, но данные остались
            ALTER TABLE public.user_vocabulary RENAME TO user_vocabulary_backup;
        END IF;
    END $$;
    
    -- 4. Обновляем кэш API
    NOTIFY pgrst, 'reload';
    """

    try:
        logging.info("⚙️ Выполнение SQL транзакции...")
        supabase.rpc('exec_sql', {'sql': sql_commands}).execute()
        logging.info("✅ Миграция успешно завершена! Таблицы объединены.")
        logging.info("ℹ️ Старая таблица переименована в 'user_vocabulary_backup'.")
        
    except Exception as e:
        logging.error(f"❌ Ошибка миграции: {e}")
        logging.info("💡 Убедитесь, что функция exec_sql существует (запустите scripts/fix_db_issues.py).")

if __name__ == "__main__":
    run_migration()
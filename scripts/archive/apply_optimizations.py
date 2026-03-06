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
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

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

def apply_indexes():
    """Применяет индексы для ускорения запросов."""
    logging.info("🚀 Применение оптимизаций базы данных...")

    sql_commands = """
    -- 1. Ускорение фильтрации словаря (Grid View)
    CREATE INDEX IF NOT EXISTS idx_vocabulary_topic ON public.vocabulary (topic);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_category ON public.vocabulary (category);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_level ON public.vocabulary (level);
    
    -- 2. Ускорение поиска дубликатов при добавлении слов
    CREATE INDEX IF NOT EXISTS idx_vocabulary_word_kr ON public.vocabulary (word_kr);
    
    -- 3. Критически важный индекс для SRS (Интервальные повторения)
    -- Позволяет мгновенно находить слова, которые нужно повторить сегодня
    CREATE INDEX IF NOT EXISTS idx_user_progress_schedule 
    ON public.user_progress (user_id, is_learned, sm2_next_review);
    
    -- 4. Ускорение работы списков слов
    CREATE INDEX IF NOT EXISTS idx_list_items_lookup ON public.list_items (list_id, word_id);
    
    -- 5. Индекс для очереди заявок (чтобы воркер быстро находил pending)
    CREATE INDEX IF NOT EXISTS idx_word_requests_status ON public.word_requests (status);
    
    -- 6. Очистка кэша схемы (на всякий случай)
    NOTIFY pgrst, 'reload';
    """

    try:
        # Используем существующую RPC функцию exec_sql
        logging.info("⚙️ Выполнение SQL команд...")
        supabase.rpc('exec_sql', {'sql': sql_commands}).execute()
        logging.info("✅ Индексы успешно созданы!")
        
    except Exception as e:
        logging.error(f"❌ Ошибка при выполнении SQL: {e}")
        logging.info("💡 Убедитесь, что функция exec_sql существует (запустите scripts/fix_db_issues.py).")
        
        print("\nЕсли автоматическое выполнение не сработало, выполните этот SQL в Supabase Dashboard:")
        print("="*40)
        print(sql_commands)
        print("="*40)

if __name__ == "__main__":
    apply_indexes()
    logging.info("🏁 Готово.")
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

def cleanup_trash():
    logging.info("🗑️  Поиск слов в корзине (deleted_at != null)...")
    
    # 1. Получаем список ID удаленных слов
    res = supabase.table("vocabulary").select("id, word_kr, created_by").not_.is_("deleted_at", "null").execute()
    
    if not res.data:
        logging.info("✅ Корзина пуста (нет слов с deleted_at).")
        return

    count = len(res.data)
    print(f"\nНайдено {count} слов в корзине (скрытых soft-delete).")
    print("Примеры:", ", ".join([w['word_kr'] for w in res.data[:5]]))
    
    confirm = input("\n⚠️ Удалить их навсегда? (yes/no): ")
    if confirm.lower() not in ['yes', 'y']:
        print("Отмена.")
        return

    # 2. Удаляем (каскадно удалятся и из user_progress, если настроено, но лучше явно)
    ids = [r['id'] for r in res.data]
    supabase.table("user_progress").delete().in_("word_id", ids).execute()
    supabase.table("list_items").delete().in_("word_id", ids).execute()
    supabase.table("vocabulary").delete().in_("id", ids).execute()
    
    logging.info(f"✅ Успешно удалено {count} слов и связанные данные.")

if __name__ == "__main__":
    cleanup_trash()
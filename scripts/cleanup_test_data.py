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

def cleanup_test_data():
    logging.info("🔍 Поиск тестовых данных (активных и удаленных)...")
    
    # Критерии поиска тестовых слов:
    # 1. Тема = 'Test Cycle' (устанавливается скриптом test_lifecycle.py)
    # 2. Категория = 'Test'
    # 3. Слово начинается с 'TestWord_' (старые тесты)
    # 4. Слово начинается с '테스트' (сгенерированные тесты)
    
    candidates = {}

    def add_candidates(res):
        if res.data:
            for item in res.data:
                candidates[item['id']] = item

    # 1. По метаданным
    logging.info("   ... поиск по topic='Test Cycle'...")
    res = supabase.table("vocabulary").select("id, word_kr, topic, category").eq('topic', 'Test Cycle').execute()
    add_candidates(res)
    
    logging.info("   ... поиск по category='Test'...")
    res = supabase.table("vocabulary").select("id, word_kr, topic, category").eq('category', 'Test').execute()
    add_candidates(res)

    # 2. По названию
    logging.info("   ... поиск по маске 'TestWord_%'...")
    res = supabase.table("vocabulary").select("id, word_kr, topic, category").ilike('word_kr', 'TestWord_%').execute()
    add_candidates(res)

    logging.info("   ... поиск по маске '테스트%'...")
    res = supabase.table("vocabulary").select("id, word_kr, topic, category").ilike('word_kr', '테스트%').execute()
    add_candidates(res)

    if not candidates:
        logging.info("✅ Тестовые слова не найдены.")
        return

    print(f"\nНайдено {len(candidates)} тестовых слов.")
    print("Примеры:")
    for w in list(candidates.values())[:10]:
        print(f" - {w['word_kr']} (ID: {w['id']}, Topic: {w.get('topic')})")
    
    if len(candidates) > 10:
        print(f" ... и еще {len(candidates) - 10}")

    confirm = input("\n⚠️ Удалить эти слова и связанные данные НАВСЕГДА? (yes/no): ")
    if confirm.lower() not in ['yes', 'y']:
        print("Отмена.")
        return

    ids = list(candidates.keys())
    
    # Удаление пачками по 1000
    batch_size = 1000
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i+batch_size]
        
        logging.info(f"🗑️ Удаление пачки {i+1}-{min(i+batch_size, len(ids))}...")
        
        # 1. Удаляем из связанных таблиц
        supabase.table("user_progress").delete().in_("word_id", batch_ids).execute()
        supabase.table("list_items").delete().in_("word_id", batch_ids).execute()
        
        # 2. Удаляем сами слова
        supabase.table("vocabulary").delete().in_("id", batch_ids).execute()

    # Чистка заявок
    logging.info("🧹 Очистка таблицы заявок (word_requests)...")
    supabase.table("word_requests").delete().eq('topic', 'Test Cycle').execute()
    supabase.table("word_requests").delete().ilike('word_kr', 'TestWord_%').execute()
    
    logging.info("✅ Очистка завершена.")

if __name__ == "__main__":
    cleanup_test_data()
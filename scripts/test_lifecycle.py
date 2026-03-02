import os
import sys
import time
import logging
import uuid
import random
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
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")

# Очистка ключей
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_unique_korean_word():
    """Выбирает слово для теста и очищает его старые копии."""
    # Список реальных слов для теста
    candidates = [
        "사과", "바나나", "포도", "수박", "딸기", "오렌지", "복숭아", "체리", "파인애플", "망고",
        "학교", "병원", "은행", "우체국", "경찰서", "도서관", "박물관", "미술관", "영화관", "공원",
        "하늘", "구름", "바람", "비", "눈", "천둥", "번개", "무지개", "안개", "이슬"
    ]
    word = random.choice(candidates)
    
    logging.info(f"🧹 Очистка старых данных для слова '{word}'...")
    # Удаляем старые записи, чтобы тест был чистым
    supabase.table("vocabulary").delete().eq("word_kr", word).execute()
    supabase.table("word_requests").delete().eq("word_kr", word).execute()
    
    return word

def test_cycle():
    test_word = get_unique_korean_word()
    logging.info(f"🧪 Выбрано слово для теста: {test_word}")
    
    # Пытаемся получить реального пользователя для теста, чтобы избежать ошибки FK
    user_id = str(uuid.uuid4()) # Fallback
    try:
        # Пробуем получить список пользователей через Admin API
        users_resp = supabase.auth.admin.list_users()
        # В зависимости от версии библиотеки, users может быть атрибутом или самим списком
        users = getattr(users_resp, 'users', users_resp) if users_resp else []
        
        if users and len(users) > 0:
            user = users[0]
            user_id = user.id
            email = getattr(user, 'email', 'unknown')
            logging.info(f"👤 Используем существующего пользователя: {email} (ID: {user_id})")
    except Exception as e:
        logging.warning(f"⚠️ Не удалось получить пользователя через API: {e}. Используем случайный UUID.")
    
    logging.info(f"🚀 1. Создание заявки на слово: {test_word}")
    req_data = {
        "word_kr": test_word,
        "status": "pending",
        "user_id": user_id,
        "topic": "Test Cycle",
        "category": "Test"
    }
    
    res = supabase.table("word_requests").insert(req_data).execute()
    if not res.data:
        logging.error("❌ Не удалось создать заявку.")
        return
    
    logging.info("✅ Заявка создана. Ждем обработки воркером (запустите content_worker.py)...")
    
    # Ожидание обработки (макс 30 сек)
    vocab_id = None
    for i in range(30):
        time.sleep(1)
        # Проверяем статус заявки
        r = supabase.table("word_requests").select("status").eq("word_kr", test_word).execute()
        status = r.data[0]['status'] if r.data else 'unknown'
        
        if status == 'processed':
            logging.info("✅ Заявка обработана воркером!")
            # Ищем слово в словаре
            v = supabase.table("vocabulary").select("id, word_kr, created_by").eq("word_kr", test_word).execute()
            if v.data:
                vocab_id = v.data[0]['id']
                creator = v.data[0]['created_by']
                logging.info(f"✅ Слово найдено в vocabulary. ID: {vocab_id}")
                if creator == user_id:
                     logging.info("✅ Владелец слова установлен корректно.")
                else:
                     logging.warning(f"⚠️ Владелец слова не совпадает (Expected: {user_id}, Got: {creator})")
                break
        elif status == 'error':
            logging.error("❌ Воркер вернул ошибку обработки.")
            return
        
        if i % 5 == 0:
            logging.info(f"   Ждем... ({i}с) Статус: {status}")

    if not vocab_id:
        logging.error("❌ Тайм-аут: слово не появилось в словаре.")
        return

    logging.info("🚀 2. Тест удаления (Soft Delete)...")
    # Эмулируем удаление (через service_role это всегда сработает, но проверит логику БД)
    del_res = supabase.table("vocabulary").update({"deleted_at": "now()"}).eq("id", vocab_id).execute()
    
    if del_res.data:
        logging.info("✅ Слово успешно помечено как удаленное.")
    else:
        logging.error("❌ Ошибка при удалении.")

if __name__ == "__main__":
    test_cycle()
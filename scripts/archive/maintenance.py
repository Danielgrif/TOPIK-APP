import os
import logging
from app_utils import execute_supabase_query
from constants import DB_TABLES, WORD_REQUEST_STATUS

def cleanup_temp_files():
    """Удаляет временные mp3 файлы, оставшиеся от предыдущих запусков."""
    try:
        for f in os.listdir("."):
            if f.startswith("temp_") and f.endswith(".mp3"):
                try:
                    os.remove(f)
                    logging.info(f"🧹 Удален старый временный файл: {f}")
                except Exception as e:
                    logging.warning(f"⚠️ Не удалось удалить {f}: {e}")
    except Exception as e:
        logging.warning(f"⚠️ Ошибка очистки временных файлов: {e}")

async def reset_failed_requests(supabase_client):
    """Сбрасывает статус ошибочных заявок на 'pending' для повторной обработки."""
    try:
        # Пытаемся обновить статус ERROR -> PENDING
        builder = supabase_client.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['PENDING']}).eq('status', WORD_REQUEST_STATUS['ERROR'])
        res = await execute_supabase_query(builder)
        
        count = len(res.data) if res and res.data else 0
        if count > 0:
            logging.info(f"♻️ Авто-сброс: {count} ошибочных заявок возвращено в очередь.")
    except Exception as e:
        logging.warning(f"⚠️ Ошибка при авто-сбросе заявок: {e}")
# Перед запуском установите необходимые библиотеки командой:
# pip install -r ../requirements.txt

import os
import re
import sys
import time
import hashlib
import random
import logging
import threading
import asyncio
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from io import BytesIO
import json
import warnings

warnings.simplefilter(action='ignore', category=FutureWarning)

# Добавляем путь к пользовательским пакетам (на случай, если Python их не видит)
import site
try:
    sys.path.append(site.getusersitepackages())
except AttributeError: pass

try:
    import requests
    import aiohttp
    from supabase import create_client
    import edge_tts # type: ignore
    from PIL import Image
    from google import genai
except ImportError as e:
    logging.error(f"❌ Ошибка импорта библиотек: {e}")
    logging.error("Вероятно, файлы библиотек повреждены. Попробуйте выполнить эту команду для исправления:")
    # Формируем путь к requirements.txt относительно скрипта
    req_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "requirements.txt")
    logging.error(f'"{sys.executable}" -m pip install --force-reinstall -r "{req_path}"')
    sys.exit(1)

# Импорт локальных модулей (после настройки путей и библиотек)
script_dir = os.path.dirname(os.path.abspath(__file__))
try:
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    
    from tts_generator import TTSGenerator, MIN_FILE_SIZE # type: ignore
    from ai_generator import AIContentGenerator # type: ignore
    from app_utils import ( # type: ignore
        setup_logging, load_config, init_supabase, 
        execute_supabase_query, _execute_with_retry,
        delete_old_file, upload_to_supabase, optimize_image_data
    )
    from constants import DB_TABLES, DB_BUCKETS, WORD_REQUEST_STATUS
    from tts_handler import TTSHandler
    from ai_handler import AIHandler
    from realtime_handler import realtime_loop
    from maintenance import cleanup_temp_files, reset_failed_requests
except ImportError as e:
    print(f"❌ Ошибка импорта локальных модулей: {e}")
    sys.exit(1)

# 1. Настройка логирования
setup_logging()

# 2. Загрузка конфигурации
SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY = load_config(__file__)

# Глобальные флаги состояния схемы
HAS_GRAMMAR_INFO = True

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY (или их VITE_ аналоги).")
    logging.error("Убедитесь, что файл .env создан и содержит эти ключи.")
    sys.exit(1)

# Настройка аргументов командной строки
parser = argparse.ArgumentParser(description="Фоновый воркер TOPIK APP: обработка заявок и генерация контента")
parser.add_argument("--topic", type=str, help="Обработать только слова из конкретной темы (фильтр по колонке 'topic')")
parser.add_argument("--word", type=str, help="Обработать только конкретное слово (фильтр по 'word_kr')")
parser.add_argument("--force-images", action="store_true", help="Принудительно обновить изображения (перезаписать старые)")
parser.add_argument("--force-audio", action="store_true", help="Принудительно обновить аудио (перезаписать старые)")
parser.add_argument("--force-quotes", action="store_true", help="Принудительно обновить аудио только для цитат")
parser.add_argument("--retry-errors", action="store_true", help="Сбросить статус ошибочных заявок на 'pending' для повторной обработки")
parser.add_argument("--exit-after-maintenance", action="store_true", help="Завершить работу после выполнения задач обслуживания")
parser.add_argument("--concurrency", type=int, default=0, help="Количество одновременных потоков (0 = авто-подбор, по умолчанию 0)")
args = parser.parse_args()

# 3. Инициализация Supabase
supabase = init_supabase(SUPABASE_URL, SUPABASE_KEY)

# 1.1 Проверка и создание бакета (автоматическая настройка)
try:
    buckets = supabase.storage.list_buckets()
    if not any(b.name == DB_BUCKETS['AUDIO'] for b in buckets):
        logging.info(f"📦 Бакет '{DB_BUCKETS['AUDIO']}' не найден. Создаю новый публичный бакет...")
        supabase.storage.create_bucket(DB_BUCKETS['AUDIO'], options={"public": True})
        logging.info(f"✅ Бакет '{DB_BUCKETS['AUDIO']}' успешно создан.")
    else:
        logging.info(f"ℹ️ Бакет '{DB_BUCKETS['AUDIO']}' уже существует.")
except Exception as e:
    # Игнорируем ошибку, если бакет уже есть, но API вернул ошибку прав доступа
    logging.warning(f"⚠️ Проверка бакета: {e}")

# 1.2 Проверка и создание бакета для изображений
try:
    buckets = supabase.storage.list_buckets()
    if not any(b.name == DB_BUCKETS['IMAGES'] for b in buckets):
        logging.info(f"📦 Бакет '{DB_BUCKETS['IMAGES']}' не найден. Создаю новый публичный бакет...")
        supabase.storage.create_bucket(DB_BUCKETS['IMAGES'], options={"public": True})
        logging.info(f"✅ Бакет '{DB_BUCKETS['IMAGES']}' успешно создан.")
    else:
        # Если бакет уже есть, убедимся, что он публичный
        logging.info(f"ℹ️ Бакет '{DB_BUCKETS['IMAGES']}' найден. Обновляю права на Public...")
        supabase.storage.update_bucket(DB_BUCKETS['IMAGES'], {"public": True})
except Exception as e:
    logging.warning(f"⚠️ Проверка бакета изображений: {e}")

if args.retry_errors:
    try:
        logging.info(f"🔄 Сброс заявок со статусом '{WORD_REQUEST_STATUS['ERROR']}' на '{WORD_REQUEST_STATUS['PENDING']}'...")
        res = supabase.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['PENDING']}).eq('status', WORD_REQUEST_STATUS['ERROR']).execute()
        count = len(res.data) if res.data else 0
        logging.info(f"✅ Сброшено заявок: {count}")
    except Exception as e:
        logging.error(f"❌ Ошибка сброса заявок: {e}")
    
    if args.exit_after_maintenance:
        logging.info("🏁 Обслуживание завершено. Выход.")
        sys.exit(0)

def clean_query_for_pixabay(text):
    """Очищает текст перевода для лучшего поиска картинок."""
    if not text: return ""
    # Убираем текст в скобках (например: "женщина (взрослая)")
    text = re.sub(r'\(.*?\)', '', text)
    # Берем только первую часть до запятой или точки с запятой
    text = re.split(r'[;,]', text)[0]
    return text.strip()

# Инициализация генераторов
tts_gen = TTSGenerator()
ai_gen = AIContentGenerator(GEMINI_API_KEY)

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

# Инициализация обработчиков
tts_handler = TTSHandler(supabase, tts_gen)
ai_handler = AIHandler(supabase, ai_gen, SUPABASE_URL, SUPABASE_KEY)

async def reset_failed_requests():
    """Сбрасывает статус ошибочных заявок на 'pending' для повторной обработки."""
    try:
        # Пытаемся обновить статус ERROR -> PENDING
        builder = supabase.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['PENDING']}).eq('status', WORD_REQUEST_STATUS['ERROR'])
        res = await execute_supabase_query(builder)
        
        count = len(res.data) if res and res.data else 0
        if count > 0:
            logging.info(f"♻️ Авто-сброс: {count} ошибочных заявок возвращено в очередь.")
    except Exception as e:
        logging.warning(f"⚠️ Ошибка при авто-сбросе заявок: {e}")

async def _generate_content_for_word(session, row):
    """Генерация контента для слова (аудио, картинки)"""
    word = row.get('word_kr')
    translation = row.get('translation')
    example = row.get('example_kr')
    word_hash = hashlib.md5(word.encode('utf-8')).hexdigest()

    tasks = [
        tts_handler.handle_main_audio(row, word, word_hash, args.force_audio),
        tts_handler.handle_male_audio(row, word, word_hash, args.force_audio),
        tts_handler.handle_example_audio(row, example, args.force_audio),
        ai_handler.handle_image(session, row, translation, word_hash, args.force_images)
    ]
    
    results = await asyncio.gather(*tasks)
    updates = {}
    for res in results:
        if res: updates.update(res)
    return updates

def _handle_processing_error(e, word, error_counter):
    """Логирование ошибок обработки"""
    err_str = str(e).lower()
    if isinstance(e, (aiohttp.ClientError, asyncio.TimeoutError)) or \
       'timeout' in err_str or 'connection' in err_str or 'network' in err_str:
        logging.warning(f"🌐 Сетевая ошибка при обработке '{word}': {e}")
        error_counter['network'] += 1
    else:
        logging.error(f"❌ Ошибка обработки слова '{word}': {e}")
        error_counter['other'] += 1

async def process_word(sem, session, row, error_counter):
    """Обработка одного слова (асинхронно)"""
    async with sem: # Ограничиваем количество одновременных задач
        row_id = row.get('id')
        word = row.get('word_kr')
        
        if not isinstance(row, dict) or not word or not isinstance(word, str):
            return row_id

        try:
            updates_to_make = await _generate_content_for_word(session, row)
            
            if updates_to_make:
                builder = supabase.table(DB_TABLES['VOCABULARY']).update(updates_to_make).eq("id", row_id)
                await execute_supabase_query(builder)
                return None # Успех
            else:
                return row_id
        except Exception as e:
            _handle_processing_error(e, word, error_counter)
            return row_id

async def process_quote(sem, session, row):
    """Асинхронная обработка одной цитаты"""
    async with sem:
        row_id = row.get('id')
        try:
            updates = await tts_handler.handle_quote_audio(row, args.force_audio or args.force_quotes)
            if updates:
                builder = supabase.table(DB_TABLES['QUOTES']).update(updates).eq('id', row_id)
                await execute_supabase_query(builder)
        except Exception as e:
            logging.error(f"❌ Ошибка цитаты {row_id}: {e}")

async def measure_network_quality():
    """Измеряет задержку сети и возвращает оптимальное количество потоков."""
    logging.info("📡 Анализ скорости соединения...")
    test_url = "https://www.google.com"
    start = time.time()
    try:
        async with aiohttp.ClientSession() as session:
            # Делаем 3 легких запроса для усреднения
            for _ in range(3):
                async with session.get(test_url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    await response.read()
        
        duration = time.time() - start
        avg_latency = duration / 3
        
        logging.info(f"⏱ Средний отклик: {avg_latency:.3f} сек.")
        
        if avg_latency < 0.15: return 25 # Отличный интернет
        if avg_latency < 0.30: return 15 # Хороший
        if avg_latency < 0.60: return 8  # Средний
        if avg_latency < 1.00: return 4  # Медленный
        return 2 # Очень медленный
        
    except Exception as e:
        logging.warning(f"⚠️ Не удалось измерить скорость ({e}). Использую значение по умолчанию (5).")
        return 5

async def user_requests_loop(trigger_event):
    """Приоритетный цикл для обработки заявок пользователей"""
    logging.info("👀 Запущен мониторинг пользовательских заявок (Приоритетный поток)...")
    
    # Настройки Backoff (умного ожидания)
    min_sleep = 2
    max_sleep = 30
    current_sleep = min_sleep

    while True:
        try:
            # Всегда проверяем заявки
            builder = supabase.table(DB_TABLES['WORD_REQUESTS']).select("*").eq('status', WORD_REQUEST_STATUS['PENDING']).limit(5)
            reqs = await execute_supabase_query(builder)
            if reqs and reqs.data:
                logging.info(f"⚡ Найдено {len(reqs.data)} новых заявок от пользователей.")
                async with aiohttp.ClientSession() as session:
                    for req in reqs.data:
                        await ai_handler.process_word_request(req, session=session, content_gen_callback=_generate_content_for_word)
                # Если были задачи, сбрасываем таймер и проверяем снова быстро
                current_sleep = min_sleep
                await asyncio.sleep(0.1)
            else:
                # Ждем события от Realtime ИЛИ истечения таймера (Backoff)
                try:
                    await asyncio.wait_for(trigger_event.wait(), timeout=current_sleep)
                    trigger_event.clear() # Сбрасываем событие
                    logging.info("⚡ Воркер разбужен событием Realtime!")
                    current_sleep = min_sleep # Сразу сбрасываем сон для быстрой реакции
                except asyncio.TimeoutError:
                    # Если событие не пришло за время current_sleep, увеличиваем время сна
                    current_sleep = min(current_sleep * 1.5, max_sleep)
                    
        except Exception as e:
            logging.error(f"❌ Ошибка в цикле заявок: {e}")
            await asyncio.sleep(5)

async def background_tasks_loop(initial_concurrency):
    """Фоновый цикл для обслуживания контента (цитаты, пропуски)"""
    concurrency = initial_concurrency
    logging.info(f"🛠 Запущены фоновые задачи (Начальных потоков: {concurrency})...")
    
    last_reset_time = 0

    # Локальный кэш игнорируемых ID (чтобы не долбить одни и те же ошибки)
    ignore_ids = set()

    # Настройки Backoff
    min_sleep = 5
    max_sleep = 120 # До 2 минут простоя, если нет задач
    current_sleep = min_sleep

    while True:
        try:
            # Автоматический сброс ошибок каждые 10 минут (600 сек)
            if time.time() - last_reset_time > 600:
                await reset_failed_requests(supabase)
                last_reset_time = time.time()

            cleanup_temp_files()
            
            # 0.5. Обработка цитат (Quotes)
            try:
                q_query = supabase.table(DB_TABLES['QUOTES']).select("*")
                if not (args.force_audio or args.force_quotes):
                    # Обрабатываем те, у которых нет аудио (NULL или пустая строка)
                    q_query = q_query.or_("audio_url.is.null,audio_url.eq.")
                
                # FIX: Ограничиваем лимит цитат за раз, чтобы чаще проверять заявки пользователей
                q_query = q_query.limit(5)
                q_res = await execute_supabase_query(q_query)
                quotes = q_res.data if q_res else []
                
                if quotes:
                    logging.info(f"📜 Найдено {len(quotes)} цитат для озвучки.")
                    q_sem = asyncio.Semaphore(concurrency)
                    async with aiohttp.ClientSession() as session:
                        await asyncio.gather(*[process_quote(q_sem, session, r) for r in quotes])
            except Exception as e:
                logging.warning(f"⚠️ Пропуск цитат (возможно нет колонки audio_url): {e}")

            # Запрос к БД (синхронный, но быстрый)
            try:
                # Если включен режим только для цитат, пропускаем слова
                if args.force_quotes and not (args.force_images or args.force_audio):
                    words = []
                else:
                    if args.force_images or args.force_audio:
                        query = supabase.table(DB_TABLES['VOCABULARY']).select("*")
                    else:
                        # Берем больше слов за раз для эффективности
                        query = supabase.table(DB_TABLES['VOCABULARY']).select("*").or_("audio_url.is.null,audio_male.is.null,image.is.null,example_audio.is.null").limit(200)
                    
                    if args.topic:
                        query = query.ilike("topic", f"%{args.topic}%")

                    if args.word:
                        query = query.eq("word_kr", args.word)

                    response = await execute_supabase_query(query)
                    words = response.data if response else []
                    # Фильтруем слова, которые уже пытались обработать и не смогли
                    words = [w for w in words if isinstance(w, dict) and w.get('id') not in ignore_ids]
            except Exception as e:
                logging.error(f"Ошибка БД: {e}")
                words = []

            if not words:
                if args.force_quotes:
                    logging.info("🏁 Обработка цитат завершена.")
                    break
                elif not args.force_images and not args.force_audio:
                    if current_sleep < max_sleep:
                        logging.info(f"💤 Нет новых слов. Сплю {current_sleep:.1f} сек...")
                    await asyncio.sleep(current_sleep)
                    current_sleep = min(current_sleep * 1.5, max_sleep)
                else:
                    logging.info("🏁 Обработка завершена (force mode).")
                    break
                continue
            
            # Если задачи найдены - сбрасываем таймер сна
            current_sleep = min_sleep

            logging.info(f"🔥 Запуск обработки {len(words)} слов... (Потоков: {concurrency})")
            
            sem = asyncio.Semaphore(concurrency)
            error_counter = {'network': 0, 'other': 0}

            async with aiohttp.ClientSession() as session:
                tasks = [process_word(sem, session, row, error_counter) for row in words]
                results = await asyncio.gather(*tasks)
                
                # Добавляем проблемные ID в список игнорирования
                for res in results:
                    if res: ignore_ids.add(res)
                
                await asyncio.sleep(0.1) # Yield to event loop to prevent socket starvation on Windows
            
            # --- Логика адаптивной конкурентности ---
            batch_size = len(words)
            if batch_size > 0:
                network_error_rate = (error_counter['network'] / batch_size) * 100
                
                # Снижаем, если >15% задач в пачке упали с сетевой ошибкой
                if network_error_rate > 15.0:
                    new_concurrency = max(1, int(concurrency * 0.7)) # Уменьшаем на 30%
                    if new_concurrency < concurrency:
                        logging.warning(f"📉 Высокий уровень сетевых ошибок ({network_error_rate:.1f}%). Снижаю количество потоков с {concurrency} до {new_concurrency}.")
                        concurrency = new_concurrency
                # Повышаем, если не было ошибок и мы не на максимуме
                elif error_counter['network'] == 0 and concurrency < 25:
                    new_concurrency = min(25, concurrency + 1) # Увеличиваем на 1
                    if new_concurrency > concurrency:
                        logging.info(f"📈 Сеть стабильна. Увеличиваю количество потоков до {new_concurrency}.")
                        concurrency = new_concurrency

            logging.info(f"✨ Пачка обработана. Проблемных в этой сессии: {len(ignore_ids)}")

        except Exception as main_e:
            logging.error(f"🔥 Критическая ошибка цикла: {main_e}")
            await asyncio.sleep(60)

def check_schema_health():
    """Проверяет наличие необходимых колонок в ключевых таблицах."""
    global HAS_GRAMMAR_INFO
    logging.info("🔍 Проверка схемы базы данных...")
    
    schemas_to_check = {
        DB_TABLES['VOCABULARY']: [
            'id', 'word_kr', 'translation', 'image', 'image_source', 
            'audio_url', 'audio_male', 'example_audio', 'type',
            'grammar_info', 'created_by', 'is_public'
        ],
        DB_TABLES['WORD_REQUESTS']: [
            'id', 'word_kr', 'status', 'my_notes', 'target_list_id', 'user_id', 'translation'
        ],
        DB_TABLES['QUOTES']: [
            'id', 'quote_kr', 'audio_url'
        ]
    }
    
    all_ok = True
    for table, columns in schemas_to_check.items():
        try:
            # Используем синхронный вызов, так как это разовая проверка при старте
            _execute_with_retry(supabase.table(table).select(",".join(columns)).limit(1))
            logging.info(f"✅ Схема таблицы '{table}' корректна.")
        except Exception as e:
            all_ok = False
            err_msg = str(e)
            match = re.search(r"Could not find the '([^']+)' column", err_msg)
            if match:
                missing = match.group(1)
                if missing == 'grammar_info':
                    HAS_GRAMMAR_INFO = False
                    logging.warning(f"⚠️ ПРЕДУПРЕЖДЕНИЕ: В таблице '{table}' нет колонки '{missing}'. Данные грамматики не будут сохраняться.")
                    ai_handler.set_grammar_info_status(False)
                    all_ok = True # Не считаем это критической ошибкой
                else:
                    logging.error(f"🚨 ОШИБКА СХЕМЫ: В таблице '{table}' нет колонки '{missing}'")
            else:
                logging.error(f"🚨 ОШИБКА СХЕМЫ: Не удалось проверить таблицу '{table}': {e}")
    
    if not all_ok:
        logging.error(f"❌ Воркер не сможет работать корректно. Пожалуйста, примените SQL-миграции.")
    
    return all_ok

def validate_gemini_key():
    """Проверяет валидность ключа Gemini API."""
    if not GEMINI_API_KEY:
        return
    
    logging.info("🤖 Проверка ключа Gemini API...")
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        client.models.generate_content(model='gemini-2.5-flash', contents="Test")
        logging.info("✅ Ключ Gemini API валиден.")
    except Exception as e:
        logging.error(f"❌ Ошибка проверки ключа Gemini API: {e}")

async def main_loop():
    logging.info("🚀 Воркер запущен (Parallel Mode).")
    
    concurrency = args.concurrency
    if concurrency == 0:
        concurrency = await measure_network_quality()
        logging.info(f"⚡ Автоматически установлено потоков для фона: {concurrency}")
    
    # Проверка схемы перед запуском
    if not check_schema_health():
        sys.exit(1)
        
    # Проверка ключа AI
    validate_gemini_key()
    
    # Сброс ошибок при старте
    await reset_failed_requests(supabase)
    
    # Событие для пробуждения воркера
    request_trigger = asyncio.Event()
    
    # Запускаем оба цикла параллельно
    await asyncio.gather(
        user_requests_loop(request_trigger),
        background_tasks_loop(concurrency),
        realtime_loop(request_trigger, SUPABASE_URL, SUPABASE_KEY)
    )

if __name__ == "__main__":
    try:
        # FIX: Отключаем принудительный SelectorEventLoop, так как он вызывает WinError 10035 при нагрузке.
        # ProactorEventLoop (по умолчанию в Python 3.8+) работает стабильнее с SSL/Sockets на Windows.
        # if sys.platform == 'win32':
        #     asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logging.info("🛑 Остановка воркера.")

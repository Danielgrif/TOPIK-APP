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
from urllib.parse import urlparse, parse_qs, quote, unquote
from io import BytesIO
import json
import warnings

warnings.simplefilter(action='ignore', category=FutureWarning)

# Принудительная установка кодировки для консоли (Windows fix)
if sys.platform == 'win32':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError: pass

# Настройка логирования в файл log.txt
logging.basicConfig(
    handlers=[
        logging.FileHandler('log.txt', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ],
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Отключаем шум от HTTP-клиентов, оставляя только ошибки
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# Добавляем путь к пользовательским пакетам (на случай, если Python их не видит)
import site
try:
    sys.path.append(site.getusersitepackages())
except AttributeError: pass

try:
    import requests
    import aiohttp
    from supabase import create_client, create_async_client
    from dotenv import load_dotenv
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

# Пытаемся загрузить .env (стандарт) или env (если файл назван без точки)
# Определяем путь к папке скрипта, чтобы точно найти .env
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

# 1. Настройки
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY") # Нужен ключ с правами записи!
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Очистка ключей от кавычек, если они есть (частая проблема .env)
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")
if GEMINI_API_KEY: GEMINI_API_KEY = GEMINI_API_KEY.replace('"', '').replace("'", "")

# Проверка на дефолтное значение
if GEMINI_API_KEY == "ваш_ключ_здесь":
    GEMINI_API_KEY = None

# Константы для имен таблиц и бакетов
DB_TABLES = {
    "VOCABULARY": "vocabulary",
    "QUOTES": "quotes",
    "WORD_REQUESTS": "word_requests",
    "USER_PROGRESS": "user_progress",
    "LIST_ITEMS": "list_items",
    # "USER_VOCABULARY": "user_vocabulary", # Объединена с vocabulary
}
DB_BUCKETS = {
    "AUDIO": "audio-files",
    "IMAGES": "image-files",
}
WORD_REQUEST_STATUS = {
    "PENDING": "pending",
    "PROCESSED": "processed",
    "ERROR": "error",
}

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
parser.add_argument("--check", action="store_true", help="Запустить проверку целостности файлов и ссылок (удаление битых)")
parser.add_argument("--retry-errors", action="store_true", help="Сбросить статус ошибочных заявок на 'pending' для повторной обработки")
parser.add_argument("--exit-after-maintenance", action="store_true", help="Завершить работу после выполнения задач обслуживания")
parser.add_argument("--concurrency", type=int, default=0, help="Количество одновременных потоков (0 = авто-подбор, по умолчанию 0)")
args = parser.parse_args()

# Исправление предупреждения "Storage endpoint URL should have a trailing slash"
if not SUPABASE_URL.endswith("/"):
    SUPABASE_URL += "/" # type: ignore

# Патч для исправления ошибки "Storage endpoint URL should have a trailing slash"
try:
    StorageClient = None
    # Пробуем прямой импорт, который работает в большинстве версий supabase-py v1
    try:
        from storage3.utils import StorageClient # type: ignore
    except ImportError:
        try:
            # Альтернативный путь для старых версий
            from storage3.client import StorageClient # type: ignore
        except ImportError:
            try:
                # Еще один вариант для некоторых версий
                from storage3 import StorageClient # type: ignore
            except ImportError:
                pass

    if StorageClient is not None:
        _original_init = StorageClient.__init__
        def _patched_init(self, url, headers, *args, **kwargs):
            if url and not url.endswith("/"):
                url += "/"
            _original_init(self, url, headers, *args, **kwargs)
        StorageClient.__init__ = _patched_init
        logging.info("✅ Патч для StorageClient успешно применен.")
    else:
        logging.warning("⚠️ Не удалось найти StorageClient. Патч пропущен (возможно, он не нужен в этой версии).")
except Exception as e:
    logging.warning(f"⚠️ Не удалось применить патч для StorageClient: {e}")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Критическая ошибка при инициализации Supabase: {e}")
    logging.error("Проверьте URL и KEY в файле .env")
    sys.exit(1)

# Импорт локальных модулей (после настройки путей и библиотек)
try:
    # Добавляем текущую папку в path для импорта локальных модулей
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    
    from tts_generator import TTSGenerator, MIN_FILE_SIZE # type: ignore
    from ai_generator import AIContentGenerator # type: ignore
except ImportError as e:
    logging.error(f"❌ Ошибка импорта локальных модулей: {e}")
    logging.error(f"Папка скрипта: {script_dir}")
    logging.error("Убедитесь, что файлы 'tts_generator.py' и 'ai_generator.py' находятся в папке scripts/")
    sys.exit(1)

def _execute_with_retry(executable):
    """Выполняет синхронный запрос к Supabase с логикой повторных попыток."""
    max_retries = 4
    base_delay = 1.5
    for attempt in range(max_retries):
        try:
            return executable.execute()
        except Exception as e:
            err_str = str(e).lower()
            is_network_error = 'getaddrinfo failed' in err_str or '10054' in err_str or 'timed out' in err_str or 'connection' in err_str or '10051' in err_str
            if is_network_error and attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                # Логируем только первую попытку ретрая, чтобы не спамить в консоль при микро-разрывах
                if attempt == 0 or attempt == max_retries - 2:
                    logging.warning(f"🌐 Сетевая ошибка Supabase ({e}). Попытка {attempt + 2}/{max_retries} через {delay:.1f}с...")
                time.sleep(delay)
            else:
                raise e

async def execute_supabase_query(executable):
    """Асинхронная обертка для выполнения запросов к Supabase с повторными попытками."""
    loop = asyncio.get_running_loop()
    # Запускаем блокирующий вызов в отдельном потоке, чтобы не замораживать asyncio
    return await loop.run_in_executor(None, _execute_with_retry, executable)

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

async def delete_old_file(bucket, url):
    """Удаляет старый файл из хранилища перед загрузкой нового"""
    if not url: return
    try:
        filename = unquote(url.split('/')[-1].split('?')[0])
        loop = asyncio.get_running_loop()
        
        def _do_delete():
            for i in range(3):
                try:
                    return supabase.storage.from_(bucket).remove([filename])
                except Exception as e:
                    if "10035" in str(e) or "10054" in str(e): time.sleep(0.5); continue
                    raise e

        await loop.run_in_executor(None, _do_delete)
        logging.info(f"🗑 Удален старый файл: {filename}")
    except Exception as e:
        logging.warning(f"⚠️ Не удалось удалить старый файл {url}: {e}")

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

def check_integrity(bucket_name):
    """Проверка целостности файлов и ссылок в БД."""
    logging.info(f"🧹 Запуск проверки целостности для бакета '{bucket_name}'...")
    
    # 1. Получаем список файлов в бакете
    storage_files = {}
    try:
        offset = 0
        while True:
            res = supabase.storage.from_(bucket_name).list(path=None, options={"limit": 100, "offset": offset})
            if not res: break
            for f in res:
                name = f.get('name') if isinstance(f, dict) else getattr(f, 'name', None)
                size = f.get('metadata', {}).get('size', 0) if isinstance(f, dict) else getattr(f, 'metadata', {}).get('size', 0)
                if name: storage_files[name] = size
            offset += 100
            if len(res) < 100: break
        logging.info(f"📂 Файлов в хранилище: {len(storage_files)}")
    except Exception as e:
        logging.error(f"❌ Ошибка получения списка файлов: {e}")
        return

    # 2. Проверяем ссылки во всех таблицах
    referenced_files = set()
    fixed_count = 0

    # Определяем таблицы и колонки для проверки
    tables_to_check = []
    if bucket_name == DB_BUCKETS['AUDIO']:
        tables_to_check = [
            (DB_TABLES['VOCABULARY'], ['audio_url', 'audio_male', 'example_audio']),
            (DB_TABLES['QUOTES'], ['audio_url'])
        ]
    elif bucket_name == DB_BUCKETS['IMAGES']:
        tables_to_check = [
            (DB_TABLES['VOCABULARY'], ['image']),
        ]

    for table_name, target_cols in tables_to_check:
        try:
            rows = []
            offset = 0
            while True:
                # Выбираем только нужные колонки + id
                cols_query = "id," + ",".join(target_cols)
                res = supabase.table(table_name).select(cols_query).range(offset, offset + 999).execute()
                if not res.data: break
                rows.extend(res.data)
                offset += 1000
            
            for row in rows:
                row_id = row.get('id')
                updates = {}
                for col in target_cols:
                    url = row.get(col)
                    if not url or not isinstance(url, str): continue
                    
                    filename = unquote(url.split('/')[-1].split('?')[0])
                    min_size = 100 if bucket_name == DB_BUCKETS['AUDIO'] else 0
                    
                    if filename not in storage_files or storage_files[filename] <= min_size:
                        logging.warning(f"⚠️ Битая ссылка или пустой файл в '{table_name}': id={row_id} col={col} file={filename}")
                        updates[col] = None
                        if col == 'image':
                            updates['image_source'] = None
                    else:
                        referenced_files.add(filename)
                
                if updates:
                    supabase.table(table_name).update(updates).eq('id', row_id).execute()
                    fixed_count += 1

        except Exception as e:
            logging.error(f"❌ Ошибка проверки таблицы '{table_name}': {e}")

    logging.info(f"✅ Исправлено записей в БД: {fixed_count}")

    # 3. Удаляем сирот (файлы без ссылок)
    orphans = [f for f in storage_files if f not in referenced_files]
    if orphans:
        logging.info(f"🗑 Найдено {len(orphans)} потерянных файлов. Удаление...")
        # Удаляем пачками по 10
        for i in range(0, len(orphans), 10):
            batch = orphans[i:i+10]
            try:
                supabase.storage.from_(bucket_name).remove(batch)
                logging.info(f"   Удалено: {batch}")
            except Exception as e:
                logging.error(f"   Ошибка удаления: {e}")
    else:
        logging.info("✨ Лишних файлов не найдено.")

def optimize_image_data(data):
    """Оптимизация изображения с помощью Pillow"""
    try:
        img = Image.open(BytesIO(data))
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Ресайз если изображение слишком большое (>1024px)
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        output = BytesIO()
        img.save(output, format='JPEG', quality=80, optimize=True)
        return output.getvalue()
    except Exception as e:
        logging.warning(f"⚠️ Ошибка оптимизации изображения: {e}")
        return data

if args.check:
    check_integrity(DB_BUCKETS['AUDIO'])
    check_integrity(DB_BUCKETS['IMAGES'])
    logging.info("🏁 Проверка завершена. Переход к восстановлению контента...")

async def upload_to_supabase(bucket, path, data, content_type):
    """Асинхронная обертка для загрузки в Supabase"""
    loop = asyncio.get_running_loop()
    
    def _do_upload():
        for i in range(3):
            try:
                # Convert BytesIO to bytes to avoid "expected str, bytes or os.PathLike object, not BytesIO"
                file_data = data
                if hasattr(data, 'getvalue'):
                    file_data = data.getvalue()
                elif hasattr(data, 'seek') and hasattr(data, 'read'):
                    data.seek(0)
                    file_data = data.read()

                return supabase.storage.from_(bucket).upload(
                    path=path, file=file_data, file_options={"content-type": content_type, "upsert": "true"}
                )
            except Exception as e:
                if "10035" in str(e) or "10054" in str(e): time.sleep(1); continue
                raise e

    await loop.run_in_executor(None, _do_upload)

class TTSHandler:
    """Класс для управления генерацией аудио (TTS)"""
    def __init__(self, supabase_client, tts_generator):
        self.supabase = supabase_client
        self.tts_gen = tts_generator

    async def handle_main_audio(self, row, word, word_hash, force_audio=False):
        """Обработка основного аудио (Женский голос - SunHi)"""
        if row.get('audio_url') and not force_audio: return {}
        
        audio_filename = f"{word_hash}.mp3"
        
        audio_data = await self.tts_gen.generate_audio(word, "ko-KR-SunHiNeural")
        
        if audio_data:
            if row.get('audio_url'):
                await delete_old_file(DB_BUCKETS['AUDIO'], row.get('audio_url'))
            
            await upload_to_supabase(DB_BUCKETS['AUDIO'], audio_filename, BytesIO(audio_data), "audio/mpeg")
            url = self.supabase.storage.from_(DB_BUCKETS['AUDIO']).get_public_url(audio_filename)
            logging.info(f"✅ Audio Female: {word}")
            return {'audio_url': url}

        return {}

    async def handle_male_audio(self, row, word, word_hash, force_audio=False):
        """Обработка мужского аудио (EdgeTTS)"""
        if row.get('audio_male') and not force_audio: return {}
        
        male_filename = f"{word_hash}_M.mp3"
        
        audio_data = await self.tts_gen.generate_audio(word, "ko-KR-InJoonNeural")
        
        if audio_data:
            if row.get('audio_male'):
                await delete_old_file(DB_BUCKETS['AUDIO'], row.get('audio_male'))
            
            await upload_to_supabase(DB_BUCKETS['AUDIO'], male_filename, BytesIO(audio_data), "audio/mpeg")
            url = self.supabase.storage.from_(DB_BUCKETS['AUDIO']).get_public_url(male_filename)
            logging.info(f"✅ Audio Male: {word}")
            return {'audio_male': url}

        return {}

    async def handle_example_audio(self, row, example, force_audio=False):
        """Обработка аудио примера (Dialogue/EdgeTTS)"""
        if not example or not isinstance(example, str): return {}
        if row.get('example_audio') and not force_audio: return {}
        
        ex_hash = hashlib.md5(example.encode('utf-8')).hexdigest()
        ex_filename = f"ex_{ex_hash}.mp3"
        audio_data = None
        
        is_dialogue = re.search(r'(^|\n)[AaBb가나]\s*:', example)
        if is_dialogue:
            audio_data = await self.tts_gen.generate_dialogue(example)
        else:
            audio_data = await self.tts_gen.generate_audio(example, "ko-KR-SunHiNeural")
        
        if audio_data:
            if row.get('example_audio'):
                await delete_old_file(DB_BUCKETS['AUDIO'], row.get('example_audio'))
            await upload_to_supabase(DB_BUCKETS['AUDIO'], ex_filename, BytesIO(audio_data), "audio/mpeg")
            url = self.supabase.storage.from_(DB_BUCKETS['AUDIO']).get_public_url(ex_filename)
            logging.info(f"✅ Example: {example[:10]}...")
            return {'example_audio': url}

        return {}

    async def handle_quote_audio(self, row, force_audio=False):
        """Обработка аудио для цитаты (EdgeTTS)"""
        if row.get('audio_url') and not force_audio: return {}
        
        text = row.get('quote_kr')
        if not text: return {}
        
        # Генерируем хеш от текста цитаты для имени файла
        quote_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        filename = f"quote_{quote_hash}.mp3"
        
        # Используем тот же голос, что и для слов (SunHi)
        audio_data = await self.tts_gen.generate_audio(text, "ko-KR-SunHiNeural")
        
        if audio_data:
            if row.get('audio_url'):
                await delete_old_file(DB_BUCKETS['AUDIO'], row.get('audio_url'))
            await upload_to_supabase(DB_BUCKETS['AUDIO'], filename, BytesIO(audio_data), "audio/mpeg")
            url = self.supabase.storage.from_(DB_BUCKETS['AUDIO']).get_public_url(filename)
            logging.info(f"✅ Quote Audio: {text[:15]}...")
            return {'audio_url': url}

        return {}

class AIHandler:
    """Класс для управления AI генерацией (текст и изображения)"""
    def __init__(self, supabase_client, ai_generator: AIContentGenerator, sb_url, sb_key):
        self.supabase = supabase_client
        self.ai_gen = ai_generator
        self.sb_url = sb_url
        self.sb_key = sb_key
        self.models_to_try = [
            'gemini-2.5-flash', 
            'gemini-2.5-pro', 
            'gemini-3-flash-preview', 
            'gemini-3-pro-preview',
            'gemini-3.1-pro-preview',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-flash-latest',
            'gemini-pro-latest'
        ]

    async def handle_image(self, session, row, translation, word_hash, force_images):
        """Обработка изображения через Edge Function (Auto Mode)"""
        current_image = row.get('image')
        image_source = row.get('image_source')

        if current_image:
            # Если источник НЕ 'pixabay' (значит пользовательская) — пропускаем всегда
            if image_source not in ['pixabay', 'unsplash', 'pexels'] and not force_images:
                return {}
            # Если источник 'pixabay', но не включен force — тоже пропускаем
            if not force_images:
                return {}

        # 2. Если дошли сюда: либо картинки нет, либо это авто-картинка + force
        if not translation: return {}
        
        try:
            function_url = f"{self.sb_url}functions/v1/regenerate-image"
            headers = {
                "Authorization": f"Bearer {self.sb_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "mode": "auto",
                "id": row.get('id'),
                "word": row.get('word_kr'),
                "translation": row.get('translation')
            }
            
            async with session.post(function_url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    logging.info(f"✅ Image (Edge Auto): {translation} -> {data.get('source')}")
                    
                    # Удаляем старое изображение, если оно было
                    if current_image and current_image != data.get('finalUrl'):
                        await delete_old_file(DB_BUCKETS['IMAGES'], current_image)
                        
                    return {}
                else:
                    if resp.status != 404:
                        text = await resp.text()
                        logging.warning(f"⚠️ Edge Function Error: {resp.status} - {text}")
                    return {}

        except asyncio.TimeoutError:
            logging.warning(f"⚠️ Timeout при вызове Edge Function для {translation}")
            return {}
        except Exception as e:
            logging.warning(f"⚠️ Ошибка вызова Edge Function для {translation}: {e}")
            return {}

    async def generate_examples(self, word_kr):
        """Генерирует примеры предложений для слова через Gemini."""
        if not self.ai_gen.client:
            return []

        prompt = f"""You are a Korean language teacher.
Generate 3 simple, natural Korean example sentences using the word '{word_kr}'.
Provide a Russian translation for each sentence.
Output ONLY a JSON array.

Format:
[
  {{"kr": "Korean sentence", "ru": "Russian translation"}},
  {{"kr": "Korean sentence", "ru": "Russian translation"}},
  {{"kr": "Korean sentence", "ru": "Russian translation"}}
]
"""
        for model_name in self.models_to_try:
            try:
                response = await self.ai_gen.client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                text = response.text
                
                # Очистка от markdown форматирования
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]
                    
                return json.loads(text.strip())
            except Exception as e:
                if "429" in str(e):
                    logging.warning(f"⚠️ Quota exceeded for {model_name}. Trying next...")
                    await asyncio.sleep(1)
                    continue
                logging.warning(f"⚠️ Ошибка генерации примеров ({model_name}): {e}")
                continue
        
        logging.error(f"❌ Не удалось сгенерировать примеры для {word_kr} (все модели недоступны)")
        return []

    async def generate_grammar_explanation(self, grammar_point):
        """Генерирует объяснение грамматики через Gemini."""
        if not self.ai_gen.client:
            return None

        prompt = f"""You are an expert Korean language teacher for Russian speakers.
Explain the Korean grammar point '{grammar_point}' in Russian.
Provide:
1. Meaning/Usage.
2. Construction rules (conjugation).
3. 2-3 simple example sentences with Russian translations.
Keep it concise and clear for a learner.
Output in Markdown format.
"""
        for model_name in self.models_to_try:
            try:
                response = await self.ai_gen.client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                return response.text.strip()
            except Exception as e:
                if "429" in str(e):
                    logging.warning(f"⚠️ Quota exceeded for {model_name}. Trying next...")
                    await asyncio.sleep(1)
                    continue
                logging.warning(f"⚠️ Ошибка генерации грамматики ({model_name}): {e}")
                continue
        
        logging.error(f"❌ Не удалось сгенерировать грамматику для {grammar_point}")
        return None

    async def generate_synonyms(self, word_kr, current_synonyms=None):
        """Генерирует список синонимов, если их меньше 3."""
        if not self.ai_gen.client:
            return None

        existing = [s.strip() for s in (current_synonyms or "").split(',')] if current_synonyms else []
        if len(existing) >= 3:
            return None

        prompt = f"""You are a Korean language expert.
Provide 3-5 common synonyms for the Korean word '{word_kr}'.
Output ONLY a comma-separated list of Korean words.
"""
        for model_name in self.models_to_try:
            try:
                response = await self.ai_gen.client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                text = response.text.strip()
                
                new_synonyms = [s.strip() for s in text.split(',') if s.strip()]
                all_synonyms = list(set(existing + new_synonyms))
                if word_kr in all_synonyms:
                    all_synonyms.remove(word_kr)
                    
                return ", ".join(all_synonyms[:5])
            except Exception as e:
                if "429" in str(e):
                    logging.warning(f"⚠️ Quota exceeded for {model_name}. Trying next...")
                    await asyncio.sleep(1.5)
                    continue
                logging.warning(f"⚠️ Ошибка генерации синонимов ({model_name}): {e}")
                continue
        
        logging.error(f"❌ Не удалось сгенерировать синонимы для {word_kr}")
        return None

    async def process_word_request(self, request, session=None, content_gen_callback=None):
        """Обработка заявки на добавление слова через AI"""
        req_id = request.get('id')
        word_kr = request.get('word_kr')
        user_id = request.get('user_id')
        
        # Проверяем наличие ручных данных (минимум перевод)
        has_manual_data = bool(request.get('translation'))

        if not word_kr:
            return

        if not has_manual_data and not GEMINI_API_KEY:
            logging.warning(f"⚠️ Пропуск {word_kr}: нет ключа Gemini и нет ручных данных.")
            builder = self.supabase.table(DB_TABLES['WORD_REQUESTS']).update({
                'status': WORD_REQUEST_STATUS['ERROR'], 
                'my_notes': 'Server Error: Missing Gemini API Key'
            }).eq('id', req_id)
            await execute_supabase_query(builder)
            return

        logging.info(f"🤖 Обработка запроса: {word_kr} (Ручные данные: {has_manual_data})")

        try:
            items_to_process = []
            if has_manual_data:
                manual_item = request.copy()
                manual_item['word_kr'] = word_kr
                items_to_process.append(manual_item)
            else:
                # 1. Запрос к Gemini через класс AIContentGenerator
                items_to_process, error_msg = await self.ai_gen.generate_word_data(word_kr)
                
                if error_msg:
                    logging.error(f"❌ Ошибка AI обработки для {word_kr}: {error_msg}")
                    builder = self.supabase.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['ERROR'], 'my_notes': error_msg}).eq('id', req_id)
                    await execute_supabase_query(builder)
                    return

            if not items_to_process:
                logging.error(f"❌ Нет данных для обработки {word_kr}")
                builder = self.supabase.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['ERROR']}).eq('id', req_id)
                await execute_supabase_query(builder)
                return

            # Обработка каждого элемента (значения слова)
            success_count = 0
            for data in items_to_process:
                if not data.get('word_kr'):
                    continue
                
            # Применяем ручные настройки темы/категории, если они были указаны пользователем
                if request.get('topic_ru'): data['topic_ru'] = request.get('topic_ru')
                if request.get('category'): data['category'] = request.get('category')

                # Парсинг темы и категории из AI (формат "En/Kr (Ru)")
                # Если AI вернул "Daily Life (Повседневная жизнь)", разбиваем
                if 'topic' in data:
                    raw_topic = data.pop('topic')
                    if '(' in raw_topic:
                        data['topic_kr'] = raw_topic.split('(')[0].strip()
                        data['topic_ru'] = raw_topic.split('(')[1].replace(')', '').strip()
                
                if 'category' in data:
                    raw_cat = data.pop('category')
                    if '(' in raw_cat:
                        data['category_kr'] = raw_cat.split('(')[0].strip()
                        data['category_ru'] = raw_cat.split('(')[1].replace(')', '').strip()

                # Map frequency to level (stars)
                if data.get('frequency'):
                    freq = str(data.get('frequency')).lower()
                    if 'high' in freq:
                        data['level'] = '★★★'
                    elif 'medium' in freq:
                        data['level'] = '★★☆'
                    elif 'low' in freq:
                        data['level'] = '★☆☆'

                # Append TOPIK level to grammar_info if available
                if data.get('topik_level'):
                    t_level = data.get('topik_level')
                    g_info = data.get('grammar_info', '')
                    data['grammar_info'] = f"{g_info}\n[{t_level}]" if g_info else f"[{t_level}]"

                # Если тип определен как грамматика, пробуем сгенерировать справку
                if data.get('type') == 'grammar' and not data.get('grammar_info'):
                    logging.info(f"📘 Генерация грамматической справки для: {data.get('word_kr')}")
                    g_info = await self.generate_grammar_explanation(data.get('word_kr'))
                    if g_info:
                        data['grammar_info'] = g_info

                # Генерация синонимов, если их нет или мало (меньше 3)
                current_syns = data.get('synonyms')
                if not current_syns or len(current_syns.split(',')) < 3:
                    logging.info(f"📚 Дополнение синонимов для: {data.get('word_kr')}")
                    new_syns = await self.generate_synonyms(data.get('word_kr'), current_syns)
                    if new_syns:
                        data['synonyms'] = new_syns

                # 2. Проверка на дубликаты (теперь все в vocabulary)
                target_table = DB_TABLES['VOCABULARY']
                word_id = None
                
                async def _find_duplicate(table, uid=None):
                    # Ищем слово по написанию
                    b = self.supabase.table(table).select('id, translation, created_by, is_public').eq('word_kr', data.get('word_kr'))
                    rows = (await execute_supabase_query(b)).data or []
                    req_t = (data.get('translation') or "").strip().lower()
                    
                    for r in rows:
                        # Проверяем видимость: публичное ИЛИ создано этим пользователем
                        is_visible = r.get('is_public') or (uid and str(r.get('created_by')) == str(uid))
                        if not is_visible:
                            continue
                            
                        db_t = (r.get('translation') or "").strip().lower()
                        if db_t == req_t: return r['id']
                    return None

                word_id = await _find_duplicate(target_table, user_id)

                if word_id:
                    success_count += 1
                    logging.info(f"ℹ️ Слово {data.get('word_kr')} ({data.get('translation')}) уже есть в базе.")
                
                if not word_id:
                    # 3. Вставка в vocabulary
                    allowed_keys = {
                        'word_kr', 'translation', 'word_hanja', 'topic', 'category', 
                        'level', 'type', 'example_kr', 'example_ru', 'synonyms', 'antonyms',
                        'collocations', 'grammar_info', 'created_by', 'is_public'
                    }
                    
                    # Настройка владельца и видимости
                    if user_id: 
                        data['created_by'] = user_id
                        data['is_public'] = False
                    else:
                        data['created_by'] = None
                        data['is_public'] = True
                    
                    clean_data = {k: v for k, v in data.items() if k in allowed_keys}
                    
                    # Если колонки grammar_info нет в базе, удаляем её из данных перед вставкой
                    if not HAS_GRAMMAR_INFO and 'grammar_info' in clean_data:
                        del clean_data['grammar_info']
                    
                    try:
                        builder = self.supabase.table(target_table).insert(clean_data)
                        insert_data = (await execute_supabase_query(builder)).data
                    except Exception as e:
                        logging.error(f"❌ Ошибка вставки в БД: {e}")
                        insert_data = None
                    
                    if insert_data and isinstance(insert_data, list) and len(insert_data) > 0:
                        word_id = insert_data[0]['id']
                        success_count += 1
                        logging.info(f"✅ Слово {data.get('word_kr')} ({data.get('translation')}) добавлено в {target_table}.")
                        
                        # Генерируем медиа для нового слова сразу
                        if content_gen_callback:
                            if session:
                                updates = await content_gen_callback(session, insert_data[0])
                            else:
                                async with aiohttp.ClientSession() as local_session:
                                    updates = await content_gen_callback(local_session, insert_data[0])
                            
                            if updates:
                                update_builder = self.supabase.table(target_table).update(updates).eq("id", word_id)
                                await execute_supabase_query(update_builder)
                    else:
                        logging.error(f"❌ Не удалось вставить слово '{data.get('word_kr')}'. Ответ БД пуст (возможно, ошибка прав доступа RLS).")

                # Опционально: Добавить слово в "Изучаемые" пользователя, который его запросил
                if word_id and user_id:
                    try:
                        builder = self.supabase.table(DB_TABLES['USER_PROGRESS']).upsert({'user_id': user_id, 'word_id': word_id, 'is_learned': False})
                        await execute_supabase_query(builder)
                    except Exception as e:
                        logging.warning(f"Не удалось добавить в прогресс пользователя: {e}")

                # 5. Добавление в список пользователя (если указан target_list_id)
                target_list_id = request.get('target_list_id')
                if word_id and target_list_id:
                    try:
                        builder = self.supabase.table(DB_TABLES['LIST_ITEMS']).upsert({'list_id': target_list_id, 'word_id': word_id})
                        await execute_supabase_query(builder)
                        logging.info(f"✅ Слово добавлено в список {target_list_id}")
                    except Exception as e:
                        logging.warning(f"⚠️ Ошибка добавления в список: {e}")

            # 4. Обновление статуса заявки (после обработки всех вариантов)
            final_status = WORD_REQUEST_STATUS['PROCESSED']
            notes = None
            
            if success_count == 0:
                final_status = WORD_REQUEST_STATUS['ERROR']
                notes = "System: Failed to insert/find word in DB (RLS or Unknown Error)"
            
            update_payload = {'status': final_status}
            if notes: update_payload['my_notes'] = notes
            
            builder = self.supabase.table(DB_TABLES['WORD_REQUESTS']).update(update_payload).eq('id', req_id)
            await execute_supabase_query(builder)

        except asyncio.TimeoutError:
            logging.error(f"❌ Timeout AI для {word_kr}")
            builder = self.supabase.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['ERROR'], 'my_notes': 'AI Timeout'}).eq('id', req_id)
            await execute_supabase_query(builder)

        except Exception as e:
            logging.error(f"❌ Ошибка AI обработки для {word_kr}: {e}")
            builder = self.supabase.table(DB_TABLES['WORD_REQUESTS']).update({'status': WORD_REQUEST_STATUS['ERROR']}).eq('id', req_id)
            await execute_supabase_query(builder)

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

async def check_internet_connection():
    """Проверяет доступность интернета перед подключением к Realtime"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://www.google.com", timeout=2) as resp:
                return resp.status == 200
    except:
        return False

async def realtime_loop(trigger_event: asyncio.Event):
    """Асинхронный цикл для Realtime подписки (требует async client)"""

    def on_insert_callback(payload):
        logging.info("🔔 Realtime: Получена новая заявка!")
        trigger_event.set()
        
    retry_delay = 5

    while True:
        try:
            # Проверка сети перед попыткой подключения, чтобы не ловить getaddrinfo failed
            if not await check_internet_connection():
                logging.warning(f"🌐 Нет интернета. Ожидание {retry_delay} сек перед подключением к Realtime...")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 1.5, 60)
                continue

            logging.info("🟢 Инициализация Async Realtime клиента...")
            # Создаем отдельный асинхронный клиент только для Realtime
            async_client = await create_async_client(SUPABASE_URL, SUPABASE_KEY)

            channel = async_client.channel('worker-db-changes')
            
            channel.on_postgres_changes(
                event="INSERT",
                schema="public",
                table="word_requests",
                callback=on_insert_callback
            )
            
            logging.info("🟢 Realtime Listener: Подписка...")
            await channel.subscribe()
            logging.info("🟢 Realtime Listener: Подписка активна.")
            
            # Сброс задержки при успешном подключении
            retry_delay = 5
            
            # FIX: Вместо вечного ожидания используем цикл с таймаутом (Watchdog)
            # Перезапускаем соединение каждый час, чтобы избежать "молчаливых" зависаний сокета
            for _ in range(60): # 60 минут
                await asyncio.sleep(60)
            
            logging.info("♻️ Плановый перезапуск Realtime соединения (TTL)...")
            await channel.unsubscribe()
                
        except AttributeError as e:
            if "has no attribute" in str(e):
                logging.error(f"❌ Ошибка версии библиотеки Realtime ({e}). Попробуйте: pip install --upgrade supabase")
                logging.warning("⚠️ Переход в режим Polling (опрос раз в 30 сек).")
                return 
        except Exception as e:
            logging.warning(f"⚠️ Ошибка Realtime: {e}. Реконнект через {retry_delay} сек...")
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 1.5, 60)

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
                await reset_failed_requests()
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
    await reset_failed_requests()
    
    # Событие для пробуждения воркера
    request_trigger = asyncio.Event()
    
    # Запускаем оба цикла параллельно
    await asyncio.gather(
        user_requests_loop(request_trigger),
        background_tasks_loop(concurrency),
        realtime_loop(request_trigger)
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

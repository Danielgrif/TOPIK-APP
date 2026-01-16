# Перед запуском установите необходимые библиотеки командой:
# pip install supabase python-dotenv requests idna edge-tts pillow google-genai

import os
import re
import sys
import time
import hashlib
import logging
import asyncio
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, quote, unquote
from io import BytesIO
import json

# Настройка логирования в файл log.txt
logging.basicConfig(
    handlers=[
        logging.FileHandler('log.txt', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ],
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Добавляем путь к пользовательским пакетам (на случай, если Python их не видит)
import site
try:
    sys.path.append(site.getusersitepackages())
except AttributeError: pass

try:
    import requests
    import aiohttp
    from supabase import create_client
    from dotenv import load_dotenv
    import edge_tts # type: ignore
    from PIL import Image
    from google import generativeai as genai
except ImportError as e:
    logging.error(f"❌ Ошибка импорта библиотек: {e}")
    logging.error("Вероятно, файлы библиотек повреждены. Попробуйте выполнить эту команду для исправления:")
    logging.error(f'"{sys.executable}" -m pip install --force-reinstall requests idna urllib3 chardet certifi aiohttp edge-tts supabase pillow google-genai')
    sys.exit(1)

# Пытаемся загрузить .env (стандарт) или env (если файл назван без точки)
# Определяем путь к папке скрипта, чтобы точно найти .env
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

# 1. Настройки
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") # Нужен ключ с правами записи!
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BUCKET_NAME = "audio-files"
IMAGE_BUCKET_NAME = "image-files"
MIN_FILE_SIZE = 500 # Минимальный размер файла в байтах (исключает пустые заголовки)

# Очистка ключей от кавычек, если они есть (частая проблема .env)
if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")
if PIXABAY_API_KEY: PIXABAY_API_KEY = PIXABAY_API_KEY.replace('"', '').replace("'", "")
if GEMINI_API_KEY: GEMINI_API_KEY = GEMINI_API_KEY.replace('"', '').replace("'", "")

# Проверка на дефолтное значение
if GEMINI_API_KEY == "ваш_ключ_здесь":
    GEMINI_API_KEY = None

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY.")
    logging.error("Убедитесь, что файл .env создан и содержит эти ключи.")
    sys.exit(1)

# Настройка аргументов командной строки
parser = argparse.ArgumentParser(description="Генератор контента для TOPIK APP")
parser.add_argument("--topic", type=str, help="Обработать только слова из конкретной темы (фильтр по колонке 'topic')")
parser.add_argument("--force-images", action="store_true", help="Принудительно обновить изображения (перезаписать старые)")
parser.add_argument("--force-audio", action="store_true", help="Принудительно обновить аудио (перезаписать старые)")
parser.add_argument("--check", action="store_true", help="Запустить проверку целостности файлов и ссылок (удаление битых)")
parser.add_argument("--concurrency", type=int, default=0, help="Количество одновременных потоков (0 = авто-подбор, по умолчанию 0)")
args = parser.parse_args()

# Исправление предупреждения "Storage endpoint URL should have a trailing slash"
if not SUPABASE_URL.endswith("/"):
    SUPABASE_URL += "/"

# Патч для исправления ошибки "Storage endpoint URL should have a trailing slash"
try:
    StorageClient = None
    # Пробуем прямой импорт, который работает в большинстве версий supabase-py
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

# 1.1 Проверка и создание бакета (автоматическая настройка)
try:
    buckets = supabase.storage.list_buckets()
    if not any(b.name == BUCKET_NAME for b in buckets):
        logging.info(f"📦 Бакет '{BUCKET_NAME}' не найден. Создаю новый публичный бакет...")
        supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
        logging.info(f"✅ Бакет '{BUCKET_NAME}' успешно создан.")
    else:
        logging.info(f"ℹ️ Бакет '{BUCKET_NAME}' уже существует.")
except Exception as e:
    # Игнорируем ошибку, если бакет уже есть, но API вернул ошибку прав доступа
    logging.warning(f"⚠️ Проверка бакета: {e}")

# 1.2 Проверка и создание бакета для изображений
try:
    buckets = supabase.storage.list_buckets()
    if not any(b.name == IMAGE_BUCKET_NAME for b in buckets):
        logging.info(f"📦 Бакет '{IMAGE_BUCKET_NAME}' не найден. Создаю новый публичный бакет...")
        supabase.storage.create_bucket(IMAGE_BUCKET_NAME, options={"public": True})
        logging.info(f"✅ Бакет '{IMAGE_BUCKET_NAME}' успешно создан.")
    else:
        # Если бакет уже есть, убедимся, что он публичный
        logging.info(f"ℹ️ Бакет '{IMAGE_BUCKET_NAME}' найден. Обновляю права на Public...")
        supabase.storage.update_bucket(IMAGE_BUCKET_NAME, {"public": True})
except Exception as e:
    logging.warning(f"⚠️ Проверка бакета изображений: {e}")

# Настройка Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logging.warning("⚠️ GEMINI_API_KEY не найден. Генерация контента через AI будет недоступна.")

def clean_query_for_pixabay(text):
    """Очищает текст перевода для лучшего поиска картинок."""
    if not text: return ""
    # Убираем текст в скобках (например: "женщина (взрослая)")
    text = re.sub(r'\(.*?\)', '', text)
    # Берем только первую часть до запятой или точки с запятой
    text = re.split(r'[;,]', text)[0]
    return text.strip()

def clean_text_for_tts(text):
    """Удаляет текст в скобках (Hanja, пояснения) для чистого озвучивания."""
    if not text: return ""
    # Удаляем (текст) и [текст], включая пробел перед ними
    text = re.sub(r'\s*[\(\[].*?[\)\]]', '', text)
    return text.strip()

async def delete_old_file(bucket, url):
    """Удаляет старый файл из хранилища перед загрузкой нового"""
    if not url: return
    try:
        filename = unquote(url.split('/')[-1].split('?')[0])
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, lambda: supabase.storage.from_(bucket).remove([filename]))
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

async def generate_edge_tts(text, filepath, voice="ko-KR-SunHiNeural"):
    """Генерация аудио через Microsoft Edge TTS (бесплатно, высокое качество)"""
    clean_text = clean_text_for_tts(text)
    if not clean_text: return False

    for i in range(3): # 3 попытки при ошибке сети
        try:
            communicate = edge_tts.Communicate(clean_text, voice)
            await communicate.save(filepath)
            
            # Проверка: файл должен быть больше 0 байт
            if os.path.getsize(filepath) < MIN_FILE_SIZE:
                logging.warning(f"⚠️ Файл слишком мал ({os.path.getsize(filepath)}b): {text}")
                return False
                
            return True
        except Exception as e:
            if i == 2: logging.warning(f"⚠️ Ошибка Edge TTS: {e}")
            await asyncio.sleep(1)
    return False

async def generate_dialogue_audio(text, filepath):
    """Генерация диалога с двумя голосами (A/B или 가/나) через SSML с паузами"""
    lines = text.replace('\r\n', '\n').split('\n')
    
    voice_female = "ko-KR-SunHiNeural"
    voice_male = "ko-KR-InJoonNeural"
    
    # Формируем SSML структуру
    ssml_parts = [
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">'
    ]
    
    current_voice = voice_female
    has_content = False
    
    try:
        for line in lines:
            line = line.strip()
            if not line: continue
            
            # Определение голоса
            if re.match(r'^[Aa가]\s*:', line):
                current_voice = voice_female
                line = re.sub(r'^[Aa가]\s*:', '', line).strip()
            elif re.match(r'^[Bb나]\s*:', line):
                current_voice = voice_male
                line = re.sub(r'^[Bb나]\s*:', '', line).strip()
            
            if not line: continue
            
            # Добавляем паузу 500мс перед репликой (кроме первой)
            if has_content:
                 ssml_parts.append('<break time="500ms"/>')
                 
            # Экранируем спецсимволы XML и оборачиваем в тег голоса
            # Очищаем текст от Hanja перед вставкой в SSML
            safe_line = clean_text_for_tts(line).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            ssml_parts.append(f'<voice name="{current_voice}">{safe_line}</voice>')
            has_content = True
            
        ssml_parts.append('</speak>')
        
        if not has_content: return False
        
        ssml_string = "".join(ssml_parts)
        
        # Отправляем SSML в edge-tts
        communicate = edge_tts.Communicate(ssml_string, voice_female)
        await communicate.save(filepath)
        
        if os.path.getsize(filepath) < MIN_FILE_SIZE:
             logging.warning(f"⚠️ Диалог слишком мал: {text[:20]}...")
             return False
             
        return True
    except Exception as e:
        logging.warning(f"⚠️ Ошибка диалога (SSML): {e}")
        return False

def check_integrity(bucket_name, table_name='vocabulary'):
    """Проверка целостности файлов и ссылок в БД"""
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

    # 2. Проверяем ссылки в БД
    try:
        # Получаем все записи (пагинация может потребоваться для очень больших БД)
        rows = []
        offset = 0
        while True:
            res = supabase.table(table_name).select("*").range(offset, offset + 999).execute()
            if not res.data: break
            rows.extend(res.data)
            offset += 1000
    except Exception as e:
        logging.error(f"❌ Ошибка чтения БД: {e}")
        return

    referenced_files = set()
    fixed_count = 0

    # Колонки, которые содержат ссылки на файлы в этом бакете
    target_cols = ['audio_url', 'audio_male', 'example_audio'] if bucket_name == BUCKET_NAME else ['image']

    for row in rows:
        if not isinstance(row, dict): continue
        row_id = row.get('id')
        updates = {}
        for col in target_cols:
            url = row.get(col)
            if not url or not isinstance(url, str): continue
            
            filename = unquote(url.split('/')[-1].split('?')[0]) # Убираем query params и декодируем

            # Проверка: файл существует и не пустой (для аудио > 100 байт)
            min_size = 100 if bucket_name == BUCKET_NAME else 0
            
            if filename not in storage_files or storage_files[filename] <= min_size:
                logging.warning(f"⚠️ Битая ссылка или пустой файл: id={row_id} col={col} file={filename}")
                updates[col] = None # Сбрасываем ссылку, чтобы скрипт пересоздал её
                if col == 'image':
                    updates['image_source'] = None # Сбрасываем источник, чтобы разрешить перезапись
            else:
                referenced_files.add(filename) # Файл валиден, сохраняем его от удаления
        
        if updates:
            try:
                supabase.table(table_name).update(updates).eq('id', row_id).execute()
                fixed_count += 1
            except Exception as e:
                logging.error(f"Ошибка обновления id={row_id}: {e}")

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
        output = BytesIO()
        img.save(output, format='JPEG', quality=80, optimize=True)
        return output.getvalue()
    except Exception as e:
        logging.warning(f"⚠️ Ошибка оптимизации изображения: {e}")
        return data

if args.check:
    check_integrity(BUCKET_NAME)
    check_integrity(IMAGE_BUCKET_NAME)
    logging.info("🏁 Проверка завершена. Переход к восстановлению контента...")

async def upload_to_supabase(bucket, path, data, content_type):
    """Асинхронная обертка для загрузки в Supabase"""
    loop = asyncio.get_running_loop()
    # upsert=True позволяет перезаписывать файлы, избегая ошибок дубликатов
    await loop.run_in_executor(None, lambda: supabase.storage.from_(bucket).upload(
        path=path, file=data, file_options={"content-type": content_type, "upsert": "true"}
    ))

async def update_db_record(row_id, updates):
    """Асинхронная обертка для обновления БД"""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: supabase.table('vocabulary').update(updates).eq("id", row_id).execute())

async def handle_main_audio(session, row, word, word_hash, force_audio=False):
    """Обработка основного аудио (Женский голос - SunHi)"""
    if row.get('audio_url') and not force_audio: return {}
    
    audio_filename = f"{word_hash}.mp3"
    filepath = f"temp_{audio_filename}"
    
    # Используем EdgeTTS (SunHi - Женский)
    if await generate_edge_tts(word, filepath, "ko-KR-SunHiNeural"):
        try:
            if row.get('audio_url'):
                await delete_old_file(BUCKET_NAME, row.get('audio_url'))
            with open(filepath, 'rb') as f:
                await upload_to_supabase(BUCKET_NAME, audio_filename, f, "audio/mpeg")
            url = supabase.storage.from_(BUCKET_NAME).get_public_url(audio_filename)
            logging.info(f"✅ Audio Female: {word}")
            return {'audio_url': url}
        finally:
            if os.path.exists(filepath): os.remove(filepath)
    return {}

async def handle_male_audio(row, word, word_hash, force_audio=False):
    """Обработка мужского аудио (EdgeTTS)"""
    if row.get('audio_male') and not force_audio: return {}
    
    male_filename = f"{word_hash}_M.mp3"
    filepath = f"temp_{male_filename}"
    
    if await generate_edge_tts(word, filepath, "ko-KR-InJoonNeural"):
        try:
            if row.get('audio_male'):
                await delete_old_file(BUCKET_NAME, row.get('audio_male'))
            with open(filepath, 'rb') as f:
                await upload_to_supabase(BUCKET_NAME, male_filename, f, "audio/mpeg")
            url = supabase.storage.from_(BUCKET_NAME).get_public_url(male_filename)
            logging.info(f"✅ Audio Male: {word}")
            return {'audio_male': url}
        finally:
            if os.path.exists(filepath): os.remove(filepath)
    return {}

async def handle_example_audio(row, example, force_audio=False):
    """Обработка аудио примера (Dialogue/EdgeTTS)"""
    if not example or not isinstance(example, str): return {}
    if row.get('example_audio') and not force_audio: return {}
    
    ex_hash = hashlib.md5(example.encode('utf-8')).hexdigest()
    ex_filename = f"ex_{ex_hash}.mp3"
    filepath = f"temp_{ex_filename}"
    ex_downloaded = False
    
    is_dialogue = re.search(r'(^|\n)[AaBb가나]\s*:', example)
    if is_dialogue:
        if await generate_dialogue_audio(example, filepath): ex_downloaded = True
    else:
        if await generate_edge_tts(example, filepath, "ko-KR-SunHiNeural"): ex_downloaded = True
    
    if ex_downloaded:
        try:
            if row.get('example_audio'):
                await delete_old_file(BUCKET_NAME, row.get('example_audio'))
            with open(filepath, 'rb') as f:
                await upload_to_supabase(BUCKET_NAME, ex_filename, f, "audio/mpeg")
            url = supabase.storage.from_(BUCKET_NAME).get_public_url(ex_filename)
            logging.info(f"✅ Example: {example[:10]}...")
            return {'example_audio': url}
        finally:
            if os.path.exists(filepath): os.remove(filepath)
    return {}

async def handle_image(session, row, translation, word_hash, force_images):
    """Обработка изображения (Pixabay)"""
    current_image = row.get('image')
    image_source = row.get('image_source')

    if current_image:
        # Если источник НЕ 'pixabay' (значит пользовательская) — пропускаем всегда
        if image_source != 'pixabay':
            return {}
        # Если источник 'pixabay', но не включен force — тоже пропускаем
        if not force_images:
            return {}

    # 2. Если дошли сюда: либо картинки нет, либо это Pixabay + force
    if not translation or not isinstance(translation, str) or not PIXABAY_API_KEY: return {}
    
    updates = {}
    q = clean_query_for_pixabay(translation)
    
    if not q: return {} # Не тратим квоту на пустые запросы
    
    try:
        params = {"key": PIXABAY_API_KEY, "q": q, "lang": "ru", "image_type": "photo", "per_page": 3, "safesearch": "true"}
        async with session.get("https://pixabay.com/api/", params=params) as pix_res:
            if pix_res.status == 200:
                hits = (await pix_res.json()).get('hits')
                if hits:
                    p_url = hits[0]['webformatURL']
                    async with session.get(p_url) as img_res:
                        if img_res.status == 200:
                            fname = f"{word_hash}_pix.jpg" # Уникальное имя файла
                            img_data = await img_res.read()
                            
                            # Оптимизация (выполняем в отдельном потоке, чтобы не блокировать async)
                            loop = asyncio.get_running_loop()
                            optimized_data = await loop.run_in_executor(None, optimize_image_data, img_data)
                            
                            if len(optimized_data) < MIN_FILE_SIZE:
                                logging.warning(f"⚠️ Изображение слишком мало: {translation}")
                                return {}

                            await upload_to_supabase(IMAGE_BUCKET_NAME, fname, optimized_data, "image/jpeg")
                            
                            public_url = supabase.storage.from_(IMAGE_BUCKET_NAME).get_public_url(fname)
                            updates['image'] = public_url
                            updates['image_source'] = 'pixabay'
                            logging.info(f"✅ Image: {translation}")
    except Exception as e:
        logging.warning(f"⚠️ Pixabay error {translation}: {e}")
    
    return updates

async def _generate_content_for_word(session, row):
    """Генерация контента для слова (аудио, картинки)"""
    word = row.get('word_kr')
    translation = row.get('translation')
    example = row.get('example_kr')
    word_hash = hashlib.md5(word.encode('utf-8')).hexdigest()

    tasks = [
        handle_main_audio(session, row, word, word_hash, args.force_audio),
        handle_male_audio(row, word, word_hash, args.force_audio),
        handle_example_audio(row, example, args.force_audio),
        handle_image(session, row, translation, word_hash, args.force_images)
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
                await update_db_record(row_id, updates_to_make)
                return None # Успех
            else:
                return row_id
        except Exception as e:
            _handle_processing_error(e, word, error_counter)
            return row_id

async def process_word_request(request):
    """Обработка заявки на добавление слова через AI"""
    req_id = request.get('id')
    word_kr = request.get('word_kr')
    user_id = request.get('user_id')
    
    if not word_kr or not GEMINI_API_KEY:
        return

    logging.info(f"🤖 AI обрабатывает запрос: {word_kr}")

    try:
        # 1. Запрос к Gemini для получения данных
        prompt = f"""
        Analyze the Korean word '{word_kr}'. Return a JSON object with the following fields:
        - word_kr: the word itself (corrected if needed)
        - translation: Russian translation (concise)
        - word_hanja: Hanja characters (if applicable, else empty string)
        - topic: A relevant topic category in format "Topic (Тема)" (e.g. "School (Школа)")
        - category: Part of speech in format "Noun (Существительное)" etc.
        - level: TOPIK level (e.g. "★☆☆", "★★☆", "★★★") based on difficulty
        - example_kr: A simple Korean example sentence using the word
        - example_ru: Russian translation of the example
        - synonyms: Comma-separated synonyms (Korean)
        - antonyms: Comma-separated antonyms (Korean)
        - type: "word" or "grammar" (usually "word")
        
        Ensure the response is valid JSON.
        """
        
        response = await asyncio.to_thread(
            genai.GenerativeModel('gemini-pro').generate_content,
            contents=prompt
        )
        text_response = response.text
        
        if not text_response:
            logging.error(f"❌ Пустой ответ от AI для {word_kr}")
            return
        
        # Очистка от markdown ```json ... ```
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0]
        elif "```" in text_response:
            text_response = text_response.split("```")[1].split("```")[0]
            
        data = json.loads(text_response.strip())
        
        # 2. Проверка на дубликаты в vocabulary
        # Если слово уже есть, мы можем просто обновить его или проигнорировать
        # Для простоты, если слово есть, мы не добавляем дубликат, а просто помечаем заявку как processed
        existing = supabase.table('vocabulary').select('id').eq('word_kr', data['word_kr']).execute()
        
        word_id = None
        existing_data = getattr(existing, 'data', None)
        
        if existing_data and isinstance(existing_data, list) and len(existing_data) > 0:
            logging.info(f"ℹ️ Слово {data.get('word_kr')} уже есть в базе.")
            word_id = existing_data[0]['id']
        else:
            # 3. Вставка в vocabulary
            # Если вы хотите, чтобы слово было видно ТОЛЬКО пользователю, нужно добавить поле user_id в vocabulary
            # Сейчас схема vocabulary общая. Добавим слово как общее.
            insert_res = supabase.table('vocabulary').insert(data).execute()
            insert_data = getattr(insert_res, 'data', None)
            
            if insert_data and isinstance(insert_data, list) and len(insert_data) > 0:
                word_id = insert_data[0]['id']
                logging.info(f"✅ Слово {data.get('word_kr')} добавлено в словарь.")
                
                # Генерируем медиа для нового слова сразу
                # FIX: Захватываем результат и обновляем запись в БД
                async with aiohttp.ClientSession() as session:
                    updates = await _generate_content_for_word(session, insert_data[0])
                    if updates:
                        await update_db_record(word_id, updates)

        # 4. Обновление статуса заявки
        supabase.table('word_requests').update({'status': 'processed'}).eq('id', req_id).execute()
        
        # Опционально: Добавить слово в "Изучаемые" пользователя, который его запросил
        if word_id and user_id:
             try:
                 supabase.table('user_progress').upsert({'user_id': user_id, 'word_id': word_id, 'is_learned': False}).execute()
             except Exception as e:
                 logging.warning(f"Не удалось добавить в прогресс пользователя: {e}")

    except Exception as e:
        logging.error(f"❌ Ошибка AI обработки для {word_kr}: {e}")
        supabase.table('word_requests').update({'status': 'error'}).eq('id', req_id).execute()

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

async def main_loop():
    logging.info("🚀 Воркер запущен (Async Mode).")
    
    concurrency = args.concurrency
    if concurrency == 0:
        concurrency = await measure_network_quality()
        logging.info(f"⚡ Автоматически установлено потоков: {concurrency}")
    
    # Локальный кэш игнорируемых ID (чтобы не долбить одни и те же ошибки)
    ignore_ids = set()

    while True:
        try:
            cleanup_temp_files()
            
            # 0. Обработка заявок пользователей (Word Requests)
            if GEMINI_API_KEY:
                try:
                    reqs = supabase.table('word_requests').select("*").eq('status', 'pending').limit(5).execute()
                    for req in reqs.data:
                        await process_word_request(req)
                except Exception as e:
                    logging.error(f"Ошибка обработки заявок: {e}")

            # Запрос к БД (синхронный, но быстрый)
            try:
                if args.force_images or args.force_audio:
                    query = supabase.table('vocabulary').select("*")
                else:
                    # Берем больше слов за раз для эффективности
                    query = supabase.table('vocabulary').select("*").or_("audio_url.is.null,audio_male.is.null,image.is.null,example_audio.is.null").limit(200)
                
                if args.topic:
                    query = query.ilike("topic", f"%{args.topic}%")

                response = query.execute()
                words = response.data or []
                # Фильтруем слова, которые уже пытались обработать и не смогли
                words = [w for w in words if isinstance(w, dict) and w.get('id') not in ignore_ids]
            except Exception as e:
                logging.error(f"Ошибка БД: {e}")
                words = []

            if not words:
                if not args.force_images and not args.force_audio:
                    logging.info("💤 Нет новых слов. Жду 60 сек...")
                    await asyncio.sleep(60)
                else:
                    logging.info("🏁 Обработка завершена (force mode).")
                    break
                continue

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

if __name__ == "__main__":
    try:
        # FIX: Исправление для Windows (WinError 10035)
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logging.info("🛑 Остановка воркера.")

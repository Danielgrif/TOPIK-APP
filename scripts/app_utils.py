import os
import sys
import time
import random
import logging
import asyncio
from urllib.parse import unquote
from io import BytesIO
from dotenv import load_dotenv
from supabase import create_client

try:
    from PIL import Image
except ImportError:
    Image = None

def setup_logging(log_filename='log.txt'):
    """Configures logging to file and stdout."""
    # Force UTF-8 for Windows console
    if sys.platform == 'win32':
        try: sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError: pass

    logging.basicConfig(
        handlers=[
            logging.FileHandler(log_filename, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ],
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # Silence noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

def load_config(script_path):
    """Loads environment variables from .env or env files."""
    script_dir = os.path.dirname(os.path.abspath(script_path))
    project_root = os.path.dirname(script_dir)
    
    # Try loading .env
    load_dotenv(os.path.join(project_root, ".env"))

    # Fallback to env file if SUPABASE_URL not found
    if not os.getenv("SUPABASE_URL"):
        load_dotenv(os.path.join(project_root, "env"))

    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    # Clean quotes
    if url: url = url.replace('"', '').replace("'", "")
    if key: key = key.replace('"', '').replace("'", "")
    if gemini_key: gemini_key = gemini_key.replace('"', '').replace("'", "")
    
    if gemini_key == "ваш_ключ_здесь":
        gemini_key = None

    return url, key, gemini_key

def init_supabase(url, key):
    """Initializes Supabase client with StorageClient patch."""
    # Patch StorageClient for trailing slash issue
    try:
        StorageClient = None
        try:
            from storage3.utils import StorageClient # type: ignore
        except ImportError:
            try:
                from storage3.client import StorageClient # type: ignore
            except ImportError:
                try:
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
    except Exception as e:
        logging.warning(f"⚠️ Не удалось применить патч для StorageClient: {e}")

    try:
        return create_client(url, key)
    except Exception as e:
        logging.error(f"❌ Критическая ошибка при инициализации Supabase: {e}")
        sys.exit(1)

def _execute_with_retry(executable):
    """Executes a Supabase query synchronously with retry logic."""
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
                if attempt == 0 or attempt == max_retries - 2:
                    logging.warning(f"🌐 Сетевая ошибка Supabase ({e}). Попытка {attempt + 2}/{max_retries} через {delay:.1f}с...")
                time.sleep(delay)
            else:
                raise e

async def execute_supabase_query(executable):
    """Async wrapper for Supabase queries with retry."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _execute_with_retry, executable)

async def delete_old_file(supabase, bucket, url):
    """Deletes a file from Supabase storage."""
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

async def upload_to_supabase(supabase, bucket, path, data, content_type):
    """Uploads data to Supabase storage."""
    loop = asyncio.get_running_loop()
    
    def _do_upload():
        for i in range(3):
            try:
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

def optimize_image_data(data):
    """Optimizes image data using Pillow."""
    if not Image:
        return data
    try:
        img = Image.open(BytesIO(data))
        if img.mode != 'RGB':
            img = img.convert('RGB')

        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        output = BytesIO()
        img.save(output, format='JPEG', quality=80, optimize=True)
        return output.getvalue()
    except Exception as e:
        logging.warning(f"⚠️ Ошибка оптимизации изображения: {e}")
        return data
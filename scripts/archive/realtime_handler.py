import asyncio
import logging
import aiohttp
from supabase import create_async_client

async def check_internet_connection():
    """Проверяет доступность интернета перед подключением к Realtime"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://www.google.com", timeout=2) as resp:
                return resp.status == 200
    except:
        return False

async def realtime_loop(trigger_event: asyncio.Event, supabase_url: str, supabase_key: str):
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
            async_client = await create_async_client(supabase_url, supabase_key)

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
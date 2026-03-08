import json
import logging
import asyncio
import aiohttp
from app_utils import delete_old_file, execute_supabase_query # type: ignore
from constants import DB_TABLES, DB_BUCKETS, WORD_REQUEST_STATUS, GEMINI_MODELS
from ai_generator import AIContentGenerator

class AIHandler:
    """Класс для управления AI генерацией (текст и изображения)"""
    def __init__(self, supabase_client, ai_generator: AIContentGenerator, sb_url, sb_key):
        self.supabase = supabase_client
        self.ai_gen = ai_generator
        self.sb_url = sb_url
        self.sb_key = sb_key
        self.has_grammar_info = True
        self.models_to_try = GEMINI_MODELS

    def set_grammar_info_status(self, status: bool):
        self.has_grammar_info = status

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
                        await delete_old_file(self.supabase, DB_BUCKETS['IMAGES'], current_image)
                        
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

        if not has_manual_data and not self.ai_gen.api_key:
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
                if request.get('topic_ru'): 
                    data['topic_ru'] = request.get('topic_ru')
                    # Если пользователь задал тему, то topic_kr можно оставить пустым или скопировать
                    if 'topic' in data: del data['topic'] # Удаляем AI тему, чтобы не перезаписала
                
                if request.get('category_ru'): 
                    data['category_ru'] = request.get('category_ru')
                    if 'category' in data: del data['category']

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
                    if not self.has_grammar_info and 'grammar_info' in clean_data:
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
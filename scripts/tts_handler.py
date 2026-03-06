import re
import hashlib
import logging
from io import BytesIO
from app_utils import delete_old_file, upload_to_supabase # type: ignore
from constants import DB_BUCKETS

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
                await delete_old_file(self.supabase, DB_BUCKETS['AUDIO'], row.get('audio_url'))
            
            await upload_to_supabase(self.supabase, DB_BUCKETS['AUDIO'], audio_filename, BytesIO(audio_data), "audio/mpeg")
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
                await delete_old_file(self.supabase, DB_BUCKETS['AUDIO'], row.get('audio_male'))
            
            await upload_to_supabase(self.supabase, DB_BUCKETS['AUDIO'], male_filename, BytesIO(audio_data), "audio/mpeg")
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
                await delete_old_file(self.supabase, DB_BUCKETS['AUDIO'], row.get('example_audio'))
            await upload_to_supabase(self.supabase, DB_BUCKETS['AUDIO'], ex_filename, BytesIO(audio_data), "audio/mpeg")
            url = self.supabase.storage.from_(DB_BUCKETS['AUDIO']).get_public_url(ex_filename)
            logging.info(f"✅ Example: {example[:10]}...")
            return {'example_audio': url}

        return {}

    async def handle_quote_audio(self, row, force_audio=False):
        """Обработка аудио для цитаты (EdgeTTS)"""
        if row.get('audio_url') and not force_audio: return {}
        
        text = row.get('quote_kr')
        if not text: return {}
        
        quote_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        filename = f"quote_{quote_hash}.mp3"
        
        audio_data = await self.tts_gen.generate_audio(text, "ko-KR-SunHiNeural")
        
        if audio_data:
            if row.get('audio_url'):
                await delete_old_file(self.supabase, DB_BUCKETS['AUDIO'], row.get('audio_url'))
            await upload_to_supabase(self.supabase, DB_BUCKETS['AUDIO'], filename, BytesIO(audio_data), "audio/mpeg")
            url = self.supabase.storage.from_(DB_BUCKETS['AUDIO']).get_public_url(filename)
            logging.info(f"✅ Quote Audio: {text[:15]}...")
            return {'audio_url': url}

        return {}
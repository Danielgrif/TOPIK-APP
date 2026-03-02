import logging
import edge_tts
from io import BytesIO

# Минимальный размер файла для проверки валидности (в байтах)
MIN_FILE_SIZE = 500

class TTSGenerator:
    def __init__(self):
        # Голоса
        self.voice_female = "ko-KR-SunHiNeural"
        self.voice_male = "ko-KR-InJoonNeural"

    async def generate_audio(self, text, voice):
        """Генерирует аудио для заданного текста и голоса."""
        if not text:
            return None
        
        try:
            communicate = edge_tts.Communicate(text, voice)
            audio_data = BytesIO()
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.write(chunk["data"])
            
            data = audio_data.getvalue()
            if len(data) < MIN_FILE_SIZE:
                logging.warning(f"⚠️ Сгенерированное аудио слишком короткое ({len(data)} байт): {text[:20]}...")
                return None
                
            return data
        except Exception as e:
            logging.error(f"❌ Ошибка TTS ({voice}): {e}")
            return None

    async def generate_dialogue(self, text):
        """
        Генерирует аудио для диалога, склеивая реплики разных голосов.
        Поддерживает форматы: "A: ... B: ..." или "가: ... 나: ..."
        """
        if not text:
            return None

        lines = text.split('\n')
        combined_audio = BytesIO()
        has_content = False
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            # Определение говорящего и текста
            voice = self.voice_female # Default
            clean_text = line
            
            # Простая логика парсинга
            if line.startswith("A:") or line.startswith("a:") or line.startswith("가:"):
                voice = self.voice_female
                parts = line.split(":", 1)
                if len(parts) > 1: clean_text = parts[1].strip()
            elif line.startswith("B:") or line.startswith("b:") or line.startswith("나:"):
                voice = self.voice_male
                parts = line.split(":", 1)
                if len(parts) > 1: clean_text = parts[1].strip()
            
            if not clean_text: continue
            
            # Генерация части
            chunk = await self.generate_audio(clean_text, voice)
            if chunk:
                combined_audio.write(chunk)
                has_content = True
        
        if not has_content:
            return None
            
        data = combined_audio.getvalue()
        if len(data) < MIN_FILE_SIZE:
             return None
             
        return data
import os
import sys
import logging
from dotenv import load_dotenv
from importlib.metadata import version, PackageNotFoundError
import re


# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


# Загрузка переменных окружения
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("GEMINI_API_KEY"):
    load_dotenv(os.path.join(project_root, "env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Очистка ключа
if GEMINI_API_KEY:
    GEMINI_API_KEY = GEMINI_API_KEY.replace('"', '').replace("'", "")

if not GEMINI_API_KEY:
    logging.error("❌ ОШИБКА: Не найден GEMINI_API_KEY в переменных окружения.")
    sys.exit(1)


try:
    import google.genai as genai
except ImportError as e:
    logging.error(f"❌ Ошибка импорта 'google.genai': {e}")
    logging.error("💡 Попробуйте выполнить: pip install --upgrade google-generativeai")
    sys.exit(1)


def get_model_description(model_name):
    """Возвращает понятное описание модели по её имени"""
    name = model_name.lower()
    
    # 🟢 МОДЕЛИ ДЛЯ ТЕКСТА (TOPIK APP)
    if "gemini-2.5-flash" in name:
        return "🟢 БЫСТРАЯ | ⭐⭐⭐⭐⭐ | TOPIK упражнения, переводы, грамматика"
    elif "gemini-2.5-pro" in name:
        return "🟢 КАЧЕСТВО | ⭐⭐⭐⭐⭐ | Сложные тексты TOPIK, эссе, точные переводы"
    elif "gemini-3-pro" in name or "gemini-3.1-pro" in name:
        return "🟢 НОВЕЙШАЯ | ⭐⭐⭐⭐⭐ | Лучшая для сложных заданий (стабильная preview)"
    elif "gemini-flash-latest" in name:
        return "🟢 АВТО | ⭐⭐⭐⭐ | Всегда последняя быстрая Flash модель"
    elif "gemini-2.0-flash" in name:
        return "🟢 БЫСТРАЯ | ⭐⭐⭐⭐ | Стабильная, хороша для TOPIK 1-3 уровни"
    elif "gemma-3" in name:
        return "🟢 ОТКРЫТАЯ | ⭐⭐⭐ | Лёгкая модель, хороша для мобильных приложений"
    elif "nano-banana" in name:
        return "🟢 СУПЕР-ЛЁГКАЯ | ⭐⭐⭐ | Очень быстрая, для простых запросов"
    
    # 🔵 EMBEDDING (поиск по словам)
    elif "embedding" in name:
        return "🔵 ПОИСК | Для поиска слов/предложений в TOPIK (не текст)"
    
    # 🖼️ ИЗОБРАЖЕНИЯ
    elif "imagen" in name:
        return "🖼️ ИЗОБРАЖЕНИЯ | Генерация картинок (не текст)"
    
    # 🎥 ВИДЕО
    elif "veo" in name:
        return "🎥 ВИДЕО | Генерация видео (не текст)"
    
    # ❌ ДРУГОЕ
    else:
        return "⚪ СПЕЦ | Специализированная модель"


def main():
    try:
        lib_version = version("google-generativeai")
        logging.info(f"✅ Версия google-generativeai: {lib_version}")
    except PackageNotFoundError:
        logging.warning("⚠️ Не удалось определить версию google-generativeai.")

    logging.info("🤖 Запрос списка доступных моделей Gemini...")
    
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        models = list(client.models.list())
        
        if models:
            print("\n" + "="*80)
            print(f"✅ НАЙДЕНО МОДЕЛЕЙ ДЛЯ TOPIK APP: {len(models)}")
            print("="*80)
            
            text_models = []
            other_models = []
            
            for model in models:
                supports_text = False
                description = ""
                
                # Проверяем поддержку генерации текста
                if hasattr(model, 'supported_actions'):
                    supports_text = 'generateContent' in model.supported_actions
                elif hasattr(model, 'supported_generation_methods'):
                    supports_text = 'generateContent' in model.supported_generation_methods
                
                description = get_model_description(model.name)
                
                model_info = {
                    'name': model.name,
                    'text': supports_text,
                    'desc': description
                }
                
                if supports_text:
                    text_models.append(model_info)
                else:
                    other_models.append(model_info)
            
            # 🟢 ТЕКСТОВЫЕ МОДЕЛИ (для TOPIK)
            print("\n🟢 ТЕКСТОВЫЕ МОДЕЛИ (32 шт) — ИДЕАЛЬНО ДЛЯ TOPIK APP")
            print("-" * 80)
            for model in text_models:
                print(f"  {model['desc']:<45} → {model['name']}")
            
            # 🔵 ОСТАЛЬНЫЕ
            print(f"\n🔵 ОСТАЛЬНЫЕ МОДЕЛИ ({len(other_models)} шт)")
            print("-" * 80)
            for model in other_models:
                print(f"  {model['desc']:<45} → {model['name']}")
            
            print("\n" + "="*80)
            print("💡 РЕКОМЕНДАЦИИ ДЛЯ TOPIK APP:")
            print("   gemini-2.5-flash          → Быстрая + дешёвая")
            print("   gemini-2.5-pro            → Лучшее качество") 
            print("   gemini-3.1-pro-preview    → Новейшая + мощная")
            print("="*80 + "\n")
            
        else:
            logging.warning("⚠️ Список моделей пуст.")
            
    except Exception as e:
        logging.error(f"❌ Ошибка при проверке моделей: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

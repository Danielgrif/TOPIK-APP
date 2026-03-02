import os
import sys
import logging
from dotenv import load_dotenv

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

# Импорт генератора
try:
    from ai_generator import AIContentGenerator
except ImportError:
    sys.path.append(script_dir)
    from ai_generator import AIContentGenerator

def main():
    logging.info("🤖 Запрос списка доступных моделей Gemini...")
    
    try:
        generator = AIContentGenerator(GEMINI_API_KEY)
        models = generator.list_available_models()
        
        if models:
            print("\n" + "="*40)
            print(f"✅ Доступные модели ({len(models)}):")
            print("="*40)
            for model in models:
                print(f" • {model}")
            print("="*40 + "\n")
        else:
            logging.warning("⚠️ Список моделей пуст. Возможно, проблема с API ключом или доступом.")
            
    except Exception as e:
        logging.error(f"❌ Ошибка при проверке моделей: {e}")

if __name__ == "__main__":
    main()
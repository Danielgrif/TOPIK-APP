import os
import sys
import logging
from dotenv import load_dotenv
from supabase import create_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if SUPABASE_URL: SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
if SUPABASE_KEY: SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_articles():
    logging.info("🌱 Наполнение таблицы articles тестовыми данными...")

    articles = [
        {
            "title": "Корейская культура: Кимчи",
            "content": "김치는 한국의 전통 음식입니다. 배추와 고춧가루로 만듭니다. 한국 사람들은 매일 김치를 먹습니다. 김치는 건강에 아주 좋습니다.",
            "translation": "Кимчи — это традиционная корейская еда. Его делают из пекинской капусты и порошка красного перца. Корейцы едят кимчи каждый день. Кимчи очень полезно для здоровья.",
            "level": "TOPIK I",
            "topic": "Culture",
            "image_url": "https://cdn.pixabay.com/photo/2014/01/16/01/48/kimchi-246166_1280.jpg"
        },
        {
            "title": "Погода в Корее",
            "content": "한국에는 사계절이 있습니다. 봄, 여름, 가을, 겨울입니다. 봄에는 꽃이 많이 핍니다. 여름은 아주 덥습니다. 가을은 시원하고 하늘이 맑습니다. 겨울은 춥고 눈이 옵니다.",
            "translation": "В Корее четыре времени года. Это весна, лето, осень и зима. Весной цветет много цветов. Лето очень жаркое. Осень прохладная, а небо ясное. Зима холодная и идет снег.",
            "level": "TOPIK I",
            "topic": "Nature",
            "image_url": "https://cdn.pixabay.com/photo/2016/03/27/19/32/cherry-blossoms-1283803_1280.jpg"
        },
        {
            "title": "Сеул - столица Кореи",
            "content": "서울은 한국의 수도입니다. 많은 사람들이 서울에 살고 있습니다. 서울에는 높은 빌딩과 전통적인 궁궐이 함께 있습니다. 한강이 서울의 중심을 흐릅니다.",
            "translation": "Сеул — столица Кореи. В Сеуле живет много людей. В Сеуле соседствуют высокие здания и традиционные дворцы. Река Хан протекает через центр Сеула.",
            "level": "TOPIK II",
            "topic": "Travel",
            "image_url": "https://cdn.pixabay.com/photo/2016/11/02/14/32/seoul-1791718_1280.jpg"
        }
    ]

    for article in articles:
        res = supabase.table("articles").insert(article).execute()
        if res.data:
            logging.info(f"✅ Добавлена статья: {article['title']}")
        else:
            logging.error(f"❌ Ошибка добавления: {article['title']}")

if __name__ == "__main__":
    seed_articles()
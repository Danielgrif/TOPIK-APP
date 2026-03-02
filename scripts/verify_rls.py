import os
import sys
import logging
import time
from dotenv import load_dotenv
from supabase import create_client

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Загрузка переменных окружения
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
load_dotenv(os.path.join(project_root, ".env"))

if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(project_root, "env"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("❌ ОШИБКА: Не найдены переменные окружения.")
    sys.exit(1)

# Очистка ключей
SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def verify_rls():
    logging.info("🔍 Запуск проверки RLS политик...")

    policies = None
    
    # SQL для создания функции проверки
    create_func_sql = """
CREATE OR REPLACE FUNCTION get_rls_policies()
RETURNS TABLE (
  tablename name,
  policyname name,
  permissive text,
  roles name[],
  cmd text,
  qual text,
  with_check text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies WHERE schemaname = 'public';
$$;
"""

    try:
        # 1. Попытка вызвать функцию
        res = supabase.rpc('get_rls_policies', {}).execute()
        policies = res.data
    except Exception:
        # Игнорируем первую ошибку, попробуем создать
        pass

    if policies is None:
        # 2. Если не вышло, пробуем создать функцию через exec_sql
        logging.info("🛠 Функция get_rls_policies не найдена. Пробую создать через exec_sql...")
        try:
            # Добавляем NOTIFY pgrst, 'reload' для обновления кэша схемы Supabase
            full_sql = create_func_sql + "\nNOTIFY pgrst, 'reload';"
            supabase.rpc('exec_sql', {'sql': full_sql}).execute()
            logging.info("✅ Функция успешно создана! Ждем обновления кэша...")
            time.sleep(3) # Даем время на перезагрузку кэша
            # 3. Пробуем снова
            res = supabase.rpc('get_rls_policies', {}).execute()
            policies = res.data
        except Exception as e:
            logging.warning(f"⚠️ Не удалось создать функцию автоматически (возможно, нет exec_sql): {e}")

    if policies is None:
        logging.warning(f"ℹ️ Автоматическая проверка невозможна.")
        print("\n" + "="*60)
        print("📋 РУЧНАЯ НАСТРОЙКА")
        print("="*60)
        print("Выполните этот SQL в Supabase Editor для создания функции проверки:")
        print(create_func_sql.strip())
        print("="*60 + "\n")
        return

    logging.info(f"✅ Загружено {len(policies)} политик. Анализ...\n")
    
    issues_found = False
    
    # 1. Проверка оптимизации (Performance)
    unoptimized = []
    for p in policies:
        qual = p.get('qual') or ''
        with_check = p.get('with_check') or ''
        
        # Приводим к нижнему регистру, так как Postgres может возвращать SQL в верхнем регистре (SELECT вместо select)
        qual_lower = qual.lower()
        with_check_lower = with_check.lower()
        
        # Ищем auth.uid(), который НЕ обернут в (select ...)
        is_unopt = False
        if 'auth.uid()' in qual_lower and '(select auth.uid())' not in qual_lower:
            is_unopt = True
        if 'auth.uid()' in with_check_lower and '(select auth.uid())' not in with_check_lower:
            is_unopt = True
            
        if is_unopt:
            unoptimized.append(f"{p['tablename']} -> {p['policyname']}")

    if unoptimized:
        logging.warning("⚠️ НАЙДЕНЫ НЕОПТИМИЗИРОВАННЫЕ ПОЛИТИКИ (Performance):")
        for item in unoptimized:
            print(f"  - {item}")
        print("  💡 Совет: Используйте (select auth.uid()) вместо auth.uid() для кэширования.")
        issues_found = True
    else:
        logging.info("✅ Все политики с auth.uid() оптимизированы.")

    if not issues_found:
        logging.info("🎉 Все проверки пройдены успешно!")

if __name__ == "__main__":
    verify_rls()
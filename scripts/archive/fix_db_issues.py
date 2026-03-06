import os
import sys
import logging
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
    logging.error("❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY (или VITE_ аналогов).")
    sys.exit(1)

# Очистка ключей
SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def fix_security_issues():
    """Применяет исправления безопасности для базы данных"""
    logging.info("🛡️ Применение исправлений безопасности...")

    sql_commands = """
    -- 0. Защита RPC функции exec_sql (Ограничение доступа)
    REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

    -- 1. Исправление mutable search_path для функций (Security Best Practice)
    -- Фиксируем путь поиска, чтобы избежать подмены объектов злоумышленниками
    ALTER FUNCTION public.handle_updated_at() SET search_path = public;
    ALTER FUNCTION public.cleanup_user_progress() SET search_path = public;
    ALTER FUNCTION public.handle_new_user_word() SET search_path = public;
    ALTER FUNCTION public.handle_new_user() SET search_path = public;

    -- 2. Оптимизация RLS политик (Performance & Security)
    -- Удаляем старые/дублирующиеся политики и создаем оптимизированные версии
    -- с использованием (select auth.uid()) для кэширования результата функции.

    -- --- user_global_stats ---
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Global stats are viewable by everyone" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can delete their own stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can manage their own global stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Admins can view all stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can view own stats or authenticated" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can view all stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can update own stats" ON public.user_global_stats;
    DROP POLICY IF EXISTS "Users can delete own stats" ON public.user_global_stats;

    CREATE POLICY "Users can view all stats" ON public.user_global_stats FOR SELECT USING (true);
    CREATE POLICY "Users can insert own stats" ON public.user_global_stats FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
    CREATE POLICY "Users can update own stats" ON public.user_global_stats FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can delete own stats" ON public.user_global_stats FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

    -- --- user_lists ---
    DROP POLICY IF EXISTS "Users can create own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can delete own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can update own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can see own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can see public lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can manage their own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can view own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can insert own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can update own lists" ON public.user_lists;
    DROP POLICY IF EXISTS "Users can delete own lists" ON public.user_lists;

    CREATE POLICY "Users can view own lists" ON public.user_lists FOR SELECT USING ((select auth.uid()) = user_id OR is_public = true);
    CREATE POLICY "Users can insert own lists" ON public.user_lists FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
    CREATE POLICY "Users can update own lists" ON public.user_lists FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can delete own lists" ON public.user_lists FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

    -- --- word_requests ---
    DROP POLICY IF EXISTS "Users can insert requests" ON public.word_requests;
    DROP POLICY IF EXISTS "Users can create requests" ON public.word_requests;
    DROP POLICY IF EXISTS "Users can view own requests" ON public.word_requests;
    DROP POLICY IF EXISTS "Users can delete own requests" ON public.word_requests;
    DROP POLICY IF EXISTS "Users can insert own requests" ON public.word_requests;

    CREATE POLICY "Users can view own requests" ON public.word_requests FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can insert own requests" ON public.word_requests FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
    CREATE POLICY "Users can delete own requests" ON public.word_requests FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

    -- --- user_progress ---
    DROP POLICY IF EXISTS "Users can manage their own word progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

    CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
    CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can delete own progress" ON public.user_progress FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

    -- --- vocabulary ---
    DROP POLICY IF EXISTS "Users can view own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can insert own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can update own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can delete own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can see their own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can update their own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can delete their own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Public words are visible to everyone" ON public.vocabulary;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.vocabulary;
    DROP POLICY IF EXISTS "Allow update orphan words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Allow delete orphan words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Public Vocabulary Update" ON public.vocabulary;
    DROP POLICY IF EXISTS "Public words are viewable" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can insert own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can update own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "Users can delete own words" ON public.vocabulary;
    DROP POLICY IF EXISTS "View public and own words" ON public.vocabulary;

    -- Новые политики для объединенной таблицы
    -- Видим: если слово публичное ИЛИ если мы его создали
    CREATE POLICY "View public and own words" ON public.vocabulary FOR SELECT USING (is_public = true OR (select auth.uid()) = created_by);
    
    -- Редактируем/Удаляем: только если мы создали
    CREATE POLICY "Users can insert own words" ON public.vocabulary FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);
    CREATE POLICY "Users can update own words" ON public.vocabulary FOR UPDATE TO authenticated USING ((select auth.uid()) = created_by);
    CREATE POLICY "Users can delete own words" ON public.vocabulary FOR DELETE TO authenticated USING ((select auth.uid()) = created_by);

    -- --- list_items ---
    DROP POLICY IF EXISTS "Users can see items in visible lists" ON public.list_items;
    DROP POLICY IF EXISTS "Users can add items to own lists" ON public.list_items;
    DROP POLICY IF EXISTS "Users can delete items from own lists" ON public.list_items;
    DROP POLICY IF EXISTS "Users can manage items in their lists" ON public.list_items;
    DROP POLICY IF EXISTS "Users can view items in visible lists" ON public.list_items;
    DROP POLICY IF EXISTS "Users can insert items to own lists" ON public.list_items;
    DROP POLICY IF EXISTS "Users can delete items from own lists" ON public.list_items;

    CREATE POLICY "Users can view items in visible lists" ON public.list_items FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_lists ul 
            WHERE ul.id = list_items.list_id 
            AND (ul.is_public = true OR ul.user_id = (select auth.uid()))
        )
    );

    CREATE POLICY "Users can insert items to own lists" ON public.list_items FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_lists ul 
            WHERE ul.id = list_items.list_id 
            AND ul.user_id = (select auth.uid())
        )
    );
    
    CREATE POLICY "Users can delete items from own lists" ON public.list_items FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_lists ul 
            WHERE ul.id = list_items.list_id 
            AND ul.user_id = (select auth.uid())
        )
    );
    
    -- --- storage.objects ---
    DO $$
    BEGIN
        BEGIN ALTER POLICY "Public File Updates" ON storage.objects TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END;
    END $$;

    -- Обновляем кэш схемы Supabase
    NOTIFY pgrst, 'reload';
    """

    try:
        # Попытка выполнить через RPC (если функция exec_sql существует)
        try:
            logging.info("🔄 Попытка автоматического исправления через RPC...")
            supabase.rpc('exec_sql', {'sql': sql_commands}).execute()
            logging.info("✅ Исправления успешно применены!")
            return
        except Exception as e:
            logging.warning(f"⚠️ Автоматическое исправление не удалось (возможно, нет функции exec_sql): {e}")

        logging.info("ℹ️ Выполните следующий SQL в Supabase SQL Editor для исправления проблем:")
        print("\n" + "="*40)
        print("-- 0. Создайте функцию-хелпер (для работы автоматических скриптов):")
        print("CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; END; $$;")
        print("REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public, anon, authenticated;")
        print("GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;")
        print("\n-- 1. Исправления безопасности:")
        print(sql_commands.strip())
        print("="*40 + "\n")
        
        logging.info("⚠️ ВНИМАНИЕ: Для исправления 'Leaked Password Protection Disabled':")
        logging.info("   Перейдите в Supabase Dashboard -> Authentication -> Security")
        logging.info("   Включите опцию 'Enable Leaked Password Protection'.")
        logging.info("💡 После выполнения запустите 'python scripts/verify_rls.py' для проверки.")

    except Exception as e:
        logging.error(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    fix_security_issues()
    logging.info("🏁 Готово.")
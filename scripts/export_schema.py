import os
import sys
import json
import logging
import time
from datetime import datetime
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
    logging.error("❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY.")
    sys.exit(1)

# Очистка ключей
SUPABASE_URL = SUPABASE_URL.replace('"', '').replace("'", "")
SUPABASE_KEY = SUPABASE_KEY.replace('"', '').replace("'", "")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"❌ Ошибка инициализации Supabase: {e}")
    sys.exit(1)

def export_schema():
    """Экспортирует структуру таблиц в отдельные SQL файлы."""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    export_dir = os.path.join(project_root, "schema_export", timestamp)
    
    if not os.path.exists(export_dir):
        os.makedirs(export_dir)
        
    logging.info(f"📂 Папка для экспорта: {export_dir}")

    # SQL функция для генерации DDL
    # Мы используем information_schema для получения колонок и типов
    create_rpc_sql = """
    CREATE OR REPLACE FUNCTION public.get_db_schema_ddl()
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        tables_json json;
    BEGIN
        WITH table_data AS (
            SELECT 
                t.table_name,
                (
                    SELECT string_agg(
                        concat(
                            '    ', column_name, ' ', 
                            data_type, 
                            CASE WHEN character_maximum_length IS NOT NULL THEN concat('(', character_maximum_length, ')') ELSE '' END,
                            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
                            CASE WHEN column_default IS NOT NULL THEN concat(' DEFAULT ', column_default) ELSE '' END
                        ),
                        E',\n'
                    )
                    FROM information_schema.columns c
                    WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
                ) as columns,
                (
                    SELECT coalesce(string_agg(indexdef || ';', E'\n'), '')
                    FROM pg_indexes
                    WHERE schemaname = 'public' AND tablename = t.table_name
                ) as indexes,
                (
                    SELECT coalesce(string_agg(
                        'ALTER TABLE public.' || quote_ident(t.table_name) || ' ADD CONSTRAINT ' || quote_ident(conname) || ' ' || pg_get_constraintdef(oid) || ';',
                        E'\n'
                    ), '')
                    FROM pg_constraint
                    WHERE conrelid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass AND contype = 'f'
                ) as fks,
                (
                    SELECT CASE WHEN c.relrowsecurity THEN 'ALTER TABLE public.' || quote_ident(t.table_name) || ' ENABLE ROW LEVEL SECURITY;' ELSE '' END
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t.table_name
                ) as rls_enable,
                (
                    SELECT coalesce(string_agg(
                        'CREATE POLICY ' || quote_ident(policyname) || ' ON public.' || quote_ident(tablename) || ' FOR ' || cmd || ' TO ' || array_to_string(roles, ',') || ' USING (' || coalesce(qual, '') || ')' || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';',
                        E'\n'
                    ), '')
                    FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = t.table_name
                ) as policies
            FROM information_schema.tables t
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        )
        SELECT json_object_agg(
            table_name,
            concat(
                'CREATE TABLE IF NOT EXISTS public.', quote_ident(table_name), ' (', E'\n', columns, E'\n);\n\n',
                CASE WHEN indexes != '' THEN indexes || E'\n\n' ELSE '' END,
                CASE WHEN fks != '' THEN fks || E'\n\n' ELSE '' END,
                CASE WHEN rls_enable != '' THEN rls_enable || E'\n\n' ELSE '' END,
                policies
            )
        ) INTO tables_json
        FROM table_data;

        RETURN tables_json;
    END;
    $$;
    NOTIFY pgrst, 'reload';
    """

    try:
        logging.info("🛠 Создание RPC функции get_db_schema_ddl...")
        supabase.rpc('exec_sql', {'sql': create_rpc_sql}).execute()
        time.sleep(2) # Ждем обновления кэша схемы
        
        logging.info("📥 Получение структуры БД...")
        res = supabase.rpc('get_db_schema_ddl').execute()
        
        if res.data:
            for table_name, ddl in res.data.items():
                file_path = os.path.join(export_dir, f"{table_name}.sql")
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(ddl)
                logging.info(f"✅ Сохранено: {table_name}.sql")
        else:
            logging.warning("⚠️ Не найдено таблиц или пустой ответ.")
            
    except Exception as e:
        logging.error(f"❌ Ошибка экспорта: {e}")
        logging.info("💡 Убедитесь, что функция exec_sql существует (запустите scripts/fix_db_issues.py).")

if __name__ == "__main__":
    export_schema()
    logging.info("🏁 Экспорт схемы завершен.")
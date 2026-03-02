import os
import sys

def main():
    print("\n" + "="*60)
    print("🛠️  SUPABASE RPC SETUP")
    print("="*60)
    print("To allow Python scripts to execute SQL (migrations, fixes),")
    print("you must create the 'exec_sql' function in Supabase.")
    print("\n1. Open Supabase Dashboard -> SQL Editor")
    print("2. Paste and run this SQL:")
    print("-" * 60)
    print("""
-- Create the helper function to execute SQL via RPC
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Secure the function (allow only service_role)
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
    """.strip())
    print("-" * 60)
    print("\n3. After running this SQL, you can run 'python scripts/fix_db_issues.py'")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
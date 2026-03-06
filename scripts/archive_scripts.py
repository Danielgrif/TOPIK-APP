import os
import shutil

def archive_obsolete_scripts():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    archive_dir = os.path.join(root_dir, "archive")
    
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)
        print(f"📂 Создана папка архива: {archive_dir}")

    # Список файлов для перемещения (одноразовые миграции и фиксы)
    files_to_move = [
        "fix_column_types.py",
        "migrate_merge_vocab.py",
        "migrate_schema.py",
        "setup_rpc.py",
        "fix_db_issues.py",
        "apply_optimizations.py",
        "backup_tables.py",
        "restore_tables.py",
        "validate_schema.py",
        "utils.py"
    ]

    for filename in files_to_move:
        src = os.path.join(root_dir, filename)
        dst = os.path.join(archive_dir, filename)
        
        if os.path.exists(src):
            try:
                shutil.move(src, dst)
                print(f"✅ Перемещен: {filename}")
            except Exception as e:
                print(f"❌ Ошибка перемещения {filename}: {e}")

if __name__ == "__main__":
    archive_obsolete_scripts()
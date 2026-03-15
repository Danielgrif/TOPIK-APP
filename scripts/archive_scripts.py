import os
import shutil

def archive_obsolete_scripts():
    # The script is in 'scripts/', so the root is one level up.
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scripts_dir = os.path.join(project_root, "scripts")
    archive_dir = os.path.join(scripts_dir, "archive")
    
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)
        print(f"📂 Создана папка архива: {archive_dir}")

    # Список файлов для перемещения.
    # Включает старые миграции и всю логику Python-воркера,
    # которая теперь заменена на Edge Functions.
    files_to_move = [
        # Core worker logic
        "content_worker.py",
        "ai_handler.py",
        "ai_generator.py",
        "tts_handler.py",
        "tts_generator.py",
        "realtime_handler.py",
        "maintenance.py",
        "app_utils.py",
        "constants.py",
        "utils.py", # Duplicate of app_utils
        "requirements.txt",
        "run_worker.bat",

        # Old migration/utility scripts
        "fix_column_types.py",
        "migrate_merge_vocab.py",
        "migrate_schema.py",
        "setup_rpc.py",
        "fix_db_issues.py",
        "apply_optimizations.py",
        "backup_tables.py", # Replaced by db_manager.py
        "restore_tables.py", # Replaced by db_manager.py
        "validate_schema.py",
    ]

    print("\nStarting archival of obsolete Python worker scripts...")
    moved_count = 0
    for filename in files_to_move:
        src = os.path.join(scripts_dir, filename)
        
        # Если файл не найден в scripts/, ищем в корне проекта
        if not os.path.exists(src):
            src = os.path.join(project_root, filename)
            
        dst = os.path.join(archive_dir, filename)
        
        if os.path.exists(src):
            try:
                shutil.move(src, dst)
                print(f"  🗄️  Archived: {filename}")
                moved_count += 1
            except Exception as e:
                print(f"  ❌ Error moving {filename}: {e}")

    if moved_count > 0:
        print(f"\n✅ Archival complete. Moved {moved_count} files to archive/.")
    else:
        print("\n✅ No obsolete scripts found to archive.")

if __name__ == "__main__":
    archive_obsolete_scripts()
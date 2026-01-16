import os
import subprocess
import sys
import time

# Настройки
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
TS_CONFIG = os.path.join(PROJECT_ROOT, "tsconfig.json")

# Цвета для вывода
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, status="INFO"):
    if status == "INFO":
        print(f"{Colors.OKBLUE}[INFO]{Colors.ENDC} {message}")
    elif status == "SUCCESS":
        print(f"{Colors.OKGREEN}[SUCCESS]{Colors.ENDC} {message}")
    elif status == "WARNING":
        print(f"{Colors.WARNING}[WARNING]{Colors.ENDC} {message}")
    elif status == "ERROR":
        print(f"{Colors.FAIL}[ERROR]{Colors.ENDC} {message}")

def check_typescript_installation():
    """Проверяет, установлен ли TypeScript компилятор."""
    try:
        subprocess.run(["tsc", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        return True
    except subprocess.CalledProcessError:
        return False

def run_type_check():
    """Запускает проверку типов TypeScript."""
    print_status("Запуск проверки типов (tsc)...")
    start_time = time.time()
    
    try:
        # --noEmit: только проверка, без генерации файлов
        # --pretty: цветной вывод
        result = subprocess.run(
            ["tsc", "--noEmit", "--pretty", "-p", TS_CONFIG],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            text=True
        )
        
        duration = time.time() - start_time
        
        if result.returncode == 0:
            print_status(f"Проверка типов прошла успешно за {duration:.2f}с", "SUCCESS")
            return True
        else:
            print_status(f"Найдены ошибки типов ({duration:.2f}с):", "ERROR")
            print(result.stdout)
            return False
    except Exception as e:
        print_status(f"Ошибка при запуске tsc: {e}", "ERROR")
        return False

def scan_migration_progress():
    """Сканирует проект на наличие оставшихся JS файлов."""
    print_status("Анализ прогресса миграции...")
    
    js_files = []
    ts_files = []
    
    exclude_dirs = {'node_modules', '.git', 'dist', 'build'}
    
    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.endswith(".js") and file != "sw.js": # sw.js часто оставляют в JS
                js_files.append(os.path.join(root, file))
            elif file.endswith(".ts") or file.endswith(".tsx"):
                ts_files.append(os.path.join(root, file))

    total = len(js_files) + len(ts_files)
    if total == 0:
        return

    percentage = (len(ts_files) / total) * 100
    
    print(f"\n{Colors.BOLD}Статистика миграции:{Colors.ENDC}")
    print(f"TypeScript файлы: {len(ts_files)}")
    print(f"JavaScript файлы: {len(js_files)}")
    print(f"Прогресс: {Colors.OKBLUE}{percentage:.1f}%{Colors.ENDC}")
    
    if js_files:
        print(f"\n{Colors.WARNING}Остались для миграции:{Colors.ENDC}")
        for f in js_files[:10]: # Показываем первые 10
            print(f" - {os.path.relpath(f, PROJECT_ROOT)}")
        if len(js_files) > 10:
            print(f" ... и еще {len(js_files) - 10} файлов")

if __name__ == "__main__":
    print(f"{Colors.HEADER}=== TOPIK APP TS VALIDATOR ==={Colors.ENDC}")
    
    if not os.path.exists(TS_CONFIG):
        print_status("tsconfig.json не найден! Создайте его перед запуском.", "ERROR")
        sys.exit(1)

    if not check_typescript_installation():
        print_status("TypeScript не установлен глобально. Установите: npm install -g typescript", "ERROR")
        # Пытаемся использовать npx
        print_status("Попытка использовать npx...", "INFO")
    
    scan_migration_progress()
    print("-" * 30)
    success = run_type_check()
    
    if not success:
        sys.exit(1)
@echo off
setlocal
title TOPIK App Launcher
echo 🚀 Starting TOPIK App...

:: 0. Проверка наличия файлов
if not exist "run_worker.bat" (
    echo ❌ ERROR: File 'run_worker.bat' not found!
    pause
    exit /b 1
)

:: 1. Запускаем Python Worker (свернуто)
:: Используем /k, чтобы окно НЕ закрывалось при ошибке (важно для отладки)
start "TOPIK Worker" /min cmd /k "run_worker.bat"

:: 2. Запускаем Frontend сервер (свернуто)
start "TOPIK Server" /min cmd /k "npm run dev"

:: 3. Ждем пару секунд, пока сервер поднимется, и открываем браузер
echo ⏳ Waiting for services to start...
timeout /t 4 /nobreak >nul

echo 🌍 Opening Browser...
start http://localhost:5173

echo.
echo ✅ App started in background windows.
echo ⚠️  To stop: Close the minimized 'TOPIK Worker' and 'TOPIK Server' windows.
timeout /t 5
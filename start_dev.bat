@echo off
echo 🚀 Starting TOPIK App...

:: 1. Запускаем Python Worker (свернуто)
start "TOPIK Worker" /min cmd /c "run_worker.bat"

:: 2. Запускаем Frontend сервер (свернуто)
:: Используем call, чтобы окно не закрывалось сразу при ошибке, но /min свернет его
start "TOPIK Server" /min cmd /c "npm run dev"

:: 3. Ждем пару секунд, пока сервер поднимется, и открываем браузер
echo ⏳ Launching Browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

:: Это окно закроется само
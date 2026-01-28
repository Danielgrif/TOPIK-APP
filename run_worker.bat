@echo off
cd /d "%~dp0"

:: 1. Определяем, какой Python использовать
if exist ".venv\Scripts\python.exe" (
    set PYTHON_EXE=".venv\Scripts\python.exe"
) else (
    if exist "venv\Scripts\python.exe" (
        set PYTHON_EXE="venv\Scripts\python.exe"
    ) else (
        echo ⚠️ .venv not found. Using global python...
        set PYTHON_EXE=python
    )
)

:: 2. Автоматическая установка библиотек
echo 📦 Checking libraries...
%PYTHON_EXE% -m pip install supabase python-dotenv requests aiohttp edge-tts pillow google-generativeai

:loop
echo 🚀 Starting Audio Generator...
%PYTHON_EXE% scripts/content_worker.py

echo ⚠️ Worker stopped! Restarting in 5 seconds...
timeout /t 5
goto loop
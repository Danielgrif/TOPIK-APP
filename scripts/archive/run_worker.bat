@echo off
setlocal enabledelayedexpansion
:: Включаем поддержку UTF-8 для корректного отображения логов и эмодзи
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo   🐍  TOPIK CONTENT WORKER LAUNCHER
echo ==========================================
echo.

:: 1. Определяем, какой Python использовать
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    echo ✅ Found .venv environment.
) else (
    if exist "venv\Scripts\python.exe" (
        set "PYTHON_EXE=venv\Scripts\python.exe"
        echo ✅ Found venv environment.
    ) else (
        :: Проверяем, есть ли глобальный python
        where python >nul 2>nul
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=python"
            echo ⚠️  Virtual environment not found. Using system Python.
        ) else (
            echo ❌ CRITICAL: Python executable not found!
            pause
            exit /b 1
        )
    )
)

:: 2. Проверка и установка зависимостей из requirements.txt
if not exist "requirements.txt" (
    echo ❌ CRITICAL: requirements.txt not found!
    pause
    exit /b 1
)

:: 1.5 Удаление конфликтных библиотек (Fix for dependency hell)
echo 🧹 Cleaning up conflicting packages...
"%PYTHON_EXE%" -m pip uninstall -y realtime google-genai >nul 2>&1

echo 📦 Verifying dependencies from requirements.txt...
"%PYTHON_EXE%" -m pip install --disable-pip-version-check -r requirements.txt >nul 2>&1

if !errorlevel! neq 0 (
    echo ⚠️  Dependency check failed. Retrying with verbose output...
    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo ❌ ERROR: Failed to install dependencies. Please check the errors above.
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies are up to date.
)

:loop
echo.
echo ---------------------------------------------------------------------
echo 🚀 [%TIME%] Starting Worker Process...
echo ---------------------------------------------------------------------

"%PYTHON_EXE%" scripts/content_worker.py

echo.
echo ⚠️  [%TIME%] Worker stopped (Code: %errorlevel%). Restarting in 5 seconds...
timeout /t 5 >nul
goto loop
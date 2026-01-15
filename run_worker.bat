@echo off
cd /d "%~dp0"

echo Starting Audio Generator in background...
start "" ".venv\Scripts\pythonw.exe" content_worker.py
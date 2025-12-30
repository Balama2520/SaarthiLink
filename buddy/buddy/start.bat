@echo off
title BUDDY AI - Quick Start
echo ================================================
echo BUDDY AI - Starting Neural Interface...
echo ================================================
echo.

REM Set required environment variables for security
set SECRET_KEY=buddy-dev-secret-change-in-production
set ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080

echo [1/4] Igniting Neural Engine (Ollama)...
start /min cmd /c "ollama serve"
timeout /t 2 /nobreak >nul

echo [2/4] Starting Backend...
cd backend
start cmd /k "python -m uvicorn app.main:app --reload --port 2520"
cd ..

timeout /t 3 /nobreak >nul

echo [3/4] Starting Frontend Server...
cd frontend
start cmd /k "python -m http.server 8080"
cd ..

timeout /t 2 /nobreak >nul

echo [4/4] Opening Browser...
start http://localhost:8080

echo.
echo ================================================
echo BUDDY AI is now running!
echo Backend:  http://localhost:2520
echo Frontend: http://localhost:8080
echo ================================================
pause

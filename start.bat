@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  AI Teaching Platform - Quick Start Script
echo ============================================
echo.

cd /d "%~dp0"

:: 1. Backend Setup
echo [1/6] Setting up backend environment...
cd backend

if not exist venv (
    echo   Creating Python virtual environment...
    python -m venv venv
)

echo   Installing backend dependencies...
call venv\Scripts\activate.bat && pip install -r requirements.txt -q

:: 2. Environment Variables
echo [2/6] Configuring environment variables...
if not exist .env (
    echo   Copying .env.example to .env...
    copy .env.example .env >nul
)

:: 3. Database Migration
echo [3/6] Running database migrations...
call venv\Scripts\activate.bat && alembic upgrade head

:: 4. Initialize Seed Data
echo [4/6] Initializing seed data...
call venv\Scripts\activate.bat && python scripts/init_dropdown_options.py
call venv\Scripts\activate.bat && python scripts/init_tags.py
call venv\Scripts\activate.bat && python scripts/init_templates.py
call venv\Scripts\activate.bat && python scripts/init_data.py

echo   Default teacher account: teacher / Teacher@Local2026!

:: 5. Start Backend
echo [5/6] Starting backend server (port 8000)...
start "AI-Teaching-Backend" cmd /c "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: 6. Start Frontend
echo [6/6] Starting frontend server (port 5173)...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo   Installing frontend dependencies...
    call npm install
)

start "AI-Teaching-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

cd /d "%~dp0"

echo.
echo ============================================
echo  Startup Complete! Access URLs:
echo.
echo  Frontend: http://localhost:5173
echo  Backend API: http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo.
echo  Close this window without stopping services.
echo  Backend and Frontend run in separate windows.
echo ============================================

pause
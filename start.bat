@echo off
chcp 65001 >nul
setlocal

echo ==========================================
echo   AI Teaching Platform - Local Startup
echo ==========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.11+ is required.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 18+ is required.
    pause
    exit /b 1
)

if not exist "backend\\storage" mkdir backend\\storage

echo [1/5] Preparing backend environment...
cd backend

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\activate
pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)

echo [2/5] Applying database migrations...
python -m alembic upgrade head
if errorlevel 1 (
    echo [ERROR] Failed to apply database migrations.
    pause
    exit /b 1
)

echo [3/5] Seeding local teacher data...
python scripts\init_data.py
if errorlevel 1 (
    echo [ERROR] Failed to initialize local data.
    pause
    exit /b 1
)

start "AI Teaching Platform Backend" cmd /k "venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

echo [4/5] Preparing frontend environment...
cd frontend
if not exist "node_modules" (
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)

start "AI Teaching Platform Frontend" cmd /k "npm run dev"
cd ..

echo [5/5] Services started.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo Docs:     http://localhost:8000/docs
echo.
echo Press any key to stop both windows.
pause >nul

taskkill /FI "WINDOWTITLE eq AI Teaching Platform Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AI Teaching Platform Frontend*" /F >nul 2>&1
echo Services stopped.

#!/bin/bash

set -e

echo "=========================================="
echo "  AI Teaching Platform - Local Startup"
echo "=========================================="
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] Python 3.11+ is required."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js 18+ is required."
  exit 1
fi

mkdir -p backend/storage

echo "[1/5] Preparing backend environment..."
cd backend

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo "[2/5] Applying database migrations..."
python -m alembic upgrade head

echo "[3/5] Seeding local teacher data..."
python scripts/init_data.py

nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid
cd ..

echo "[4/5] Preparing frontend environment..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi

nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid
cd ..

echo "[5/5] Services started."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo "Docs:     http://localhost:8000/docs"
echo
echo "Run ./stop.sh to stop both services."

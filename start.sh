#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo " AI教学平台 - 一键本地启动脚本"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. 后端虚拟环境 ──
echo "[1/6] 配置后端环境..."
cd backend

if [ ! -d "venv" ]; then
    echo "   创建 Python 虚拟环境..."
    python3 -m venv venv
fi

echo "   激活虚拟环境..."
source venv/bin/activate

echo "   安装后端依赖..."
pip install -r requirements.txt -q

# ── 2. 环境变量 ──
echo "[2/6] 配置环境变量..."
if [ ! -f ".env" ]; then
    echo "   复制 .env.example 为 .env..."
    cp .env.example .env
fi

# ── 3. 数据库迁移 ──
echo "[3/6] 执行数据库迁移..."
alembic upgrade head

# ── 4. 初始化种子数据 ──
echo "[4/6] 初始化种子数据..."
python scripts/init_dropdown_options.py
python scripts/init_tags.py
python scripts/init_templates.py
python scripts/init_data.py

echo "   默认教师账号: teacher / Teacher@Local2026!"

# ── 5. 启动后端 ──
echo "[5/6] 启动后端服务 (端口 8000)..."
cd "$SCRIPT_DIR/backend"
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
echo "   后端 PID: $!"

# ── 6. 启动前端 ──
echo "[6/6] 启动前端服务 (端口 5173)..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖..."
    npm install
fi

nohup npm run dev > ../frontend.log 2>&1 &
echo "   前端 PID: $!"

cd "$SCRIPT_DIR"

echo ""
echo "============================================"
echo " 启动完成! 访问以下地址:"
echo ""
echo " 前端:     http://localhost:5173"
echo " 后端API:  http://localhost:8000"
echo " API文档:  http://localhost:8000/docs"
echo ""
echo " 日志文件: backend.log / frontend.log"
echo "============================================"
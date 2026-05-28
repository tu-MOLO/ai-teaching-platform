#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo " AI教学平台 - 一键本地启动脚本"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检测 Python 命令
PYTHON=""
if command -v python3 &>/dev/null; then
    PYTHON="python3"
elif command -v python &>/dev/null; then
    PYTHON="python"
else
    echo "[错误] 未找到 Python，请安装 Python 3.9+"
    exit 1
fi
echo "   使用 Python: $PYTHON ($($PYTHON --version 2>&1))"

# 检测 Node.js
if ! command -v node &>/dev/null; then
    echo "[错误] 未找到 Node.js，请安装 Node.js 18+"
    exit 1
fi
echo "   使用 Node: $(node --version)"

# ── 1. 后端虚拟环境 ──
echo "[1/6] 配置后端环境..."
cd backend

if [ ! -d "venv" ]; then
    echo "   创建 Python 虚拟环境..."
    $PYTHON -m venv venv
fi

echo "   安装后端依赖..."
source venv/bin/activate
pip install -r requirements.txt -q
deactivate

# ── 2. 环境变量 ──
echo "[2/6] 配置环境变量..."
if [ ! -f ".env" ]; then
    echo "   复制 .env.example 为 .env..."
    cp .env.example .env
fi

# ── 3. 数据库迁移 ──
echo "[3/6] 执行数据库迁移..."
source venv/bin/activate
alembic upgrade head
deactivate

# ── 4. 初始化种子数据 ──
echo "[4/6] 初始化种子数据..."
source venv/bin/activate
python scripts/init_dropdown_options.py
python scripts/init_tags.py
python scripts/init_templates.py
python scripts/init_data.py
deactivate

echo "   默认教师账号: teacher / Teacher@Local2026!"

# ── 5. 启动后端 ──
echo "[5/6] 启动后端服务 (端口 8000)..."
cd "$SCRIPT_DIR/backend"
nohup bash -c "source venv/bin/activate && exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# ── 6. 启动前端 ──
echo "[6/6] 启动前端服务 (端口 5173)..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖..."
    npm install
fi

nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"

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
echo ""
echo " 停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "============================================"
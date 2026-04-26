#!/bin/bash

echo "=========================================="
echo "   AI教学平台 - 本地启动脚本"
echo "=========================================="
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到Python3，请先安装Python 3.11+"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到Node.js，请先安装Node.js 18+"
    exit 1
fi

echo "[1/5] 检查环境完成"
echo ""

# 创建存储目录
mkdir -p backend/storage
echo "[2/5] 创建存储目录完成"
echo ""

# 启动后端
echo "[3/5] 启动后端服务..."
cd backend

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境并安装依赖
source venv/bin/activate
pip install -q -r requirements.txt

# 初始化数据（如果数据库不存在）
if [ ! -f "ai_teaching.db" ]; then
    echo "首次运行，初始化数据..."
    python scripts/init_data.py
fi

# 启动后端（后台运行）
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid

cd ..
echo "后端服务已启动: http://localhost:8000 (PID: $BACKEND_PID)"
echo ""

# 启动前端
echo "[4/5] 启动前端服务..."
cd frontend

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 启动前端（后台运行）
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid

cd ..
echo "前端服务已启动: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""

echo "[5/5] 所有服务已启动！"
echo ""
echo "=========================================="
echo " 访问地址:"
echo "  - 前端应用: http://localhost:5173"
echo "  - API文档:  http://localhost:8000/docs"
echo "  - 健康检查: http://localhost:8000/health"
echo "=========================================="
echo ""
echo "运行 ./stop.sh 关闭所有服务"

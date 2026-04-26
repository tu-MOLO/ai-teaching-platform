#!/bin/bash

echo "正在关闭AI教学平台服务..."

# 关闭后端
if [ -f "backend/.backend.pid" ]; then
    BACKEND_PID=$(cat backend/.backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "后端服务已关闭 (PID: $BACKEND_PID)"
    fi
    rm backend/.backend.pid
fi

# 关闭前端
if [ -f "frontend/.frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend/.frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "前端服务已关闭 (PID: $FRONTEND_PID)"
    fi
    rm frontend/.frontend.pid
fi

echo "所有服务已关闭"

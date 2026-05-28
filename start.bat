@echo off
chcp 65001 >nul
setlocal disabledelayedexpansion

echo ============================================
echo  AI教学平台 - 一键本地启动脚本
echo ============================================
echo.

cd /d "%~dp0"

:: ── 1. 后端虚拟环境 ──
echo [1/6] 配置后端环境...
cd backend

if not exist venv (
    echo   创建 Python 虚拟环境...
    python -m venv venv
)

echo   安装后端依赖...
call venv\Scripts\activate.bat && pip install -r requirements.txt -q

:: ── 2. 环境变量 ──
echo [2/6] 配置环境变量...
if not exist .env (
    echo   复制 .env.example 为 .env...
    copy .env.example .env >nul
)

:: ── 3. 数据库迁移 ──
echo [3/6] 执行数据库迁移...
call venv\Scripts\activate.bat && alembic upgrade head

:: ── 4. 初始化种子数据 ──
echo [4/6] 初始化种子数据...
call venv\Scripts\activate.bat && python scripts/init_dropdown_options.py
call venv\Scripts\activate.bat && python scripts/init_tags.py
call venv\Scripts\activate.bat && python scripts/init_templates.py
call venv\Scripts\activate.bat && python scripts/init_data.py

echo   默认教师账号: teacher / Teacher@Local2026!

:: ── 5. 启动后端 ──
echo [5/6] 启动后端服务 (端口 8000)...
start "AI-Teaching-Backend" cmd /c "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: ── 6. 启动前端 ──
echo [6/6] 启动前端服务 (端口 5173)...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo   安装前端依赖...
    call npm install
)

start "AI-Teaching-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

cd /d "%~dp0"

echo.
echo ============================================
echo  启动完成! 访问以下地址:
echo.
echo  前端:     http://localhost:5173
echo  后端API:  http://localhost:8000
echo  API文档:  http://localhost:8000/docs
echo.
echo  关闭本窗口不会停止服务; 在新窗口中运行前后端。
echo ============================================

pause
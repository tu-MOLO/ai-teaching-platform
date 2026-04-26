@echo off
chcp 65001 >nul
echo ==========================================
echo    AI教学平台 - 本地启动脚本
echo ==========================================
echo.

:: 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.11+
    pause
    exit /b 1
)

:: 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Node.js，请先安装Node.js 18+
    pause
    exit /b 1
)

echo [1/5] 检查环境完成
echo.

:: 创建存储目录
if not exist "backend\storage" mkdir backend\storage
echo [2/5] 创建存储目录完成
echo.

:: 启动后端
echo [3/5] 启动后端服务...
cd backend

:: 检查虚拟环境
if not exist "venv" (
    echo 创建Python虚拟环境...
    python -m venv venv
)

:: 激活虚拟环境并安装依赖
call venv\Scripts\activate
pip install -q -r requirements.txt

:: 初始化数据（如果数据库不存在）
if not exist "ai_teaching.db" (
    echo 首次运行，初始化数据...
    python scripts\init_data.py
)

:: 启动后端（后台运行）
start "AI教学平台-后端" cmd /k "venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

cd ..
echo 后端服务已启动: http://localhost:8000
echo.

:: 启动前端
echo [4/5] 启动前端服务...
cd frontend

:: 检查node_modules
if not exist "node_modules" (
    echo 安装前端依赖...
    npm install
)

:: 启动前端（后台运行）
start "AI教学平台-前端" cmd /k "npm run dev"

cd ..
echo 前端服务已启动: http://localhost:5173
echo.

echo [5/5] 所有服务已启动！
echo.
echo ==========================================
echo  访问地址:
echo   - 前端应用: http://localhost:5173
echo   - API文档:  http://localhost:8000/docs
echo   - 健康检查: http://localhost:8000/health
echo ==========================================
echo.
echo 按任意键关闭所有服务...
pause >nul

:: 关闭服务
taskkill /FI "WINDOWTITLE eq AI教学平台-后端*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AI教学平台-前端*" /F >nul 2>&1
echo 服务已关闭

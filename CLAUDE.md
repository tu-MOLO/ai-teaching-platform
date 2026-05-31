# CLAUDE.md

## Project Overview

AI教学平台 — 面向教师本地交付场景的全栈教学管理平台。  
教师通过统一界面管理课程、学生、教案、成长档案、教学资源，并可借助多 AI 供应商的对话助手辅助教学。

## Tech Stack

| 层 | 技术 |
|---|------|
| **后端** | Python 3.11, FastAPI 0.109, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| **前端** | React 18, TypeScript 5.2, Ant Design 5.12, Vite 5, Zustand 4.4, Axios |
| **数据库** | SQLite + aiosqlite（开发）/ PostgreSQL 15 + asyncpg（生产） |
| **存储** | MinIO 对象存储 |
| **缓存** | Redis 7（可选，有内存 fallback） |
| **AI** | 智谱 GLM-4 默认，支持用户配置 OpenAI/DeepSeek/Moonshot/通义千问 |
| **测试** | Pytest + pytest-asyncio（后端），Vitest + Testing Library（前端） |

## Quick Start

```bash
# 一键启动（推荐）
./start.sh        # macOS/Linux
start.bat         # Windows

# 手动启动
# 后端
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # 首次
alembic upgrade head
python scripts/init_data.py
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

**默认账号：** `teacher` / `Teacher@Local2026!`

## Architecture

### 后端（分层）

```
Request → Route (api/v1/*.py) → Service (services/*.py) → Model (models/*.py)
                                    ↕
                              Schema (schemas/*.py)   ← Pydantic 验证
```

- **Route** 负责 HTTP 层：入参提取、依赖注入、响应封装
- **Service** 是纯业务逻辑，全部为 `@staticmethod`，首参 `db: AsyncSession`
- **Model** 是 SQLAlchemy ORM，所有模型继承 `BaseModel`（UUID + 时间戳 + 软删除 + 乐观锁）
- **Schema** 用 Pydantic v2 做请求/响应验证

### 前端

```
Pages (pages/*) → Components (components/*) → Services (services/*) → Stores (stores/*)
```

- **Pages** 用 `React.lazy()` 懒加载，路由定义在 `router/index.tsx`
- **Stores** 用 Zustand：auth, user, dashboard, theme, ai, portfolioTypes
- **Services** 是对 `services/request.ts`（axios 实例）的薄封装

## Key Conventions

- **UUID 主键**: `String(36)`，由 `uuid4()` 生成，不自增
- **软删除**: `is_deleted` + `deleted_at`，全局 SQLAlchemy 事件过滤
- **乐观锁**: `version` 字段，更新时递增校验
- **响应信封**: `DataResponse[T]`（单条）、`ListResponse[T]`（分页列表含 total/page/page_size/pages）
- **业务异常**: `BusinessException` 层级体系（NotFoundException 404, ConflictException 409 等），带 ErrorCode 枚举
- **单角色**: 仅 teacher，RBAC 已移除
- **中文 UI**: 界面文字、API 标签均为中文
- **数据隔离**: 所有 Service 查询按 `user_id` 过滤
- **Token 版本化**: JWT 含 `jti` 映射 `User.token_version`，改密时可立即吊销令牌

## Testing

### 后端
```bash
cd backend
pytest                                    # 全量运行
pytest tests/test_course_api.py           # 单文件
pytest --cov=app --cov-report=html        # 覆盖率报告
pytest -x -q                              # 快速失败模式
```
- 覆盖率阈值 ≥ 90%（`pyproject.toml` fail_under）
- 使用内存 SQLite、function-scoped fixtures
- `conftest.py` 提供 `client`、`db_session`、`test_user`、`auth_headers` 等 fixtures

### 前端
```bash
cd frontend
npm run test              # vitest run
npm run test:watch        # 监听模式
npm run test:coverage     # 覆盖率
```
- 测试文件放在 `__tests__/` 目录（与源文件同级）
- Ant Design 组件用轻量 DOM 元素 mock（`vi.mock('antd', ...)`）
- Store 用 `vi.mock` 返回 hook 函数
- 组件渲染用 `React.createElement(Component)` 而非 JSX

## Important Paths

```
backend/
  app/main.py                  # FastAPI 入口，中间件、异常处理
  app/api/v1/                  # 14 个路由模块
  app/services/                # 业务逻辑层
  app/models/                  # SQLAlchemy 模型
  app/schemas/                 # Pydantic 模式
  app/core/config.py           # Settings（读 .env）
  app/core/database.py         # 异步引擎 & Session
  app/core/security.py         # JWT + bcrypt + Fernet
  app/core/exceptions.py       # BusinessException + ErrorCode
  tests/conftest.py            # 测试 fixtures
  alembic/                     # 数据库迁移

frontend/
  src/main.tsx                 # React 入口
  src/App.tsx                  # 路由 & 主题初始化
  src/router/index.tsx         # 路由表（20+ 路由）
  src/stores/                  # Zustand stores
  src/services/request.ts      # Axios 实例（拦截器、刷新逻辑）
  src/services/api.ts          # 导出 request 为 api
  src/pages/                   # 页面组件
  src/components/              # 可复用组件
  vite.config.ts               # Vite + Vitest 配置
```

## Environment Variables

后端配置文件：`backend/.env`（从 `backend/.env.example` 复制）

| 变量 | 必填 | 说明 |
|------|------|------|
| `SECRET_KEY` | ✅ | JWT 签名密钥，≥ 32 字符 |
| `DATABASE_URL` | ✅ | 数据库连接串，默认 `sqlite+aiosqlite:///./ai_teaching.db` |
| `DEBUG` | — | `True` 启用 /docs、自动建表、详细错误，默认 `False` |
| `BIGMODEL_API_KEY` | — | 智谱 AI API Key（AI 助手功能需要） |
| `BACKEND_CORS_ORIGINS` | — | 逗号分隔的允许来源 |

完整变量列表见 `backend/.env.example`。

## Database Migrations

```bash
cd backend
alembic upgrade head                              # 应用全部迁移
alembic downgrade -1                              # 回退一步
alembic revision --autogenerate -m "描述"         # 生成新迁移
alembic history                                    # 查看迁移历史
```

## Docker

```bash
docker-compose up -d          # 启动完整开发栈（PostgreSQL + MinIO + Redis + 应用）
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d  # 生产配置
```

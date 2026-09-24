# AI教学平台 — 系统架构文档

## 1. 系统概述

AI教学平台是一款面向教师群体的智能教学辅助系统，基于FastAPI + React技术栈构建，提供课程管理、学生跟踪、教案设计、AI智能助手、资源中心、通知公告、数据报告等核心功能模块。平台支持多模态AI对话（SSE流式响应 + Function Calling工具链），帮助教师高效完成日常教学管理工作。

**目标用户**：中小学教师、教育机构教务人员
**核心定位**：AI赋能的教学管理与备课助手

---

## 2. 技术架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                          客户端层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Web浏览器  │  │  移动端浏览器 │  │   Playwright E2E测试    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         接入层                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Nginx (反向代理 / 静态资源 / HTTPS / SSE支持 / 安全头)   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         应用层                                   │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │      前端 (React 18)     │    │      后端 (FastAPI)          │ │
│  │  Vite + TypeScript      │    │  Python 3.11+ / asyncio      │ │
│  │  Ant Design + Zustand   │    │  SQLAlchemy 2.0 (async)      │ │
│  │  ECharts + Recharts     │    │  Pydantic v2                 │ │
│  └───────────┬─────────────┘    └─────────────┬───────────────┘ │
└──────────────┼────────────────────────────────┼─────────────────┘
               │                                │
               ▼                                ▼
┌─────────────────────────────┐    ┌──────────────────────────────┐
│      前端状态管理            │    │       后端服务层              │
│  Zustand (分模块Store)      │    │  API → Schema → Service      │
│  内存存储 / localStorage     │    │  JWT认证 / 权限控制           │
│  (Token持久化)              │    │  速率限制 / 审计日志           │
└─────────────────────────────┘    └─────────────┬───────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
           ┌─────────────┐            ┌─────────────────┐          ┌─────────────────┐
           │   数据库     │            │   对象存储       │          │    AI服务       │
           │  PostgreSQL │            │    MinIO        │          │  OpenRouter /   │
           │   (SQLite)  │            │   (本地文件)     │          │  DeepSeek /     │
           │   Redis缓存 │            │                 │          │  SiliconFlow    │
           └─────────────┘            └─────────────────┘          └─────────────────┘
```

---

## 3. 后端架构

### 3.1 分层设计

后端采用经典的分层架构，职责分离清晰：

```
API层 (app/api/)
    ├── 接收HTTP请求
    ├── 参数校验 (Pydantic Schema)
    ├── 依赖注入 (DB Session / Current User)
    └── 调用Service层

Service层 (app/services/)
    ├── 业务逻辑编排
    ├── 跨模块事务协调
    ├── 外部服务调用 (AI / 存储)
    └── 返回业务对象

Model层 (app/models/)
    ├── SQLAlchemy ORM模型
    ├── 数据库表结构定义
    ├── 关联关系配置
    └── 软删除基类 (SoftDeleteMixin)

Schema层 (app/schemas/)
    ├── Pydantic v2数据模型
    ├── 请求/响应DTO
    ├── 校验规则与序列化
    └── 输入输出接口契约
```

### 3.2 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| Config | `app/core/config.py` | 环境变量管理、配置验证、默认值 |
| Database | `app/core/database.py` | 异步引擎、会话管理、连接池 |
| Security | `app/core/security.py` | JWT签发/校验、密码哈希、Token刷新 |
| Exceptions | `app/core/exceptions.py` | 统一异常体系、错误码枚举 |
| Logging | `app/core/logging.py` | 结构化日志、请求追踪ID |
| Rate Limiter | `app/core/rate_limiter.py` | 滑动窗口限流、配置化管理 |

### 3.3 异步架构

- **Web框架**: FastAPI + Uvicorn (ASGI)
- **ORM**: SQLAlchemy 2.0 with AsyncSession
- **HTTP客户端**: httpx (async) 用于AI服务调用
- **任务调度**: asyncio.to_thread 用于同步I/O操作（如MinIO上传）
- **流式响应**: SSE (Server-Sent Events) 用于AI对话实时推送

---

## 4. 前端架构

### 4.1 技术栈

- **框架**: React 18 + TypeScript 5
- **构建工具**: Vite (极速开发体验、代码分割、Tree Shaking)
- **UI组件库**: Ant Design 5.x
- **状态管理**: Zustand (轻量、无样板代码、分模块设计)
- **图表库**: ECharts + Recharts
- **HTTP客户端**: Axios (统一拦截器、错误处理、Token刷新)
- **路由**: React Router 6

### 4.2 目录结构

```
frontend/src/
├── api/              # API接口封装（按模块分组）
├── components/       # 公共组件（Common / UI）
├── pages/            # 页面级组件（按功能模块）
├── services/         # 业务服务层（数据转换、本地缓存）
├── stores/           # Zustand状态管理（auth / course / student...）
├── hooks/            # 自定义React Hooks
├── utils/            # 工具函数（日期、格式化、校验）
├── types/            # TypeScript类型定义
└── test/             # 测试配置与Mock数据
```

### 4.3 状态管理设计

采用 **Zustand 分模块 Store** 设计，每个核心领域一个Store：

- `useAuthStore`: 用户信息、Token状态、登录/登出
- `useCourseStore`: 课程列表、当前课程、筛选条件
- `useStudentStore`: 学生列表、成长档案
- `useLessonPlanStore`: 教案列表、编辑状态
- `useAIStore`: 对话列表、当前会话、消息流
- `useResourceStore`: 资源列表、上传队列
- `useNotificationStore`: 未读消息、通知列表

Store之间通过选择器（selector）实现细粒度订阅，避免不必要的重渲染。

---

## 5. 数据流

### 5.1 认证流程 (JWT双Token + HttpOnly Cookie)

```
用户登录
    │
    ▼
┌─────────────┐
│  POST /login │ ──→ 后端校验密码 → 生成Access Token + Refresh Token
└─────────────┘         │
                        ▼
              ┌─────────────────┐
              │ Access Token → 响应体 (JSON)
              │ Refresh Token → HttpOnly Cookie
              └─────────────────┘
                        │
    ◄───────────────────┘
    │
    ▼
前端存储Access Token (内存/Zustand)
后续请求携带 Authorization: Bearer <access_token>

Access Token过期 (30分钟)
    │
    ▼
前端检测到401 → 自动调用 POST /refresh
    │
    ▼
后端校验Refresh Token (HttpOnly Cookie) → 颁发新Access Token
```

### 5.2 AI对话流 (SSE流式 + Function Calling)

```
用户发送消息
    │
    ▼
┌─────────────────┐
│ POST /chat      │ ──→ 创建/获取会话 → 保存用户消息
└─────────────────┘         │
                            ▼
                    ┌─────────────────┐
                    │ 调用AI服务      │
                    │ (OpenRouter/    │
                    │  DeepSeek/      │
                    │  SiliconFlow)   │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ SSE流式响应     │ ◄── 实时推送token到前端
                    │                 │
                    │ 如遇tool_call   │ ──→ 暂停输出 → 执行本地工具
                    │                 │      (查课程/查学生/创建课程)
                    │ 工具结果回传    │ ──→ 再次调用AI → 继续流式输出
                    └─────────────────┘
                            │
    ◄───────────────────────┘
    │
    ▼
前端逐字渲染AI回复，支持Markdown、代码高亮
```

---

## 6. 部署架构

### 6.1 开发环境

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 数据库 | SQLite | 零配置，开箱即用 |
| 对象存储 | 本地文件系统 | 存储在 `./storage` 目录 |
| 缓存 | 内存字典 | 开发环境简配 |
| 前端devServer | Vite (port 5173) | HMR热更新 |
| 后端API | Uvicorn (port 8000) | 单进程重载 |

**一键启动**: `start.bat` (Windows) / `start.sh` (Linux/macOS)

### 6.2 生产环境 (Docker)

```yaml
# docker-compose.prod.yml 核心服务
services:
  db:       PostgreSQL 15 (持久化卷)
  redis:    Redis 7 (缓存 + 限流计数)
  minio:    MinIO (对象存储)
  backend:  FastAPI + Uvicorn Workers
  frontend: Nginx (静态资源 + 反向代理)
  nginx:    入口网关 (HTTPS / 负载均衡)
```

**部署特性**:
- 多阶段Docker构建（减少镜像体积）
- 非root用户运行容器
- 健康检查端点 (`/health`, `/health/detailed`)
- 资源限制 (CPU / 内存)
- Nginx gzip压缩 + 缓存策略
- Alembic数据库迁移

---

## 7. 安全设计

### 7.1 认证与授权

- **JWT双Token**: Access Token (30分钟) + Refresh Token (7天)
- **HttpOnly Cookie**: Refresh Token防XSS窃取
- **密码安全**: bcrypt哈希 + 密保问题重置
- **账户锁定**: 连续5次失败登录锁定30分钟

### 7.2 请求安全

- **速率限制**: 登录/注册/API操作分级限流 (滑动窗口算法)
- **CORS**: 白名单控制跨域请求
- **输入校验**: Pydantic Schema全量校验 + SQL注入防护 (ORM参数化查询)
- **文件上传**: 类型白名单 + 大小限制 + 病毒扫描接口预留

### 7.3 数据安全

- **软删除**: 全局 `is_deleted` + `deleted_at` 字段，避免误删
- **审计日志**: 关键操作全量记录 (操作人/时间/IP/结果)
- **API密钥加密**: AI服务商API Key使用Fernet对称加密存储
- **日志脱敏**: 手机号/密码等敏感字段自动掩码

### 7.4 传输与部署安全

- **HTTPS**: Nginx强制TLS 1.2+，HSTS响应头
- **CSP**: Content-Security-Policy防XSS
- **安全响应头**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **内网限制**: 详细健康检查端点仅限内网IP访问

---

## 8. 扩展性设计

### 8.1 水平扩展

- 后端无状态设计，可通过多Uvicorn Worker或负载均衡水平扩展
- 数据库读写分离预留（SQLAlchemy支持多bind）
- Redis作为分布式缓存和限流计数器

### 8.2 功能扩展

- **AI服务商热插拔**: 通过配置切换OpenRouter/DeepSeek/SiliconFlow，统一抽象接口
- **工具链扩展**: 新增Function Calling工具只需注册到 `TOOL_DEFINITIONS` + `TOOL_EXECUTOR`
- **导出格式扩展**: ExportService支持PDF/Word，可扩展为PPT/Excel
- **通知渠道扩展**: 当前支持站内信，可扩展邮件/短信/WebPush

---

## 9. 监控与运维

### 9.1 健康检查

| 端点 | 用途 | 访问控制 |
|------|------|----------|
| `GET /health` | 基础存活检查 | 公开 |
| `GET /health/detailed` | 数据库/存储/AI服务连通性 | 内网IP |

### 9.2 日志体系

- **请求日志**: 自动记录请求方法/路径/耗时/状态码
- **业务日志**: Service层关键操作INFO级别记录
- **错误日志**: 异常全链路追踪（含请求ID）
- **日志轮转**: 按天切割，保留30天

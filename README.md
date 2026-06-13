# AI教学平台

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-blue?logo=python" alt="Python 3.13">
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Ant%20Design-5.12-0170FE?logo=antdesign" alt="Ant Design">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

<p align="center">
  一个面向教师本地交付场景的全栈教学管理平台，支持课程、学生、教案、成长档案、AI助手与资源管理
</p>

## 📖 目录

- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
  - [环境要求](#环境要求)
  - [Docker部署（推荐）](#docker部署推荐)
  - [本地开发](#本地开发)
- [项目结构](#-项目结构)
- [API文档](#-api文档)
- [测试](#-测试)
- [CI/CD](#-cicd)
- [部署](#-部署)
- [更新日志](#-更新日志)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## ✨ 功能特性

### 📚 课程管理

- 课程信息CRUD操作
- 课程状态跟踪（草稿/进行中/已结课）
- 课程分类和标签管理
- 课程与学生多对多关联

### 📝 教案设计

- 教案模板库
- 教案创建、编辑、发布、归档
- 教案月度统计
- 教案导出（PDF / Word）
- 教案状态工作流：草稿 → 发布 → 归档

### 👨‍🎓 学生管理

- 学生信息管理
- 学习进度跟踪
- 学生成长档案
- 能力雷达图分析
- 学生数据导出（CSV）

### 📂 资源中心

- 文件上传/下载（拖拽上传）
- 默认本地文件存储
- 可选 MinIO 对象存储
- 资源标签和预览功能
- 文件类型校验与大小限制（100MB）

### 🤖 AI 助手

- 多服务商支持：智谱 AI、OpenAI、DeepSeek、Moonshot、通义千问及自定义服务商
- 用户可自定义 API 密钥、接口地址和模型，支持连接测试
- 默认使用智谱 BigModel（glm-4.7-flash），可随时切换
- Function Calling 工具调用：直接操作课程、学生、教案、资源、通知等平台数据
- 多轮上下文记忆与流式响应（SSE）
- 模块化对话标签（课程/学生/教案/数据/资源/通知）
- API 密钥加密存储（cryptography），安全域名白名单校验
- 对话历史管理（创建、重命名、删除）

### 🔔 通知系统

- 站内通知列表
- 已读/未读状态管理
- 批量标记已读
- 未读数量统计

### 📊 报告统计

- 仪表盘统计数据
- 教案统计报告
- 课程与学生数据汇总
- 月度趋势分析

### 🔐 用户认证与权限

- JWT Token认证（Access Token 30分钟 / Refresh Token 7天）
- 教师单角色产品逻辑
- 本地注册、登录、改密、重置密码
- 密保问题验证用于密码重置
- Refresh Token 通过 HttpOnly Cookie 传递（防 XSS）
- 请求速率限制
- 账户锁定（5次失败登录后锁定30分钟）
- Token 版本化（改密时可立即吊销令牌）

### 🎨 主题定制

- 自定义主题色
- 主题预设管理
- 对比度警告与颜色历史
- CSS-in-JS 动态主题切换

### 🛡️ 安全与运维

- 安全响应头（CSP / HSTS / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy）
- 请求体大小限制
- 软删除过滤器
- 健康检查端点（`/health`、`/health/detailed`）
- 结构化日志与请求追踪
- 内网 IP 限制（生产环境详细健康检查）
- 错误码体系（1000-7999 分级）

---

## 🛠 技术栈

### 后端

| 技术                  | 版本    | 用途           |
| --------------------- | ------- | -------------- |
| **FastAPI**     | 0.109.2 | Web框架        |
| **SQLAlchemy**  | 2.0.27  | ORM（异步）    |
| **SQLite**      | -       | 本地默认数据库 |
| **PostgreSQL**  | 15      | 可选部署数据库 |
| **Alembic**     | 1.13.1  | 数据库迁移     |
| **MinIO**       | latest  | 对象存储       |
| **Redis**       | 7       | 缓存           |
| **Pydantic**    | 2.6.1   | 数据验证       |
| **PyJWT**       | 2.8.0   | JWT认证        |
| **httpx**       | 0.26.0  | 异步HTTP客户端 |
| **aiohttp**     | 3.9.3   | 异步HTTP客户端 |
| **WeasyPrint**  | 59.0    | PDF导出        |
| **python-docx** | 0.8.11  | Word导出       |
| **cryptography** | >=42.0 | API密钥加密    |
| **orjson**      | 3.9.13  | JSON序列化     |
| **bcrypt**      | 4.1.2   | 密码哈希       |
| **Pytest**      | 7.4.4   | 测试框架       |

### 前端

| 技术                      | 版本   | 用途           |
| ------------------------- | ------ | -------------- |
| **React**           | 18.2.0 | UI框架         |
| **TypeScript**      | 5.2.2  | 类型系统       |
| **Ant Design**      | 5.12.0 | UI组件库       |
| **Vite**            | 5.0.8  | 构建工具       |
| **Zustand**         | 4.4.0  | 状态管理       |
| **ECharts**         | 5.4.0  | 图表库         |
| **Axios**           | 1.6.0  | HTTP客户端     |
| **React Router**    | 6.21.0 | 路由           |
| **react-md-editor** | 4.0.0  | Markdown编辑器 |
| **react-dropzone**  | 14.2.0 | 文件拖拽上传   |
| **dayjs**           | 1.11.0 | 日期处理       |
| **Vitest**          | 4.1.7  | 前端测试框架   |
| **Playwright**      | 1.52.0 | E2E测试框架    |
| **Testing Library** | 16.3.2 | 组件测试       |

---

## 🚀 快速开始

### 环境要求

- **Docker** & **Docker Compose** (推荐)
- 或 **Python 3.11+** 和 **Node.js 18+**

### Docker部署（推荐）

1. **克隆仓库**

   ```bash
   git clone https://github.com/tu-MOLO/ai-teaching-platform.git
   cd ai-teaching-platform
   ```
2. **配置环境变量**

   ```bash
   cp .env.docker.example .env
   cp backend/.env.example backend/.env
   # 按需修改 .env 与 backend/.env
   ```
3. **启动服务**

   ```bash
   docker compose up -d
   ```
4. **运行数据库迁移**

   ```bash
   docker compose --profile migration run --rm migration
   ```
5. **访问服务**

   - 前端页面: http://localhost
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs
   - MinIO控制台: http://localhost:9001

说明：

- Docker Compose 会同时启动前端（Nginx 托管）、后端及所有依赖服务
- 生产环境请使用 `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` 合并覆盖配置

### 本地开发

#### 后端开发

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端开发

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 http://localhost:5173 启动

### 一键本地启动

仓库根目录已提供：

- Windows：`start.bat`
- macOS / Linux：`start.sh`

脚本会自动：

- 创建虚拟环境
- 安装依赖
- 执行数据库迁移
- 初始化教师账号、标签、教案模板、下拉选项
- 启动前后端开发服务

首次初始化默认教师账号：

- 用户名：`teacher`
- 邮箱：`teacher@example.com`
- 密码：`Teacher@Local2026!`

建议首次登录后立即修改密码。

---

## 📁 项目结构

```
ai-teaching-platform/
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI/CD 工作流
├── backend/                        # 后端代码
│   ├── app/
│   │   ├── api/                   # API路由
│   │   │   └── v1/                # API版本1（14个模块，80+端点）
│   │   │       ├── ai.py          # AI助手对话
│   │   │       ├── ai_config.py   # AI配置管理
│   │   │       ├── auth.py        # 认证（登录/注册/刷新/改密/重置）
│   │   │       ├── courses.py     # 课程管理
│   │   │       ├── dropdown_options.py  # 动态下拉选项
│   │   │       ├── lesson_plans.py # 教案管理
│   │   │       ├── lesson_templates.py  # 教案模板
│   │   │       ├── notifications.py  # 通知管理
│   │   │       ├── portfolios.py   # 成长档案
│   │   │       ├── reports.py      # 数据报告
│   │   │       ├── resources.py    # 资源管理
│   │   │       ├── students.py     # 学生管理
│   │   │       ├── tags.py         # 标签管理
│   │   │       └── users.py        # 用户管理
│   │   ├── core/                  # 核心配置
│   │   │   ├── config.py          # 应用配置（Settings）
│   │   │   ├── config_validator.py # 配置验证
│   │   │   ├── database.py        # 数据库连接（异步引擎）
│   │   │   ├── exceptions.py      # 业务异常体系 + ErrorCode
│   │   │   ├── logging.py         # 日志配置
│   │   │   ├── performance.py     # 内存缓存
│   │   │   ├── query_filters.py   # 软删除过滤器
│   │   │   ├── rate_limiter.py    # 请求限流
│   │   │   └── security.py        # 安全工具（JWT/bcrypt/Fernet）
│   │   ├── models/                # 数据模型（SQLAlchemy ORM）
│   │   │   ├── base.py            # 基础模型（UUID/时间戳/软删除/乐观锁）
│   │   │   ├── ai.py              # AI对话模型
│   │   │   ├── ai_config.py       # AI配置模型
│   │   │   ├── audit_log.py       # 审计日志
│   │   │   ├── course.py          # 课程模型
│   │   │   ├── dropdown_option.py # 下拉选项模型
│   │   │   ├── lesson_plan.py     # 教案模型
│   │   │   ├── lesson_template.py # 教案模板模型
│   │   │   ├── notification.py    # 通知模型
│   │   │   ├── portfolio.py       # 成长档案模型
│   │   │   ├── resource.py        # 资源模型
│   │   │   ├── student.py         # 学生模型
│   │   │   ├── tag.py             # 标签模型
│   │   │   └── user.py            # 用户模型
│   │   ├── schemas/               # Pydantic模式
│   │   │   ├── base.py            # 基础响应模式
│   │   │   ├── ai.py / ai_config.py  # AI模式
│   │   │   ├── auth.py            # 认证模式
│   │   │   ├── course.py          # 课程模式
│   │   │   ├── dropdown_option.py # 下拉选项模式
│   │   │   ├── lesson_plan.py     # 教案模式
│   │   │   ├── lesson_template.py # 教案模板模式
│   │   │   ├── notification.py    # 通知模式
│   │   │   ├── portfolio.py       # 成长档案模式
│   │   │   ├── resource.py        # 资源模式
│   │   │   ├── student.py         # 学生模式
│   │   │   ├── tag.py             # 标签模式
│   │   │   └── user.py            # 用户模式
│   │   ├── services/              # 业务逻辑层
│   │   │   ├── ai.py              # AI对话服务（SSE流式）
│   │   │   ├── ai_config.py       # AI配置服务
│   │   │   ├── courses.py         # 课程服务
│   │   │   ├── dropdown_options.py # 下拉选项服务
│   │   │   ├── export.py          # 导出服务（PDF/Word）
│   │   │   ├── lesson_plans.py    # 教案服务
│   │   │   ├── notifications.py   # 通知服务
│   │   │   ├── portfolios.py      # 成长档案服务
│   │   │   ├── reports.py         # 报告服务
│   │   │   ├── resources.py       # 资源服务
│   │   │   ├── storage.py         # 存储服务（本地/MinIO）
│   │   │   ├── students.py        # 学生服务
│   │   │   ├── tags.py            # 标签服务
│   │   │   └── users.py           # 用户服务
│   │   └── utils/                 # 工具函数
│   │       └── pagination.py      # 分页工具
│   ├── alembic/                   # 数据库迁移
│   ├── scripts/                   # 实用脚本
│   │   ├── create_user.py         # 创建用户
│   │   ├── full_acceptance.py     # 完整验收
│   │   ├── init_data.py           # 初始化数据
│   │   ├── init_dropdown_options.py  # 初始化下拉选项
│   │   ├── init_tags.py           # 初始化标签
│   │   └── init_templates.py      # 初始化教案模板
│   ├── tests/                     # 后端测试（api / core / services 子目录）
│   ├── .env.example               # 后端环境变量示例
│   ├── alembic.ini                # Alembic配置
│   ├── Dockerfile                 # 后端Docker配置
│   ├── pyproject.toml             # Python项目配置
│   └── requirements.txt           # Python依赖
│
├── frontend/                       # 前端代码
│   ├── e2e/                       # E2E测试（Playwright）
│   │   ├── fixtures/              # 测试夹具
│   │   ├── specs/                 # 测试规格（10个）
│   │   │   ├── access-control.spec.ts
│   │   │   ├── ai-assistant.spec.ts
│   │   │   ├── auth.spec.ts
│   │   │   ├── courses.spec.ts
│   │   │   ├── dashboard-reports.spec.ts
│   │   │   ├── lesson-plans.spec.ts
│   │   │   ├── notifications.spec.ts
│   │   │   ├── portfolio.spec.ts
│   │   │   ├── resources.spec.ts
│   │   │   └── students.spec.ts
│   │   └── utils/                 # 测试工具
│   ├── src/
│   │   ├── components/            # 可复用组件
│   │   │   ├── AIAssistant/       # AI助手组件
│   │   │   ├── Common/            # 通用组件
│   │   │   ├── Courses/           # 课程组件
│   │   │   ├── Header/            # 头部组件
│   │   │   ├── Layout/            # 布局组件
│   │   │   ├── Portfolio/         # 成长档案组件
│   │   │   ├── ResourceCenter/    # 资源中心组件
│   │   │   ├── Sidebar/           # 侧边栏组件
│   │   │   ├── Students/          # 学生组件
│   │   │   └── Theme/             # 主题组件
│   │   ├── constants/             # 全局常量
│   │   ├── hooks/                 # 自定义Hooks
│   │   ├── pages/                 # 页面组件（13个页面）
│   │   │   ├── AIAssistant/       # AI助手页面
│   │   │   ├── Courses/           # 课程页面
│   │   │   ├── Dashboard/         # 仪表盘
│   │   │   ├── LessonPlanner/     # 教案页面
│   │   │   ├── Login/             # 登录
│   │   │   ├── Register/          # 注册
│   │   │   ├── Notifications/     # 通知页面
│   │   │   ├── Portfolio/         # 成长档案页面
│   │   │   ├── Profile/           # 个人中心
│   │   │   ├── Reports/           # 报告页面
│   │   │   ├── ResourceCenter/    # 资源中心页面
│   │   │   ├── Settings/          # 设置页面
│   │   │   └── Students/          # 学生页面
│   │   ├── router/                # 路由配置（21个路由）
│   │   ├── services/              # API服务（17个服务模块）
│   │   ├── stores/                # Zustand状态管理（6个stores）
│   │   ├── styles/                # 全局样式
│   │   ├── test/                  # 测试配置
│   │   ├── types/                 # TypeScript类型
│   │   └── utils/                 # 工具函数
│   ├── .eslintrc.cjs              # ESLint配置
│   ├── .prettierrc                # Prettier配置
│   ├── Dockerfile                 # 前端Docker配置
│   ├── index.html                 # HTML入口
│   ├── nginx.conf                 # Nginx配置
│   ├── package.json               # Node依赖
│   ├── playwright.config.ts       # Playwright配置
│   ├── tsconfig.json              # TypeScript配置
│   ├── tsconfig.build.json        # 构建用TypeScript配置
│   ├── tsconfig.node.json         # Node环境TypeScript配置
│   └── vite.config.ts             # Vite构建配置
│
├── docs/                           # 项目文档
│   ├── architecture.md             # 系统架构文档
│   └── API.md                      # API参考文档
├── .editorconfig                   # 编辑器配置
├── .env.docker.example             # Docker环境变量示例
├── .gitignore                      # Git忽略规则
├── .pre-commit-config.yaml         # Pre-commit钩子配置
├── LICENSE                         # MIT许可证
├── README.md                       # 项目文档
├── docker-compose.yml              # Docker编排
├── docker-compose.prod.yml         # 生产环境覆盖配置
├── docker-compose.e2e.yml          # E2E测试环境配置
├── start.bat                       # Windows一键启动
└── start.sh                        # macOS/Linux一键启动
```

---

## 📚 API文档

启动后端服务后，可以通过以下地址访问API文档：

- **Swagger UI**: http://localhost:8000/docs（需 `DEBUG=True`）
- **ReDoc**: http://localhost:8000/redoc（需 `DEBUG=True`）

### 主要API端点

#### 认证

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/auth/login` | POST | 用户登录 | 否 |
| `/api/v1/auth/register` | POST | 用户注册 | 否 |
| `/api/v1/auth/refresh` | POST | 刷新Access Token | 否（Cookie） |
| `/api/v1/auth/me` | GET | 获取当前用户 | 是 |
| `/api/v1/auth/logout` | POST | 用户退出 | 是 |
| `/api/v1/auth/password/change` | POST | 修改密码 | 是 |
| `/api/v1/auth/password/reset/question` | POST | 获取密保问题 | 否 |
| `/api/v1/auth/password/reset` | POST | 重置密码（密保验证） | 否 |

#### 用户

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/users/{id}` | GET | 获取用户资料 | 是 |
| `/api/v1/users/{id}` | PUT | 更新用户资料 | 是 |

#### 课程

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/courses` | POST | 创建课程 | 是 |
| `/api/v1/courses` | GET | 课程列表 | 是 |
| `/api/v1/courses/{id}` | GET | 课程详情 | 是 |
| `/api/v1/courses/{id}` | PUT | 更新课程 | 是 |
| `/api/v1/courses/{id}` | DELETE | 删除课程 | 是 |
| `/api/v1/courses/{id}/students` | GET | 获取课程学生列表 | 是 |
| `/api/v1/courses/{id}/students/{sid}` | POST | 关联学生到课程 | 是 |
| `/api/v1/courses/{id}/students/{sid}` | DELETE | 移除课程学生关联 | 是 |

#### 学生

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/students` | POST | 创建学生 | 是 |
| `/api/v1/students` | GET | 学生列表 | 是 |
| `/api/v1/students/{id}` | GET | 学生详情 | 是 |
| `/api/v1/students/{id}` | PUT | 更新学生 | 是 |
| `/api/v1/students/{id}` | DELETE | 删除学生 | 是 |
| `/api/v1/students/{id}/export` | GET | 导出学生成长报告 | 是 |
| `/api/v1/students/{id}/courses` | GET | 获取学生课程列表 | 是 |

#### 教案

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/lesson-plans` | POST | 创建教案 | 是 |
| `/api/v1/lesson-plans` | GET | 教案列表 | 是 |
| `/api/v1/lesson-plans/stats/monthly` | GET | 教案月度统计 | 是 |
| `/api/v1/lesson-plans/{id}` | GET | 教案详情 | 是 |
| `/api/v1/lesson-plans/{id}` | PUT | 更新教案 | 是 |
| `/api/v1/lesson-plans/{id}` | DELETE | 删除教案 | 是 |
| `/api/v1/lesson-plans/{id}/publish` | POST | 发布教案 | 是 |
| `/api/v1/lesson-plans/{id}/unpublish` | POST | 取消发布教案 | 是 |
| `/api/v1/lesson-plans/{id}/archive` | POST | 归档教案 | 是 |
| `/api/v1/lesson-plans/{id}/restore` | POST | 恢复教案 | 是 |

#### 教案模板

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/lesson-templates` | GET | 教案模板列表 | 是 |

#### 成长档案

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/portfolios` | POST | 创建成长档案 | 是 |
| `/api/v1/portfolios` | GET | 成长档案列表 | 是 |
| `/api/v1/portfolios/{id}` | GET | 成长档案详情 | 是 |
| `/api/v1/portfolios/{id}` | PUT | 更新成长档案 | 是 |
| `/api/v1/portfolios/{id}` | DELETE | 删除成长档案 | 是 |

#### 资源

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/resources` | POST | 上传资源 | 是 |
| `/api/v1/resources` | GET | 资源列表 | 是 |
| `/api/v1/resources/{id}` | GET | 资源详情 | 是 |
| `/api/v1/resources/{id}` | PUT | 更新资源 | 是 |
| `/api/v1/resources/{id}` | DELETE | 删除资源 | 是 |
| `/api/v1/resources/{id}/file` | GET | 下载资源文件 | 是 |

#### 标签

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/tags` | GET | 标签列表 | 否 |
| `/api/v1/tags` | POST | 创建标签 | 是 |
| `/api/v1/tags/{id}` | GET | 标签详情 | 是 |
| `/api/v1/tags/{id}` | PUT | 更新标签 | 是 |
| `/api/v1/tags/{id}` | DELETE | 删除标签 | 是 |

#### 通知

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/notifications` | GET | 通知列表 | 是 |
| `/api/v1/notifications/stats` | GET | 通知统计 | 是 |
| `/api/v1/notifications/unread-count` | GET | 未读通知数量 | 是 |
| `/api/v1/notifications/read-all` | PUT | 标记全部已读 | 是 |
| `/api/v1/notifications/read-batch` | PUT | 批量标记已读 | 是 |
| `/api/v1/notifications/read/all` | DELETE | 删除全部已读通知 | 是 |
| `/api/v1/notifications/{id}` | GET | 通知详情 | 是 |
| `/api/v1/notifications/{id}` | PUT | 更新通知 | 是 |
| `/api/v1/notifications/{id}` | DELETE | 删除通知 | 是 |
| `/api/v1/notifications/{id}/read` | PUT | 标记通知已读 | 是 |

#### 报告

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/reports/dashboard` | GET | 仪表盘统计 | 是 |
| `/api/v1/reports/courses` | GET | 课程统计报告 | 是 |
| `/api/v1/reports/students` | GET | 学生统计报告 | 是 |
| `/api/v1/reports/trends` | GET | 月度趋势数据 | 是 |

#### 下拉选项

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/dropdown-options` | GET | 下拉选项列表 | 是 |
| `/api/v1/dropdown-options` | POST | 创建下拉选项 | 是 |
| `/api/v1/dropdown-options/{id}` | PUT | 更新下拉选项 | 是 |
| `/api/v1/dropdown-options/{id}` | DELETE | 删除下拉选项 | 是 |

#### AI助手

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/api/v1/ai/chat` | POST | AI对话（SSE流式） | 是 |
| `/api/v1/ai/conversations` | GET | 对话列表 | 是 |
| `/api/v1/ai/conversations/{id}` | GET | 对话消息 | 是 |
| `/api/v1/ai/conversations/{id}` | DELETE | 删除对话 | 是 |
| `/api/v1/ai/conversations/{id}` | PATCH | 重命名对话 | 是 |
| `/api/v1/ai/config` | GET | 获取AI配置 | 是 |
| `/api/v1/ai/config` | PUT | 更新AI配置 | 是 |
| `/api/v1/ai/config/test` | POST | 测试API连接 | 是 |
| `/api/v1/ai/config` | DELETE | 重置AI配置 | 是 |

#### 健康检查

| 端点 | 方法 | 描述 | 认证 |
| ---- | ---- | ---- | ---- |
| `/health` | GET | 健康检查 | 否 |
| `/health/detailed` | GET | 详细健康检查（内网） | 否 |

> 完整API参考文档请查看 [docs/API.md](docs/API.md)

---

## 🧪 测试

### 运行后端测试

```bash
cd backend

# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=app --cov-report=html

# 运行特定测试文件
pytest tests/api/test_auth_api.py

# 运行测试并生成HTML报告
pytest --html=reports/test_report.html
```

### 运行前端测试

```bash
cd frontend

# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

### 运行E2E测试

```bash
cd frontend

# 运行所有E2E测试
npm run test:e2e

# 运行E2E测试（UI模式）
npm run test:e2e:ui

# 查看E2E测试报告
npm run test:e2e:report
```

### 测试覆盖率

- 后端覆盖率阈值：**90%**（配置于 `pyproject.toml`）
- 前端覆盖率阈值：**70%**（配置于 `vite.config.ts`）
- E2E测试覆盖：认证、课程、学生、教案、资源、通知、成长档案、报告、AI助手等核心功能

---

## 🔄 CI/CD

项目使用 GitHub Actions 进行持续集成，配置文件位于 `.github/workflows/ci.yml`。

### CI 工作流

- **后端测试**：运行 pytest，检查覆盖率
- **前端测试**：运行 vitest，检查覆盖率
- **代码检查**：ESLint + Prettier（前端）、Black + Flake8（后端）
- **E2E测试**：Playwright 端到端测试

### 手动运行CI检查

```bash
# 后端代码检查
cd backend
black . --check
flake8
mypy app

# 前端代码检查
cd frontend
npm run lint
```

---

## 🚢 部署

### 生产环境部署

1. **更新环境变量**

   - 修改 `SECRET_KEY`（至少32字符随机串）
   - 修改数据库与对象存储口令
   - 设置正确的 `BACKEND_CORS_ORIGINS`
2. **构建生产镜像**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
3. **配置Nginx**

   - 启用HTTPS
   - 配置反向代理
4. **监控与日志**

   - 配置日志收集
   - 设置健康检查

### 环境变量说明

| 变量名 | 说明 | 默认值 |
| ------ | ---- | ------ |
| `DEBUG` | 调试模式 | `true`（开发）/ `false`（生产） |
| `SECRET_KEY` | JWT密钥 | 必须修改（≥32字符） |
| `DATABASE_URL` | 数据库连接 | `sqlite+aiosqlite:///./ai_teaching.db` |
| `DATABASE_POOL_SIZE` | 数据库连接池大小 | `20` |
| `DATABASE_MAX_OVERFLOW` | 连接池最大溢出 | `10` |
| `BACKEND_CORS_ORIGINS` | 允许的前端地址 | `http://localhost:5173` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access Token有效期 | `30`（分钟） |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh Token有效期 | `7`（天） |
| `ALGORITHM` | JWT算法 | `HS256` |
| `MINIO_ENDPOINT` | MinIO地址 | `localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO访问密钥 | `aiteachingminio` |
| `MINIO_SECRET_KEY` | MinIO秘密密钥 | `MinioLocal@2026Store` |
| `MINIO_BUCKET_NAME` | MinIO存储桶 | `ai-teaching` |
| `MINIO_SECURE` | MinIO是否使用HTTPS | `false` |
| `MAX_UPLOAD_SIZE` | 最大上传大小 | `104857600`（100MB） |
| `ALLOWED_EXTENSIONS` | 允许的文件扩展名 | `.pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.mp4,.mp3` |
| `BIGMODEL_API_KEY` | 智谱AI API密钥 | - |
| `BIGMODEL_API_BASE` | 智谱AI API地址 | `https://open.bigmodel.cn/api/paas/v4` |
| `BIGMODEL_MODEL` | AI模型名称 | `glm-4.7-flash` |
| `AI_MAX_CONTEXT_MESSAGES` | AI上下文消息数 | `20` |
| `LOG_LEVEL` | 日志级别 | `INFO` |
| `REDIS_URL` | Redis连接 | `redis://localhost:6379/0`（可选） |

生成安全的 SECRET_KEY：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📝 更新日志

### v1.0.0 (2026-06)

- ✨ 初始版本发布
- 📚 完整的课程管理（CRUD + 学生关联）
- 📝 教案设计（模板库 + 发布/归档工作流 + 导出）
- 👨‍🎓 学生管理 + 成长档案（能力雷达图）
- 📂 资源中心（文件上传/下载 + 本地/MinIO存储）
- 🤖 AI助手（多服务商 + Function Calling + SSE流式）
- 🔔 通知系统（批量操作 + 统计）
- 📊 报告统计（仪表盘 + 趋势分析）
- 🔐 用户认证（JWT + 密保 + 速率限制）
- 🎨 主题定制（预设 + 自定义 + 对比度检查）
- 🛡️ 安全防护（CSP/HSTS + 软删除 + 错误码体系）
- 🧪 测试覆盖（后端90%+，前端70%+，E2E核心功能）
- 🐳 Docker部署（开发 + 生产 + E2E环境）

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范

- 后端：遵循 Black + Flake8 代码风格，所有新功能需附带测试
- 前端：遵循 ESLint + Prettier 规范，TypeScript 严格模式
- 提交信息：使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- **GitHub Issues**: [提交问题](https://github.com/tu-MOLO/ai-teaching-platform/issues)
- **邮箱**: 2570055126@qq.com

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源发布。

---

<p align="center">
  Made with ❤️ by tu-MOLO
</p>

# AI教学平台

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python" alt="Python 3.11">
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Ant%20Design-5.12-0170FE?logo=antdesign" alt="Ant Design">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker" alt="Docker">
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
- [部署](#-部署)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## ✨ 功能特性

### 📚 课程管理

- 课程信息CRUD操作
- 课程状态跟踪（草稿/进行中/已结课）
- 课程分类和标签管理

### 📝 教案设计

- 教案模板库
- 教案创建、编辑、发布、归档
- 教案月度统计
- 教案导出（PDF / Word）

### 👨‍🎓 学生管理

- 学生信息管理
- 学习进度跟踪
- 学生成长档案
- 能力雷达图分析

### 📂 资源中心

- 文件上传/下载（拖拽上传）
- 默认本地文件存储
- 可选 MinIO 对象存储
- 资源标签和预览功能

### 🤖 AI 助手

- 多服务商支持：智谱 AI、OpenAI、DeepSeek、Moonshot、通义千问及自定义服务商
- 用户可自定义 API 密钥、接口地址和模型，支持连接测试
- 默认使用智谱 BigModel（glm-4.7-flash），可随时切换
- Function Calling 工具调用：直接操作课程、学生、教案、资源、通知等平台数据
- 多轮上下文记忆与流式响应
- 模块化对话标签（课程/学生/教案/数据/资源/通知）
- API 密钥加密存储，安全域名白名单校验

### 🔔 通知系统

- 站内通知列表
- 已读/未读状态管理

### 📊 报告统计

- 教案统计报告
- 课程与学生数据汇总

### 🔐 用户认证与权限

- JWT Token认证
- 教师单角色产品逻辑
- 本地注册、登录、改密、重置密码
- 安全密保问题验证
- 请求速率限制

### 🎨 主题定制

- 自定义主题色
- 主题预设管理
- 对比度警告与颜色历史

### 🛡️ 安全与运维

- 安全响应头（CSP / HSTS / X-Frame-Options 等）
- 请求体大小限制
- 软删除过滤器
- 健康检查端点（`/health`、`/health/detailed`）
- 结构化日志与请求追踪

---

## 🛠 技术栈

### 后端

| 技术                  | 版本    | 用途           |
| --------------------- | ------- | -------------- |
| **FastAPI**     | 0.109.2 | Web框架        |
| **SQLAlchemy**  | 2.0.27  | ORM            |
| **SQLite**      | -       | 本地默认数据库 |
| **PostgreSQL**  | 15      | 可选部署数据库 |
| **Alembic**     | 1.13.1  | 数据库迁移     |
| **MinIO**       | latest  | 对象存储       |
| **Redis**       | 7       | 缓存           |
| **Pydantic**    | 2.6.1   | 数据验证       |
| **PyJWT**       | 2.8.0   | JWT认证        |
| **httpx**       | 0.26.0  | 异步HTTP客户端 |
| **WeasyPrint**  | 59.0    | PDF导出        |
| **python-docx** | 0.8.11  | Word导出       |
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
| **Vitest**          | 4.1.7  | 前端测试框架   |

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
   docker-compose up -d
   ```
4. **运行数据库迁移**

   ```bash
   docker-compose --profile migration run --rm migration
   ```
5. **访问服务**

   - 前端页面: http://localhost
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs
   - MinIO控制台: http://localhost:9001

说明：

- Docker Compose 会同时启动前端（Nginx 托管）、后端及所有依赖服务
- 生产环境请使用 `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` 合并覆盖配置

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
├── backend/                    # 后端代码
│   ├── app/
│   │   ├── api/               # API路由
│   │   │   └── v1/            # API版本1
│   │   │       ├── ai.py          # AI助手接口
│   │   │       ├── ai_config.py   # AI配置接口
│   │   │       ├── auth.py        # 认证接口
│   │   │       ├── courses.py     # 课程接口
│   │   │       ├── dropdown_options.py  # 下拉选项接口
│   │   │       ├── lesson_plans.py # 教案接口
│   │   │       ├── lesson_templates.py  # 教案模板接口
│   │   │       ├── notifications.py  # 通知接口
│   │   │       ├── portfolios.py   # 成长档案接口
│   │   │       ├── reports.py      # 报告接口
│   │   │       ├── resources.py    # 资源接口
│   │   │       ├── students.py     # 学生接口
│   │   │       ├── tags.py         # 标签接口
│   │   │       └── users.py        # 用户接口
│   │   ├── core/              # 核心配置
│   │   │   ├── config.py          # 应用配置
│   │   │   ├── config_validator.py  # 配置验证
│   │   │   ├── database.py        # 数据库连接
│   │   │   ├── exceptions.py      # 异常定义
│   │   │   ├── logging.py         # 日志配置
│   │   │   ├── performance.py     # 性能缓存
│   │   │   ├── query_filters.py   # 查询过滤器（软删除）
│   │   │   ├── rate_limiter.py    # 请求限流
│   │   │   └── security.py        # 安全工具
│   │   ├── models/            # 数据模型
│   │   │   ├── ai.py / ai_config.py  # AI模型
│   │   │   ├── audit_log.py       # 审计日志
│   │   │   ├── course.py / student.py  # 课程/学生
│   │   │   ├── dropdown_option.py # 下拉选项
│   │   │   ├── lesson_plan.py / lesson_template.py  # 教案
│   │   │   ├── notification.py    # 通知
│   │   │   ├── portfolio.py       # 成长档案
│   │   │   ├── resource.py        # 资源
│   │   │   ├── tag.py             # 标签
│   │   │   └── user.py            # 用户
│   │   ├── schemas/           # Pydantic模式
│   │   ├── services/          # 业务逻辑
│   │   │   ├── ai.py / ai_config.py  # AI服务
│   │   │   ├── course.py / student.py  # 课程/学生
│   │   │   ├── dropdown_option.py # 下拉选项
│   │   │   ├── export.py          # 导出服务
│   │   │   ├── lesson_plan.py     # 教案
│   │   │   ├── notification.py    # 通知
│   │   │   ├── portfolio.py       # 成长档案
│   │   │   ├── report.py          # 报告
│   │   │   ├── resource.py / storage.py  # 资源/存储
│   │   │   └── tag.py             # 标签
│   │   └── utils/             # 工具函数
│   ├── alembic/               # 数据库迁移
│   ├── scripts/               # 实用脚本
│   │   ├── create_user.py         # 创建用户
│   │   ├── full_acceptance.py     # 完整验收
│   │   ├── init_data.py           # 初始化数据
│   │   ├── init_dropdown_options.py  # 初始化下拉选项
│   │   ├── init_tags.py           # 初始化标签
│   │   └── init_templates.py      # 初始化教案模板
│   ├── tests/                 # 测试文件
│   ├── .env.example           # 后端环境变量示例
│   ├── alembic.ini            # Alembic配置
│   ├── Dockerfile             # 后端Docker配置
│   ├── pyproject.toml         # Python项目配置
│   └── requirements.txt       # Python依赖
│
├── frontend/                   # 前端代码
│   ├── src/
│   │   ├── components/        # 可复用组件
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
│   │   ├── constants/         # 全局常量
│   │   ├── hooks/             # 自定义Hooks
│   │   ├── pages/             # 页面组件
│   │   │   ├── AIAssistant/       # AI助手页面
│   │   │   ├── Courses/           # 课程页面
│   │   │   ├── Dashboard/         # 仪表盘
│   │   │   ├── LessonPlanner/     # 教案页面
│   │   │   ├── Login/ / Register/ # 登录/注册
│   │   │   ├── Notifications/     # 通知页面
│   │   │   ├── Portfolio/         # 成长档案页面
│   │   │   ├── Profile/           # 个人中心
│   │   │   ├── Reports/           # 报告页面
│   │   │   ├── ResourceCenter/    # 资源中心页面
│   │   │   ├── Settings/          # 设置页面
│   │   │   └── Students/          # 学生页面
│   │   ├── router/            # 路由配置
│   │   ├── services/          # API服务
│   │   ├── stores/            # 状态管理
│   │   ├── styles/            # 全局样式
│   │   ├── test/              # 测试配置
│   │   ├── types/             # TypeScript类型
│   │   └── utils/             # 工具函数
│   ├── .eslintrc.cjs          # ESLint配置
│   ├── .prettierrc            # Prettier配置
│   ├── Dockerfile             # 前端Docker配置
│   ├── index.html             # HTML入口
│   ├── nginx.conf             # Nginx配置
│   ├── package.json           # Node依赖
│   ├── tsconfig.json          # TypeScript配置
│   └── vite.config.ts         # Vite构建配置
│
├── project_suggestions/        # 项目优化建议文档
├── .env.docker.example         # Docker环境变量示例
├── .gitignore                  # Git忽略规则
├── .pre-commit-config.yaml     # Pre-commit钩子配置
├── LICENSE                     # MIT许可证
├── README.md                   # 项目文档
├── docker-compose.yml          # Docker编排
├── docker-compose.prod.yml     # 生产环境覆盖配置
├── start.bat                   # Windows一键启动
└── start.sh                    # macOS/Linux一键启动
```

---

## 📚 API文档

启动后端服务后，可以通过以下地址访问API文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 主要API端点

| 端点                             | 描述         | 认证 |
| -------------------------------- | ------------ | ---- |
| `POST /api/v1/auth/login`      | 用户登录     | 否   |
| `POST /api/v1/auth/register`   | 用户注册     | 否   |
| `GET /api/v1/auth/me`          | 获取当前用户 | 是   |
| `GET /api/v1/users`            | 用户列表     | 是   |
| `GET /api/v1/courses`          | 课程列表     | 是   |
| `POST /api/v1/lesson-plans`    | 创建教案     | 是   |
| `GET /api/v1/lesson-templates` | 教案模板列表 | 是   |
| `GET /api/v1/students`         | 学生列表     | 是   |
| `GET /api/v1/portfolios`       | 成长档案     | 是   |
| `GET /api/v1/resources`        | 资源列表     | 是   |
| `GET /api/v1/tags`             | 标签列表     | 是   |
| `GET /api/v1/notifications`    | 通知列表     | 是   |
| `GET /api/v1/reports`          | 报告数据     | 是   |
| `GET /api/v1/dropdown-options` | 下拉选项     | 是   |
| `POST /api/v1/ai/chat`         | AI对话       | 是   |
| `GET /api/v1/ai/config`        | AI配置       | 是   |
| `GET /health`                  | 健康检查     | 否   |
| `GET /health/detailed`         | 详细健康检查 | 否   |

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
pytest tests/test_auth_api.py

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

### 测试覆盖率

项目已配置测试覆盖率检查，确保核心功能都有相应的测试用例。后端覆盖率阈值设定为 90%。

---

## 🚢 部署

### 生产环境部署

1. **更新环境变量**

   - 修改 `SECRET_KEY`
   - 修改数据库与对象存储口令
   - 设置正确的 `BACKEND_CORS_ORIGINS`
2. **构建生产镜像**

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
3. **配置Nginx**

   - 启用HTTPS
   - 配置反向代理
4. **监控与日志**

   - 配置日志收集
   - 设置健康检查

### 环境变量说明

| 变量名                      | 说明             | 默认值                               |
| --------------------------- | ---------------- | ------------------------------------ |
| `SECRET_KEY`              | JWT密钥          | 必须修改                             |
| `DATABASE_URL`            | 数据库连接       | -                                    |
| `MINIO_ENDPOINT`          | MinIO地址        | minio:9000                           |
| `REDIS_URL`               | Redis连接        | redis://redis:6379/0                 |
| `BACKEND_CORS_ORIGINS`    | 允许的前端地址   | http://localhost:3000                |
| `BIGMODEL_API_KEY`        | 智谱AI API密钥   | -                                    |
| `BIGMODEL_API_BASE`       | 智谱AI API地址   | https://open.bigmodel.cn/api/paas/v4 |
| `BIGMODEL_MODEL`          | AI模型名称       | glm-4.7-flash                        |
| `AI_MAX_CONTEXT_MESSAGES` | AI上下文消息数   | 20                                   |
| `AI_REQUEST_RATE_LIMIT`   | AI请求速率限制   | 30                                   |
| `MAX_UPLOAD_SIZE`         | 最大上传大小     | 104857600 (100MB)                    |
| `ALLOWED_EXTENSIONS`      | 允许的文件扩展名 | .pdf,.doc,.docx,...                  |

---

📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- **GitHub Issues**: [提交问题](https://github.com/tu-MOLO/ai-teaching-platform/issues)
- **邮箱**: 2570055126@qq.com

---

<p align="center">
  Made with ❤️ by tu-MOLO
</p>

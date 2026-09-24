# AI教学平台

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python" alt="Python 3.11+">
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
  - [一键本地启动](#一键本地启动)
- [API文档](#-api文档)
- [测试](#-测试)
- [部署](#-部署)
- [更新日志](#-更新日志)
- [贡献指南](#-贡献指南)
- [联系方式](#-联系方式)
- [许可证](#-许可证)

---

## ✨ 功能特性

### 📚 课程管理

- 课程信息 CRUD 操作
- 课程状态跟踪（草稿 / 进行中 / 已结课）
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

- 文件上传 / 下载（拖拽上传）
- 默认本地文件存储，可选 MinIO 对象存储
- 资源标签和预览功能
- 文件类型校验与大小限制（100MB）

### 🤖 AI 助手

- 多服务商支持：智谱 AI、OpenAI、DeepSeek、Moonshot、通义千问及自定义服务商
- 用户可自定义 API 密钥、接口地址和模型，支持连接测试
- 默认使用智谱 BigModel（glm-4.7-flash），可随时切换
- Function Calling 工具调用：直接操作课程、学生、教案、资源、通知等平台数据
- 多轮上下文记忆与流式响应（SSE）
- 模块化对话标签（课程 / 学生 / 教案 / 数据 / 资源 / 通知）
- API 密钥加密存储（cryptography）+ 安全域名白名单校验
- 对话历史管理（创建、重命名、归档、批量删除）

### 🔔 通知系统

- 站内通知列表
- 已读 / 未读状态管理
- 批量标记已读、一键全部已读
- 未读数量统计

### 📊 报告统计

- 仪表盘统计数据
- 教案统计报告
- 课程与学生数据汇总
- 月度趋势分析

### 🔐 用户认证与权限

- JWT Token 认证（Access Token 30 分钟 / Refresh Token 7 天）
- 教师单角色产品逻辑
- 本地注册、登录、改密、重置密码
- 密码重置双通道：密保问题验证 或 邮箱验证码（SMTP 发送，10 分钟有效）
- Refresh Token 通过 HttpOnly Cookie 传递（防 XSS）
- 请求速率限制
- 账户锁定（5 次失败登录后锁定 30 分钟）
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

**核心框架与依赖**（以 `backend/requirements.txt` 为准）

| 技术                        | 版本    | 用途                 |
| --------------------------- | ------- | -------------------- |
| **FastAPI**           | 0.109.2 | Web 框架             |
| **Uvicorn**           | 0.27.1  | ASGI 服务器          |
| **SQLAlchemy**        | 2.0.40  | ORM（异步）          |
| **Alembic**           | 1.15.2  | 数据库迁移           |
| **Pydantic**          | 2.10.4  | 数据验证             |
| **Pydantic Settings** | 2.7.0   | 配置管理             |
| **PyJWT**             | 2.8.0   | JWT 认证             |
| **bcrypt**            | 4.2.1   | 密码哈希             |
| **httpx**             | 0.26.0  | 异步 HTTP 客户端     |
| **aiohttp**           | 3.10.11 | 异步 HTTP 客户端     |
| **orjson**            | 3.10.12 | JSON 序列化          |
| **cryptography**      | 44.0.0  | API 密钥加密         |
| **WeasyPrint**        | 59.0    | PDF 导出             |
| **python-docx**       | 0.8.11  | Word 导出            |
| **minio**             | 7.2.4   | MinIO 客户端         |
| **redis**             | 5.0.1   | Redis 客户端         |
| **aiosmtplib**        | 3.0.1   | SMTP 邮件发送        |
| **python-multipart**  | 0.0.20  | 表单解析（文件上传） |
| **python-dotenv**     | 1.0.1   | 环境变量加载         |
| **Pytest**            | 7.4.4   | 测试框架（dev）      |

**基础设施**

| 技术                 | 版本                     | 用途              |
| -------------------- | ------------------------ | ----------------- |
| **SQLite**     | -（aiosqlite 0.19.0）    | 本地默认数据库    |
| **PostgreSQL** | 15（postgres:15-alpine） | Docker 部署数据库 |
| **MinIO**      | RELEASE.2025-06-13       | 对象存储（可选）  |
| **Redis**      | 7（redis:7-alpine）      | 缓存（可选）      |

### 前端

| 技术                        | 版本   | 用途            |
| --------------------------- | ------ | --------------- |
| **React**             | 18.2.0 | UI 框架         |
| **React DOM**         | 18.2.0 | DOM 渲染        |
| **TypeScript**        | 5.2.2  | 类型系统        |
| **Ant Design**        | 5.12.0 | UI 组件库       |
| **@ant-design/icons** | 5.2.0  | 图标库          |
| **Vite**              | 5.0.8  | 构建工具        |
| **Zustand**           | 4.4.0  | 状态管理        |
| **ECharts**           | 5.4.0  | 图表库          |
| **echarts-for-react** | 3.0.0  | React 图表封装  |
| **Axios**             | 1.6.0  | HTTP 客户端     |
| **React Router**      | 6.21.0 | 路由            |
| **react-md-editor**   | 4.0.0  | Markdown 编辑器 |
| **react-dropzone**    | 14.2.0 | 文件拖拽上传    |
| **dayjs**             | 1.11.0 | 日期处理        |
| **Vitest**            | 4.1.7  | 前端测试框架    |
| **Playwright**        | 1.52.0 | E2E 测试框架    |
| **Testing Library**   | 16.3.2 | 组件测试        |

---

## 🚀 快速开始

### 环境要求

- **Docker** 与 **Docker Compose**（推荐）
- 或 **Python 3.11+** 与 **Node.js 18+**

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
   # 按需修改 .env 与 backend/.env（至少修改所有 SECRET_KEY / PASSWORD）
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

   - 前端页面：http://localhost
   - 后端 API：http://localhost:8000
   - API 文档：http://localhost:8000/docs
   - MinIO 控制台：http://localhost:9001

说明：Docker Compose 会同时启动前端（Nginx 托管）、后端及所有依赖服务（PostgreSQL / MinIO / Redis）。

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

# 安装运行依赖
pip install -r requirements.txt
# 如需运行测试与代码检查，额外安装开发依赖
pip install -r requirements-dev.txt

# 安装系统依赖（PDF 导出需要，WeasyPrint 依赖）
# Windows: 下载安装 GTK3 Runtime https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
# macOS: brew install cairo pango gdk-pixbuf libffi
# Linux (Debian/Ubuntu): sudo apt-get install libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info

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

前端服务将在 http://localhost:5173 启动。

### 一键本地启动

仓库根目录已提供：

- Windows：`start.bat`
- macOS / Linux：`start.sh`

脚本会自动：

- 创建虚拟环境并安装依赖
- 执行数据库迁移
- 初始化标签、教案模板、下拉选项及种子数据
- 启动前后端开发服务

首次初始化默认教师账号：

- 用户名：`teacher`
- 邮箱：`teacher@example.com`
- 密码：`Teacher@Local2026!`

建议首次登录后立即修改密码。

---

## 📚 API文档

启动后端服务（需 `DEBUG=True`）后可访问交互式文档：

- **Swagger UI**：http://localhost:8000/docs
- **ReDoc**：http://localhost:8000/redoc

完整接口清单、统一响应格式及请求/响应示例见 [docs/API.md](docs/API.md)。接口以 `/api/v1` 为 Base URL，除登录、注册、健康检查外均需 Bearer Token（JWT）认证。

---

## 🧪 测试

### 运行后端测试

```bash
cd backend

# 安装开发依赖（首次）
pip install -r requirements-dev.txt

# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=app --cov-report=html

# 运行特定测试文件
pytest tests/api/test_auth_api.py

# 运行测试并生成 HTML 报告
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

# 运行所有 E2E 测试
npm run test:e2e

# 运行 E2E 测试（UI 模式）
npm run test:e2e:ui

# 查看 E2E 测试报告
npm run test:e2e:report
```

### 测试覆盖率

- 后端覆盖率阈值：**90%**（配置于 `pyproject.toml`）
- 前端覆盖率阈值：**70%**（lines / functions / statements，branches 60%，配置于 `vite.config.ts`）
- E2E 测试覆盖：认证、课程、学生、教案、资源、通知、成长档案、报告、AI 助手、个人中心、设置等核心功能

---

## 🚢 部署

生产环境通过合并 `docker-compose.prod.yml` 覆盖配置启动（资源限制、日志轮转等），详细的部署步骤、环境变量说明、数据备份恢复与故障排查请参见 [docs/operations.md](docs/operations.md)。

---

## 📝 更新日志

### v1.1.0 (2026-07)

- 🤖 AI 助手：对话归档/取消归档、批量删除、前端会话筛选
- 🔐 用户认证：新增邮箱验证码（注册/密码重置）
- 🧪 E2E 测试扩充（认证、课程、教案、成长档案、资源、设置、学生）
- ⚙️ 后端优化：存储服务重构、启动逻辑扩展、性能与稳定性提升
- 🎨 前端优化：课程/学生表单、仪表盘、通知、个人中心、报告
- 🐍 支持 Python 3.13
- 🧹 依赖与格式整理、类型提示修复、测试补充

### v1.0.0 (2026-06)

- ✨ 初始版本发布（完整功能见上文「功能特性」）

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范

- 后端：遵循 Black + isort + Flake8 代码风格，所有新功能需附带测试
- 前端：遵循 ESLint + Prettier 规范，TypeScript 严格模式
- 提交信息：使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- **GitHub Issues**: [提交问题](https://github.com/tu-MOLO/ai-teaching-platform/issues)

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源发布。

---

<p align="center">
  Made with ❤️ by tu-MOLO
</p>

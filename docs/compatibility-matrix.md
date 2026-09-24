# AI教学平台 — 版本兼容性矩阵

## 1. 运行时环境

### 1.1 Python

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| Python 3.11 | ✅ 完全支持 | 推荐版本，Dockerfile 基准 |
| Python 3.12 | ✅ 完全支持 | — |
| Python 3.13 | ✅ 完全支持 | — |
| Python 3.10 | ❌ 不支持 | `requires-python >= 3.11` |
| Python 3.9 | ❌ 不支持 | 类型注解语法不兼容 |

### 1.2 Node.js

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| Node.js 18 | ✅ 完全支持 | Dockerfile 使用 `node:18-alpine` |
| Node.js 20 | ✅ 推荐支持 | 建议验证 |
| Node.js 22 | ⚠️ 未验证 | 理论兼容 |
| Node.js 16 | ❌ 不支持 | Vite 5 需要 18+ |

### 1.3 Docker

| 组件 | 最低版本 | 推荐版本 | 备注 |
|------|----------|----------|------|
| Docker Engine | 20.10+ | 24.0+ | 需 BuildKit 支持 |
| Docker Compose | 2.0+ | 2.20+ | 需 `profiles` 功能支持 |
| Docker Buildx | 0.10+ | 0.12+ | 需 BuildKit 支持多平台构建 |

---

## 2. 数据库

### 2.1 PostgreSQL

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| PostgreSQL 15 | ✅ 生产推荐 | docker-compose 默认 |
| PostgreSQL 16 | ⚠️ 未验证 | 理论兼容 SQLAlchemy 2.0 |
| PostgreSQL 14 | ⚠️ 未验证 | 理论兼容 |
| PostgreSQL 13 | ❌ 不确定 | 部分索引特性需要 14+ |

### 2.2 SQLite

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| SQLite 3.35+ | ✅ 开发环境 | `aiosqlite` 依赖 |
| SQLite 3.x (内建) | ✅ | Python 标准库自带 |

> 开发环境默认 SQLite，生产环境推荐 PostgreSQL。

---

## 3. 中间件与服务

### 3.1 Redis

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| Redis 7 (Alpine) | ✅ 生产推荐 | docker-compose 默认 |
| Redis 6 | ⚠️ 未验证 | ACL 语法可能存在差异 |
| 无 Redis | ✅ 开发环境 | 限流/缓存降级到内存 |

### 3.2 MinIO

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| MinIO RELEASE.2025-06-13T14-13-47Z | ✅ 生产推荐 | docker-compose 固定版本 |
| MinIO RELEASE.2024+ | ✅ 预期兼容 | S3 API 稳定 |
| 本地文件系统 | ✅ 开发环境 | 替代方案，无需MinIO |

### 3.3 Nginx

| 版本 | 支持状态 | 备注 |
|------|----------|------|
| Nginx 1.25 Alpine | ✅ 生产推荐 | Dockerfile 使用 |
| Nginx 1.24 | ✅ 预期兼容 | 稳定版 |
| Nginx 1.22 | ⚠️ 未验证 | gzip_static/brotli 支持需要额外模块 |

---

## 4. 操作系统

### 4.1 服务端（Docker Host）

| 操作系统 | 支持状态 | 备注 |
|----------|----------|------|
| Ubuntu 22.04+ | ✅ 完全支持 | 推荐 |
| Debian 12+ | ✅ 完全支持 | — |
| CentOS/RHEL 8+ | ✅ 完全支持 | — |
| macOS 12+ | ✅ 开发支持 | Docker Desktop |
| Windows 10/11 | ✅ 开发支持 | Docker Desktop + WSL2 |

### 4.2 客户端（浏览器）

| 浏览器 | 最低版本 | 推荐版本 | 备注 |
|--------|----------|----------|------|
| Chrome | 90+ | 120+ | 生产推荐，E2E测试基准 |
| Edge | 90+ | 120+ | Chromium内核 |
| Firefox | 90+ | 120+ | 功能完整 |
| Safari | 15+ | 17+ | macOS/iOS |
| IE 11 | ❌ | ❌ | 不支持 |

---

## 5. Python 依赖兼容性

### 5.1 核心框架

| 库 | 锁定版本 | 最低兼容版本 | 最新稳定版 |
|-----|----------|-------------|-----------|
| `fastapi` | 0.109.2 | 0.100.0 | 0.115+ |
| `uvicorn` | 0.27.1 | 0.20.0 | 0.34+ |
| `sqlalchemy` | 2.0.27 | 2.0.0 | 2.0.36+ |
| `alembic` | 1.13.1 | 1.10.0 | 1.14+ |
| `pydantic` | 2.6.1 | 2.0.0 | 2.10+ |
| `pydantic-settings` | 2.1.0 | 2.0.0 | 2.7+ |

### 5.2 安全与认证

| 库 | 锁定版本 | 说明 |
|-----|----------|------|
| `PyJWT` | 2.8.0 | JWT令牌签发与验证 |
| `bcrypt` | 4.2.1 | 密码哈希（≥4.0.0 支持 PEP 517） |
| `cryptography` | 44.0.0 | Fernet加密，API密钥保护 |

### 5.3 外部客户端

| 库 | 锁定版本 | 说明 |
|-----|----------|------|
| `httpx` | 0.26.0 | 异步HTTP客户端 |
| `aiohttp` | 3.9.3 | 异步HTTP客户端 |
| `minio` | 7.2.4 | S3兼容对象存储 |
| `redis` | 5.0.1 | Redis客户端 |

### 5.4 导出功能

| 库 | 锁定版本 | 系统依赖 | 说明 |
|-----|----------|----------|------|
| `weasyprint` | 59.0 | cairo, pango, gdk-pixbuf, fontconfig | PDF导出 |
| `python-docx` | 0.8.11 | 无 | Word导出 |

---

## 6. 前端依赖兼容性

### 6.1 核心框架

| 库 | 版本范围 | 说明 |
|-----|----------|------|
| `react` | ^18.2.0 | 推荐 18.2+ |
| `react-dom` | ^18.2.0 | 与 react 同步 |
| `react-router-dom` | ^6.21.0 | v6 API 与 v5 不兼容 |
| `typescript` | ^5.2.2 | strict 模式 |

### 6.2 UI与组件

| 库 | 版本范围 | 说明 |
|-----|----------|------|
| `antd` | ^5.12.0 | v5 与 v4 API 差异大 |
| `@ant-design/icons` | ^5.2.0 | 与 antd 5 配套 |
| `echarts` | ^5.4.0 | 可能升级到 5.5+ |
| `echarts-for-react` | ^3.0.0 | — |
| `@uiw/react-md-editor` | ^4.0.0 | Markdown编辑器 |

### 6.3 状态管理与工具

| 库 | 版本范围 | 说明 |
|-----|----------|------|
| `zustand` | ^4.4.0 | v4 API，v5 已发布需评估迁移 |
| `axios` | ^1.6.0 | — |
| `dayjs` | ^1.11.0 | 替代 moment.js |
| `react-dropzone` | ^14.2.0 | 文件拖拽上传 |

### 6.4 构建与测试

| 库 | 版本范围 | 说明 |
|-----|----------|------|
| `vite` | ^5.0.8 | v6 已发布，需评估 |
| `@vitejs/plugin-react` | ^5.0.0 | — |
| `vitest` | ^4.1.7 | — |
| `@playwright/test` | ^1.52.0 | E2E测试 |
| `@testing-library/react` | ^16.3.2 | 组件测试 |
| `vite-plugin-compression` | ^0.5.1 | gzip/brotli 预压缩 |

---

## 7. AI 服务商兼容性

| 服务商 | API 格式 | 支持状态 | 备注 |
|--------|----------|----------|------|
| 智谱 BigModel (默认) | OpenAI兼容 | ✅ | glm-4.7-flash |
| OpenAI | OpenAI原生 | ✅ | 需配置 api_base |
| DeepSeek | OpenAI兼容 | ✅ | — |
| SiliconFlow | OpenAI兼容 | ✅ | — |
| Moonshot | OpenAI兼容 | ✅ | — |
| 通义千问 (DashScope) | OpenAI兼容 | ✅ | — |
| 自定义服务商 | OpenAI兼容 | ✅ | API Base可自定义 |

---

## 9. 升级路径建议

### 9.1 短期（v1.0.x）

| 依赖 | 当前版本 | 建议升级 | 风险评估 |
|------|----------|----------|----------|
| `fastapi` | 0.109.2 | 0.115.x | 低 — API 稳定 |
| `uvicorn` | 0.27.1 | 0.34.x | 低 — 内部实现改进 |
| `pydantic` | 2.6.1 | 2.10.x | 中 — v2 API稳定但需验证 |
| `vite` | 5.0.8 | 5.4.x | 低 — 向前兼容 |
| `antd` | 5.12.0 | 5.22.x | 低 — 补丁版本兼容 |

### 9.2 中期（v1.1+）

| 依赖 | 建议升级 | 风险评估 |
|------|----------|----------|
| Python 3.13 | 补充版本验证 | 中 — `requires-python` 需更新 |
| `zustand` 5.x | 评估API变化 | 中 — 破坏性变更 |
| `vite` 6.x | 评估新特性 | 低 — 构建工具 |
| `@testing-library/react` 16+ | 保持更新 | 低 — 测试工具 |

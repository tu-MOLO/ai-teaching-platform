# AI教学平台 — 运维手册

## 1. 服务架构

### 1.1 服务组件清单

| 服务          | 技术                 | 默认端口   | 用途                 |
| ------------- | -------------------- | ---------- | -------------------- |
| `db`        | PostgreSQL 15 Alpine | 5432       | 主数据库             |
| `redis`     | Redis 7 Alpine       | 6379       | 缓存/限流            |
| `minio`     | MinIO (latest)       | 9000/+9001 | 对象存储             |
| `backend`   | FastAPI + Uvicorn    | 8000       | API服务              |
| `frontend`  | Nginx + React SPA    | 80         | 前端入口/反向代理    |
| `migration` | Alembic              | —         | 数据库迁移（一次性） |

### 1.2 网络拓扑

```
用户浏览器 → Nginx(:80) → /api/* → Backend(:8000)
                                    │
                                    ├── PostgreSQL(:5432)
                                    ├── Redis(:6379)
                                    └── MinIO(:9000)
```

所有服务通过 `ai-teaching-network` (bridge) 网络互通。

---

## 2. 启动与停止

### 2.1 开发环境

```bash
# 启动所有服务
docker compose up -d

# 首次启动或schema变更后运行迁移
docker compose --profile migration run --rm migration

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f backend
docker compose logs -f --tail=100 frontend
```

### 2.2 生产环境

```bash
# 合并生产覆盖配置启动
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 运行数据库迁移
docker compose --profile migration run --rm migration
```

### 2.3 停止服务

```bash
# 停止所有服务（保留数据卷）
docker compose down

# 停止并删除数据卷（清空所有数据）
docker compose down -v
```

### 2.4 重启单个服务

```bash
docker compose restart backend
docker compose restart frontend
```

---

## 3. 健康检查

### 3.1 端点

| 端点                     | 用途                              | 访问控制 |
| ------------------------ | --------------------------------- | -------- |
| `GET /health`          | 基础存活检查（数据库+缓存连通性） | 公开     |
| `GET /health/detailed` | 详细检查（Python版本、配置信息）  | 内网IP   |
| `GET /`                | API基本信息                       | 公开     |

### 3.2 手动检查

```bash
# 基础健康检查
curl http://localhost:8000/health

# Docker 容器健康状态
docker compose ps

# 检查数据库连接
docker compose exec db pg_isready -U postgres

# 检查 Redis 连接
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" ping
```

### 3.3 健康检查响应示例

```json
{
  "status": "healthy",
  "app": "AI Teaching Platform",
  "version": "1.0.0",
  "timestamp": "2026-06-15T10:00:00+00:00",
  "checks": {
    "database": {"status": "healthy", "message": "Database connection OK"},
    "cache": {"status": "healthy", "message": "Cache OK"}
  }
}
```

---

## 4. 日志管理

### 4.1 日志位置

| 日志类型       | 位置                                        | 说明          |
| -------------- | ------------------------------------------- | ------------- |
| 后端应用日志   | `backend_logs` Docker卷 → `/app/logs/` | 按日切割      |
| Docker容器日志 | `docker compose logs`                     | stdout/stderr |
| Nginx访问日志  | `docker compose logs frontend`            | 容器标准输出  |
| Nginx错误日志  | `docker compose logs frontend`            | 容器标准错误  |

### 4.2 日志级别

通过环境变量 `LOG_LEVEL` 控制：`DEBUG` / `INFO` / `WARNING` / `ERROR`

```bash
# 生产环境建议 INFO，问题排查时临时设为 DEBUG
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -e LOG_LEVEL=DEBUG up -d backend
```

### 4.3 日志查看命令

```bash
# 实时查看后端日志
docker compose logs -f backend

# 查看最近100行
docker compose logs --tail=100 backend

# 按时间过滤（Docker不原生支持，可结合grep）
docker compose logs backend | grep "2026-06-15"

# 导出日志
docker compose logs backend > backend_logs_$(date +%Y%m%d).txt
```

### 4.4 日志轮转

- 后端日志文件按天切割，保留30天
- Docker日志依赖Docker daemon的日志驱动配置
- 生产环境建议配置 `max-size` 和 `max-file`：

```yaml
# docker-compose.prod.yml 中添加
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "10"
```

---

## 5. 数据备份与恢复

### 5.1 PostgreSQL 备份

```bash
# 导出完整数据库
docker compose exec db pg_dump -U postgres ai_teaching \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 仅导出结构（不含数据）
docker compose exec db pg_dump -U postgres --schema-only ai_teaching \
  > schema_$(date +%Y%m%d).sql

# 仅导出数据
docker compose exec db pg_dump -U postgres --data-only ai_teaching \
  > data_$(date +%Y%m%d).sql
```

### 5.2 PostgreSQL 恢复

```bash
# 恢复前确保数据库存在，先清空或重新创建
docker compose exec -T db psql -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS ai_teaching;"
docker compose exec -T db psql -U postgres -d postgres \
  -c "CREATE DATABASE ai_teaching;"

# 导入备份
docker compose exec -T db psql -U postgres ai_teaching < backup_20260615.sql

# 恢复后重新运行迁移（确保schema版本一致）
docker compose --profile migration run --rm migration
```

### 5.3 MinIO 文件备份

```bash
# 使用 mc (MinIO Client) 镜像备份
docker run --rm --network ai-teaching-platform_ai-teaching-network \
  -v $(pwd)/minio_backup:/backup \
  minio/mc:latest \
  mc mirror minio http://minio:9000 /backup

# 或直接备份 Docker 卷
docker run --rm -v ai-teaching-platform_minio_data:/data \
  -v $(pwd)/minio_backup:/backup \
  alpine tar czf /backup/minio_data_$(date +%Y%m%d).tar.gz -C /data .
```

### 5.4 定时备份 (crontab)

```bash
# 每天凌晨2点备份
0 2 * * * cd /opt/ai-teaching-platform && \
  docker compose exec -T db pg_dump -U postgres ai_teaching > \
  /backup/db/ai_teaching_$(date +\%Y\%m\%d).sql

# 每天凌晨3点备份 MinIO
0 3 * * * cd /opt/ai-teaching-platform && \
  docker run --rm --network ai-teaching-platform_ai-teaching-network \
  -v /backup/minio:/backup minio/mc:latest \
  mc mirror minio http://minio:9000 /backup

# 自动清理超过30天的备份
0 4 * * * find /backup/db -name "*.sql" -mtime +30 -delete
```

---

## 6. 配置管理

### 6.1 配置优先级

1. `.env` 文件（Docker Compose根目录）
2. `docker-compose.yml` 中的 `environment` 默认值
3. `backend/.env`（本地开发时后端直接读取）

### 6.2 关键配置项

| 配置项                   | 说明           | 生产环境要求            |
| ------------------------ | -------------- | ----------------------- |
| `SECRET_KEY`           | JWT签名密钥    | 至少32字符随机字符串    |
| `DB_PASSWORD`          | 数据库密码     | 强密码，不使用默认值    |
| `MINIO_SECRET_KEY`     | MinIO密钥      | 强密码，不使用默认值    |
| `REDIS_PASSWORD`       | Redis密码      | 强密码，不使用默认值    |
| `DEBUG`                | 调试模式       | 必须设为 `false`      |
| `BACKEND_CORS_ORIGINS` | 允许的前端域名 | 精确配置生产域名        |
| `LOG_LEVEL`            | 日志级别       | `INFO` 或 `WARNING` |

### 6.3 生成安全密钥

```bash
# 生成 JWT SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# 生成数据库密码
openssl rand -base64 24

# 生成 MinIO 密钥
openssl rand -hex 20
```

### 6.4 启动前安全检查

应用启动时会自动执行 `config_validator.py` 中的验证：

- **生产环境** (`DEBUG=false`)：严格验证，失败时**阻止启动**
- **开发环境** (`DEBUG=true`)：宽松验证，仅输出警告

验证项包括：

- SECRET_KEY 长度和复杂度
- 数据库密码强度
- MinIO 密码强度
- CORS 配置完整性
- Token过期时间合理性

---

## 7. 数据库迁移

### 7.1 运行迁移

```bash
# 升级到最新版本
docker compose --profile migration run --rm migration

# 查看当前版本
docker compose exec backend alembic current

# 查看迁移历史
docker compose exec backend alembic history

# 回滚一个版本（谨慎使用）
docker compose exec backend alembic downgrade -1
```

### 7.2 生成新迁移

```bash
# 进入后端容器
docker compose exec backend bash

# 生成自动迁移
alembic revision --autogenerate -m "describe_your_change"

# 手动创建迁移文件
alembic revision -m "describe_your_change"
```

### 7.3 迁移版本记录

| 版本号           | 描述                           |
| ---------------- | ------------------------------ |
| `a6187dbdd1d8` | 添加学生状态字段               |
| `b234c5e6f789` | 修复学生用户ID和课程状态       |
| `c345d6e7f890` | 规范化旧管理员角色             |
| `c456f7a8b901` | 添加课程学生关联表             |
| `d456e7f8a901` | 添加部分唯一索引（软删除友好） |
| `d567e8f9a012` | 添加AI助手相关表               |
| `d678e9f0a123` | 删除RBAC权限表                 |
| `e789f0a1b234` | 添加密保问题字段               |

---

## 8. 故障排查

### 8.1 服务无法启动

```bash
# 检查所有容器状态
docker compose ps -a

# 查看具体容器日志
docker compose logs backend
docker compose logs db

# 检查端口占用
netstat -tlnp | grep -E "80|5432|6379|8000|9000"
```

### 8.2 数据库连接失败

```bash
# 检查数据库容器是否健康
docker compose ps db

# 测试数据库连接
docker compose exec db pg_isready -U postgres

# 检查后端日志中的数据库错误
docker compose logs backend | grep -i "database\|connection\|timeout"
```

常见原因：

- 数据库容器尚未完成初始化（等待healthcheck通过）
- `DATABASE_URL` 格式不正确
- 数据库密码不匹配
- 网络问题（检查 docker network）

### 8.3 前端页面空白/404

```bash
# 检查前端容器
docker compose logs frontend

# 验证 Nginx 配置
docker compose exec frontend nginx -t

# 检查 API 代理是否正常
curl -v http://localhost/api/v1/health
```

常见原因：

- 前端构建失败（检查 `npm run build` 日志）
- API 后端未就绪
- SPA路由未正确配置（Nginx `try_files`）

### 8.4 文件上传失败

```bash
# 检查 MinIO 连接
curl http://localhost:9000/minio/health/live

# 检查存储桶是否存在
docker compose exec minio mc ls minio

# 创建存储桶（如果不存在）
docker compose exec minio mc mb minio/ai-teaching
```

常见原因：

- MinIO 服务未就绪
- 存储桶未创建
- 文件超过大小限制（默认100MB）
- 文件类型不在白名单中

### 8.5 AI 对话失败

```bash
# 查看后端日志中的AI相关错误
docker compose logs backend | grep -i "ai\|model\|api.key\|connection"

# 测试 AI 配置连接（需先获取 token）
TOKEN="your_access_token_here"
curl -X POST http://localhost:8000/api/v1/ai/config/test \
  -H "Authorization: Bearer $TOKEN"
```

常见原因：

- API Key 未配置或无效
- API 端点不可达（网络/防火墙）
- 模型名称错误
- 速率限制触发

### 8.6 PDF 导出失败 (Docker环境)

如果运行在 Docker 中且 PDF 导出失败，检查 weasyprint 系统依赖是否安装：

```bash
docker compose exec backend python -c "import weasyprint; print(weasyprint.__version__)"
```

如果报错，说明系统依赖缺失，需要重建镜像（确保 Dockerfile 包含 cairo/pango/gdk-pixbuf 等库）。

---

## 9. 性能监控

### 9.0 服务等级目标（SLO）

| 指标 | 目标值 | 测量方式 | 说明 |
|------|--------|----------|------|
| API 可用性 | ≥ 99.5% | 健康检查端点监控 | 月度统计 |
| API P95 响应时间 | ≤ 500ms | `X-Process-Time` 响应头 | 不含 AI 对话/文件上传等长耗时操作 |
| API P99 响应时间 | ≤ 2s | 同上 | — |
| 页面首屏加载时间 | ≤ 3s | Lighthouse / Web Vitals | 含 JS Bundle 加载 |
| 数据库连接池利用率 | ≤ 80% | PostgreSQL `pg_stat_activity` | 默认池大小 20 |
| Docker 健康检查通过率 | = 100% | `docker compose ps` health 状态 | — |
| 错误率 | ≤ 1% | 5xx 状态码占比 | 月度统计 |

> 以上 SLO 为推荐基准值，实际部署时可根据硬件配置调整。

### 9.1 容器资源使用

```bash
# 查看所有容器资源使用
docker stats --no-stream

# 持续监控
docker stats
```

### 9.2 API 响应时间

所有 API 响应头中包含 `X-Process-Time`，值为秒。

```bash
# 测试 API 响应时间
curl -w "\ntime_total: %{time_total}s\n" http://localhost:8000/health
```

### 9.3 数据库性能

```bash
# 查看 PostgreSQL 活跃连接
docker compose exec db psql -U postgres -d ai_teaching \
  -c "SELECT count(*) FROM pg_stat_activity;"

# 查看慢查询（需先启用日志）
docker compose exec db psql -U postgres -d ai_teaching \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### 9.4 建议的生产环境监控

- **容器监控**: Prometheus + cAdvisor + Grafana
- **应用监控**: 结构化日志接入 ELK/Loki
- **错误追踪**: Sentry (`sentry-sdk` 集成)
- **API监控**: 接入 APM 工具（如 Elastic APM）
- **告警**: 健康检查端点 + Uptime Robot/Alertmanager

---

## 10. 安全运维

### 10.1 定期安全检查

```bash
# 检查是否使用默认密码
docker compose config | grep -E "AiTeachDb|AiTeachingDockerJwt|MinioDocker"

# 检查 DEBUG 模式
docker compose exec backend env | grep DEBUG

# 检查过期会话
docker compose exec db psql -U postgres -d ai_teaching \
  -c "SELECT username, last_login_at FROM users WHERE last_login_at < NOW() - INTERVAL '90 days';"
```

### 10.2 审计日志查询

```bash
# 查询最近50条审计日志
docker compose exec db psql -U postgres -d ai_teaching \
  -c "SELECT created_at, username, action, resource_type, description FROM audit_logs ORDER BY created_at DESC LIMIT 50;"

# 查询特定用户的登录记录
docker compose exec db psql -U postgres -d ai_teaching \
  -c "SELECT created_at, ip_address, success FROM audit_logs WHERE action='login' AND username='teacher' ORDER BY created_at DESC;"
```

### 10.3 安全更新

```bash
# 拉取最新基础镜像
docker compose pull

# 重建并重启服务
docker compose up -d --build

# 检查依赖漏洞（Python）
pip-audit

# 检查依赖漏洞（Node.js）
npm audit
```

---

## 11. 应急操作

### 11.1 快速回滚

```bash
# 如果有镜像标签管理
docker compose down
docker tag ai-teaching-backend:latest ai-teaching-backend:previous
docker compose up -d
```

### 11.2 紧急数据库修复

```bash
# 进入数据库容器
docker compose exec db bash

# 进入 PostgreSQL 交互模式
psql -U postgres -d ai_teaching

# 常用修复操作
-- 解锁所有用户
UPDATE users SET locked_until = NULL, failed_login_attempts = 0;

-- 解锁密码重置
UPDATE users SET reset_locked_until = NULL, failed_reset_attempts = 0;

-- 检查数据库大小
SELECT pg_database_size('ai_teaching') / 1024 / 1024 AS size_mb;

-- 清理软删除记录（物理删除7天前的软删除数据）
DELETE FROM courses WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '7 days';
```

### 11.3 重置管理员密码

```bash
# 进入后端容器
docker compose exec backend python scripts/create_user.py \
  --username teacher \
  --email teacher@example.com \
  --password NewSecurePassword123! \
  --reset-password
```

---

## 12. 日常巡检清单

| 频率 | 检查项                                                 |
| ---- | ------------------------------------------------------ |
| 每日 | `docker compose ps` 确认所有服务 running             |
| 每日 | `curl http://localhost:8000/health` 确认健康         |
| 每日 | `docker compose logs --tail=50 backend \| grep ERROR` |
| 每周 | 数据库备份验证（检查备份文件大小非空）                 |
| 每周 | 磁盘空间检查 `df -h`                                 |
| 每月 | 审计日志清理（保留90天）                               |
| 每月 | 依赖安全审计 `pip-audit` / `npm audit`             |
| 每月 | 系统重启测试 `docker compose restart`                |

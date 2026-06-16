# API Reference — AI 教学平台

> 本文档为静态参考。交互式文档请启动后端（`DEBUG=True`），访问 `/docs`（Swagger UI）或 `/redoc`（ReDoc）。

## 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `/api/v1` |
| 认证方式 | Bearer Token（JWT） |
| Access Token 有效期 | 30 分钟（默认） |
| Refresh Token 有效期 | 7 天（默认） |
| 内容类型 | `application/json`（文件上传除外） |

## 认证

除登录、注册、健康检查外，所有端点均需在请求头中携带：

```
Authorization: Bearer <access_token>
```

Token 过期后通过 `POST /api/v1/auth/refresh` 刷新（Refresh Token 通过 HttpOnly Cookie 传递）。

---

## 统一响应格式

### 成功 — 单条数据

```json
{
  "data": { ... }
}
```

### 成功 — 分页列表

```json
{
  "data": [ ... ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

### 成功 — 操作结果

```json
{
  "message": "操作成功",
  "code": "success"
}
```

### 错误

```json
{
  "error": "ERROR_CODE",
  "code": "1003",
  "message": "课程不存在",
  "request_id": "a1b2c3d4"
}
```

---

## 通用查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码 |
| `page_size` | int | 20 | 每页条数 |
| `keyword` | string | — | 模糊搜索关键词 |

---

## 端点列表

### Auth — 用户认证

前缀：`/api/v1/auth`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/auth/login` | 用户登录 | ❌ |
| POST | `/auth/register` | 用户注册 | ❌ |
| POST | `/auth/refresh` | 刷新 Access Token | ❌ (Cookie) |
| GET | `/auth/me` | 获取当前用户信息 | ✅ |
| POST | `/auth/logout` | 用户退出 | ✅ |
| POST | `/auth/password/change` | 修改密码 | ✅ |
| POST | `/auth/password/reset/question` | 获取密保问题 | ❌ |
| POST | `/auth/password/reset` | 通过密保重置密码 | ❌ |

### Users — 用户管理

前缀：`/api/v1/users`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/users/{user_id}` | 获取用户详情 | ✅ |
| PUT | `/users/{user_id}` | 更新用户资料 | ✅ |

### Courses — 课程管理

前缀：`/api/v1/courses`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/courses` | 创建课程 | ✅ |
| GET | `/courses` | 获取课程列表（分页） | ✅ |
| GET | `/courses/{course_id}` | 获取课程详情 | ✅ |
| PUT | `/courses/{course_id}` | 更新课程 | ✅ |
| DELETE | `/courses/{course_id}` | 删除课程（软删除） | ✅ |
| POST | `/courses/{course_id}/students/{student_id}` | 关联学生到课程 | ✅ |
| DELETE | `/courses/{course_id}/students/{student_id}` | 取消学生关联 | ✅ |
| GET | `/courses/{course_id}/students` | 获取课程学生列表 | ✅ |

**筛选参数：** `subject`, `grade`, `status`（draft/active/inactive）, `keyword`

### Students — 学生管理

前缀：`/api/v1/students`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/students` | 创建学生 | ✅ |
| GET | `/students` | 获取学生列表（分页） | ✅ |
| GET | `/students/{student_id}` | 获取学生详情 | ✅ |
| PUT | `/students/{student_id}` | 更新学生信息 | ✅ |
| DELETE | `/students/{student_id}` | 删除学生（软删除） | ✅ |
| GET | `/students/{student_id}/export` | 导出学生成长报告（PDF/DOCX） | ✅ |
| GET | `/students/{student_id}/courses` | 获取学生关联课程 | ✅ |

**筛选参数：** `keyword`, `grade`, `class_name`, `gender`, `is_active`

### Lesson Plans — 教案管理

前缀：`/api/v1/lesson-plans`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/lesson-plans` | 创建教案 | ✅ |
| GET | `/lesson-plans` | 获取教案列表（分页） | ✅ |
| GET | `/lesson-plans/stats/monthly` | 获取月度教案统计 | ✅ |
| GET | `/lesson-plans/{plan_id}` | 获取教案详情 | ✅ |
| PUT | `/lesson-plans/{plan_id}` | 更新教案 | ✅ |
| DELETE | `/lesson-plans/{plan_id}` | 删除教案（软删除） | ✅ |
| POST | `/lesson-plans/{plan_id}/publish` | 发布教案 | ✅ |
| POST | `/lesson-plans/{plan_id}/unpublish` | 取消发布 | ✅ |
| POST | `/lesson-plans/{plan_id}/archive` | 归档教案 | ✅ |
| POST | `/lesson-plans/{plan_id}/restore` | 恢复教案 | ✅ |

**筛选参数：** `keyword`, `subject`, `grade`, `status`（draft/published/archived）

### Lesson Templates — 教案模板

前缀：`/api/v1/lesson-templates`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/lesson-templates` | 获取模板列表 | ✅ |
| GET | `/lesson-templates/{template_id}` | 获取模板详情 | ✅ |

### Portfolios — 成长档案

前缀：`/api/v1/portfolios`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/portfolios` | 创建成长档案 | ✅ |
| GET | `/portfolios` | 获取档案列表（分页） | ✅ |
| GET | `/portfolios/{portfolio_id}` | 获取档案详情 | ✅ |
| PUT | `/portfolios/{portfolio_id}` | 更新档案 | ✅ |
| DELETE | `/portfolios/{portfolio_id}` | 删除档案（软删除） | ✅ |

**筛选参数：** `keyword`, `student_id`, `type`

### Resources — 资源管理

前缀：`/api/v1/resources`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/resources` | 上传资源（multipart/form-data） | ✅ |
| GET | `/resources` | 获取资源列表（分页） | ✅ |
| GET | `/resources/{resource_id}` | 获取资源详情 | ✅ |
| PUT | `/resources/{resource_id}` | 更新资源元数据 | ✅ |
| DELETE | `/resources/{resource_id}` | 删除资源 | ✅ |
| GET | `/resources/{resource_id}/file` | 下载资源文件 | ✅ |

**筛选参数：** `keyword`, `file_type`, `tag_ids`（逗号分隔）

### Tags — 标签管理

前缀：`/api/v1/tags`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/tags` | 获取标签列表（公开接口） | ❌ |
| GET | `/tags/{tag_id}` | 获取标签详情 | ✅ |
| POST | `/tags` | 创建标签 | ✅ |
| PUT | `/tags/{tag_id}` | 更新标签 | ✅ |
| DELETE | `/tags/{tag_id}` | 删除标签 | ✅ |

### Notifications — 通知管理

前缀：`/api/v1/notifications`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/notifications` | 获取通知列表（分页） | ✅ |
| GET | `/notifications/stats` | 获取通知统计 | ✅ |
| GET | `/notifications/unread-count` | 获取未读数量 | ✅ |
| GET | `/notifications/{notification_id}` | 获取通知详情 | ✅ |
| PUT | `/notifications/{notification_id}` | 更新通知 | ✅ |
| PUT | `/notifications/{notification_id}/read` | 标记通知为已读 | ✅ |
| PUT | `/notifications/read-all` | 标记全部为已读 | ✅ |
| PUT | `/notifications/read-batch` | 批量标记已读 | ✅ |
| DELETE | `/notifications/{notification_id}` | 删除通知 | ✅ |
| DELETE | `/notifications/read/all` | 删除所有已读通知 | ✅ |

### Reports — 数据报告

前缀：`/api/v1/reports`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/reports/dashboard` | 仪表盘统计数据 | ✅ |
| GET | `/reports/courses` | 课程报告 | ✅ |
| GET | `/reports/students` | 学生报告 | ✅ |
| GET | `/reports/trends` | 月度趋势（查询参数 `months`） | ✅ |

### Dropdown Options — 下拉选项

前缀：`/api/v1/dropdown-options`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/dropdown-options` | 获取下拉选项列表 | ✅ |
| POST | `/dropdown-options` | 创建下拉选项 | ✅ |
| PUT | `/dropdown-options/{option_id}` | 更新下拉选项 | ✅ |
| DELETE | `/dropdown-options/{option_id}` | 删除下拉选项 | ✅ |

**查询参数：** `group_key`（按分组过滤）

### AI Assistant — AI 助手

前缀：`/api/v1/ai`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| POST | `/ai/chat` | AI 对话（SSE 流式响应） | ✅ |
| GET | `/ai/conversations` | 获取对话列表 | ✅ |
| GET | `/ai/conversations/{conversation_id}` | 获取对话消息 | ✅ |
| DELETE | `/ai/conversations/{conversation_id}` | 删除对话 | ✅ |
| PATCH | `/ai/conversations/{conversation_id}` | 重命名对话 | ✅ |

### AI Config — AI 配置

前缀：`/api/v1/ai`

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/ai/config` | 获取 AI 配置 | ✅ |
| PUT | `/ai/config` | 更新 AI 配置 | ✅ |
| POST | `/ai/config/test` | 测试 API 连接 | ✅ |
| DELETE | `/ai/config` | 重置 AI 配置 | ✅ |

### Health Check — 健康检查

| Method | Path | Summary | Auth |
|--------|------|---------|------|
| GET | `/health` | 基础健康检查 | ❌ |
| GET | `/health/detailed` | 详细健康检查（生产环境仅内网） | ❌ |
| GET | `/` | API 基本信息 | ❌ |

---

## 错误码参考

| 范围 | 类别 | 常见错误码 |
|------|------|-----------|
| 1000-1999 | 通用 | `1000` 未知错误, `1003` 资源不存在, `1004` 资源已存在, `1006` 版本冲突 |
| 2000-2999 | 认证 | `2000` 未授权, `2001` Token 过期, `2002` Token 无效, `2006` 账户锁定 |
| 3000-3999 | 用户 | `3000` 用户不存在, `3001` 用户已存在, `3002` 凭据无效 |
| 4000-4999 | 数据 | `4000` 参数校验失败, `4001` 数据完整性错误 |
| 5000-5999 | 文件 | `5001` 文件过大, `5002` 文件类型不允许 |
| 6000-6999 | 限流 | `6000` 请求频率超限 |
| 7000-7999 | 服务器 | `7001` 内部错误, `7002` 服务不可用 |

---

## HTTP 状态码约定

| 状态码 | 场景 |
|--------|------|
| 200 | 查询/更新成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无响应体） |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（重复/版本冲突） |
| 413 | 文件超过大小限制 |
| 422 | 请求参数校验失败 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

# AI教学平台 — 数据字典

> 基于数据库模型定义生成，反映 v1.0.0 版本的数据结构。

## 通用约定

### 基础字段（所有业务表继承 `BaseModel`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID String(36) | 主键，自动生成UUID v4 |
| `created_at` | DateTime(tz) | 创建时间，自动设置 |
| `updated_at` | DateTime(tz) | 更新时间，自动更新 |
| `is_deleted` | Boolean | 软删除标记，默认 false |
| `deleted_at` | DateTime(tz) | 软删除时间，默认 null |
| `version` | Integer | 乐观锁版本号，默认 1 |

> 以下各表定义中，基础字段不再重复列出。特殊说明的除外。

---

## 1. users — 用户表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | UUID String(36) | PK | UUID v4 | 用户唯一标识 |
| `email` | String(255) | NOT NULL, UNIQUE(partial) | — | 邮箱地址 |
| `username` | String(50) | NOT NULL, UNIQUE(partial) | — | 用户名 |
| `hashed_password` | String(255) | NOT NULL | — | bcrypt哈希密码 |
| `full_name` | String(100) | NULLABLE | null | 真实姓名 |
| `avatar_url` | String(500) | NULLABLE | null | 头像URL |
| `phone` | String(20) | NULLABLE | null | 手机号码 |
| `bio` | Text | NULLABLE | null | 个人简介 |
| `role` | Enum | NOT NULL | `teacher` | 用户角色 |
| `status` | Enum | NOT NULL | `active` | 用户状态: active/inactive/suspended |
| `is_active` | Boolean | NOT NULL | true | 账户是否激活 |
| `last_login_at` | DateTime(tz) | NULLABLE | null | 最后登录时间 |
| `last_login_ip` | String(45) | NULLABLE | null | 最后登录IP |
| `login_count` | Integer | NOT NULL | 0 | 登录次数 |
| `failed_login_attempts` | Integer | NOT NULL | 0 | 连续登录失败次数 |
| `locked_until` | DateTime(tz) | NULLABLE | null | 账户锁定截止时间 |
| `security_question` | String(200) | NOT NULL | — | 密保问题 |
| `hashed_security_answer` | String(255) | NOT NULL | — | bcrypt哈希密保答案 |
| `failed_reset_attempts` | Integer | NOT NULL | 0 | 密码重置失败次数 |
| `reset_locked_until` | DateTime(tz) | NULLABLE | null | 重置锁定截止时间 |
| `token_version` | Integer | NOT NULL | 1 | 令牌版本号 |

**索引**:
- `ix_users_email_unique` — email (partial, WHERE is_deleted=false)
- `ix_users_username_unique` — username (partial, WHERE is_deleted=false)

**角色枚举**: `teacher`（当前仅教师角色）

**安全规则**:
- 5次登录失败 → 锁定30分钟
- 5次密保验证失败 → 重置锁定30分钟
- 改密后自动递增 `token_version`，使所有旧Token失效

---

## 2. courses — 课程表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | String(200) | NOT NULL, INDEX | — | 课程名称 |
| `subject` | String(100) | NOT NULL, INDEX | — | 学科 |
| `grade` | String(50) | NOT NULL, INDEX | — | 年级 |
| `teacher` | String(100) | NOT NULL | — | 授课教师 |
| `user_id` | FK → users.id | NULLABLE, INDEX, CASCADE | null | 关联用户ID |
| `schedule` | String(500) | NULLABLE | null | 课程安排 |
| `description` | Text | NULLABLE | null | 课程描述 |
| `status` | Enum | NOT NULL, INDEX | `draft` | 课程状态 |

**索引**:
- `ix_courses_subject_grade` — (subject, grade)
- `ix_courses_status` — (status)

**状态枚举**: `draft` / `active` / `inactive`

---

## 3. students — 学生表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | String(100) | NOT NULL, INDEX | — | 学生姓名 |
| `gender` | Enum | NOT NULL | — | 性别: male/female/other |
| `birth_date` | Date | NOT NULL | — | 出生日期 |
| `grade` | String(50) | NOT NULL, INDEX | — | 年级 |
| `class_name` | String(50) | NOT NULL, INDEX | — | 班级 |
| `avatar` | String(500) | NULLABLE | null | 头像URL |
| `parent_contact` | String(100) | NULLABLE | null | 家长联系方式 |
| `is_active` | Boolean | NOT NULL | true | 是否在读 |
| `enrollment_date` | Date | NULLABLE | null | 入学日期 |
| `user_id` | FK → users.id | NULLABLE, INDEX, CASCADE | null | 关联教师用户ID |

**索引**:
- `ix_students_grade_class` — (grade, class_name)

**关系**:
- `courses`: 多对多（通过 course_student 关联表）
- `portfolios`: 一对多（一个学生多条成长档案）

---

## 4. course_student — 课程-学生关联表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `course_id` | FK → courses.id | PK, CASCADE | — | 课程ID |
| `student_id` | FK → students.id | PK, CASCADE | — | 学生ID |
| `enrolled_at` | DateTime(tz) | NOT NULL | now() | 关联时间 |

---

## 5. lesson_plans — 教案表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `user_id` | FK → users.id | NOT NULL, INDEX, CASCADE | — | 创建者ID |
| `template_id` | FK → lesson_templates.id | NULLABLE, INDEX, SET NULL | null | 模板ID |
| `title` | String(200) | NOT NULL | — | 教案标题 |
| `subject` | String(100) | NOT NULL, INDEX | — | 学科 |
| `grade` | String(50) | NOT NULL, INDEX | — | 年级 |
| `duration` | Integer | NOT NULL | — | 课时时长（分钟） |
| `teaching_objectives` | Text | NULLABLE | null | 教学目标 |
| `teaching_content` | Text | NULLABLE | null | 教学内容 |
| `teaching_methods` | Text | NULLABLE | null | 教学方法 |
| `teaching_process` | Text | NULLABLE | null | 教学过程 |
| `teaching_resources` | Text | NULLABLE | null | 教学资源 |
| `status` | Enum | NOT NULL, INDEX | `draft` | 教案状态 |
| `notes` | Text | NULLABLE | null | 备注 |

**状态枚举**: `draft` / `published` / `archived`

**工作流**: draft → published → archived（可通过API操作发布/取消发布/归档/恢复）

---

## 6. lesson_templates — 教案模板表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | String(255) | NOT NULL, INDEX | — | 模板名称 |
| `description` | Text | NULLABLE | null | 模板描述 |
| `structure` | Text | NOT NULL | — | 模板结构（JSON） |
| `is_default` | Boolean | NOT NULL | false | 是否默认模板 |

---

## 7. portfolios — 成长档案表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `user_id` | FK → users.id | NOT NULL, INDEX, CASCADE | — | 创建者ID |
| `student_id` | FK → students.id | NOT NULL, INDEX, CASCADE | — | 学生ID |
| `type` | String(50) | NOT NULL | — | 记录类型 |
| `title` | String(200) | NOT NULL | — | 标题 |
| `content` | Text | NULLABLE | null | 内容 |
| `attachments` | Text | NULLABLE | null | 附件（JSON） |
| `cognitive_score` | Integer | NULLABLE, CHECK 0-100 | null | 认知维度评分 |
| `skill_score` | Integer | NULLABLE, CHECK 0-100 | null | 技能维度评分 |
| `creativity_score` | Integer | NULLABLE, CHECK 0-100 | null | 创意维度评分 |
| `cooperation_score` | Integer | NULLABLE, CHECK 0-100 | null | 合作维度评分 |
| `attention_score` | Integer | NULLABLE, CHECK 0-100 | null | 注意力维度评分 |

**type 枚举**: `work`(作品) / `evaluation`(评价) / `observation`(观察) / `milestone`(里程碑)

**评分约束**: 每个评分字段独立 CHECK 约束，NULL 或 0-100 范围

---

## 8. resources — 资源表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | String(255) | NOT NULL | — | 资源名称 |
| `description` | Text | NULLABLE | null | 资源描述 |
| `file_path` | String(500) | NOT NULL | — | 文件存储路径 |
| `file_name` | String(255) | NOT NULL | — | 原始文件名 |
| `file_size` | Integer | NOT NULL | — | 文件大小（字节） |
| `file_type` | String(50) | NOT NULL, INDEX | — | 文件类型（扩展名） |
| `user_id` | FK → users.id | NOT NULL, INDEX, CASCADE | — | 上传者ID |

**关系**:
- `tags`: 多对多（通过 resource_tag_association 关联表）

**上传限制**: 最大 100MB，白名单扩展名（.pdf/.doc/.docx/.txt/.md/.jpg/.jpeg/.png/.gif/.mp4/.mp3）

---

## 9. tags — 标签表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | String(50) | NOT NULL, UNIQUE(partial) | — | 标签名称 |
| `description` | Text | NULLABLE | null | 标签描述 |
| `color` | String(20) | NULLABLE | null | 标签颜色 |

**索引**: `ix_tags_name_unique` — name (partial, WHERE is_deleted=false)

**关系**: `resources`: 多对多（通过 resource_tag_association）

---

## 10. resource_tag_association — 资源-标签关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `resource_id` | FK → resources.id | PK, CASCADE | 资源ID |
| `tag_id` | FK → tags.id | PK, CASCADE | 标签ID |

---

## 11. notifications — 通知表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `user_id` | FK → users.id | NOT NULL, INDEX, CASCADE | — | 接收用户ID |
| `title` | String(200) | NOT NULL | — | 通知标题 |
| `content` | Text | NOT NULL | — | 通知内容 |
| `type` | Enum | NOT NULL, INDEX | `system` | 通知类型 |
| `read` | Boolean | NOT NULL, INDEX | false | 是否已读 |
| `target_id` | String(36) | NULLABLE | null | 关联对象ID |
| `target_type` | String(50) | NULLABLE | null | 关联对象类型 |

**type 枚举**: `system` / `course` / `homework` / `exam` / `message` / `reminder`

---

## 12. audit_logs — 审计日志表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `user_id` | FK → users.id | NULLABLE, INDEX, SET NULL | null | 操作用户ID |
| `username` | String(50) | NULLABLE | null | 操作用户名（冗余） |
| `action` | Enum | NOT NULL, INDEX | — | 操作类型 |
| `resource_type` | String(50) | NOT NULL, INDEX | — | 资源类型 |
| `resource_id` | String(36) | NULLABLE, INDEX | null | 资源ID |
| `description` | Text | NOT NULL | — | 操作描述 |
| `old_values` | Text | NULLABLE | null | 变更前值（JSON） |
| `new_values` | Text | NULLABLE | null | 变更后值（JSON） |
| `changed_fields` | Text | NULLABLE | null | 变更字段（JSON数组） |
| `ip_address` | String(45) | NULLABLE | null | 客户端IP |
| `user_agent` | String(500) | NULLABLE | null | User-Agent |
| `request_path` | String(500) | NULLABLE | null | 请求路径 |
| `request_method` | String(10) | NULLABLE | null | 请求方法 |
| `success` | Boolean | NOT NULL | true | 操作是否成功 |
| `error_message` | Text | NULLABLE | null | 错误信息 |
| `execution_time` | Integer | NULLABLE | null | 执行时间（毫秒） |

**action 枚举**: `create` / `update` / `delete` / `soft_delete` / `restore` / `login` / `logout` / `export` / `import` / `view`

**索引**:
- `ix_audit_logs_created_at` — (created_at)
- `ix_audit_logs_user_action` — (user_id, action)
- `ix_audit_logs_resource` — (resource_type, resource_id)

---

## 13. ai_conversations — AI对话会话表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `user_id` | FK → users.id | NOT NULL, INDEX, CASCADE | — | 用户ID |
| `title` | String(100) | NOT NULL | — | 会话标题 |
| `module` | String(50) | NULLABLE | null | 关联模块标签 |

**关系**: `messages`: 一对多（级联删除）

---

## 14. ai_messages — AI对话消息表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `conversation_id` | FK → ai_conversations.id | NOT NULL, INDEX, CASCADE | — | 会话ID |
| `role` | String(20) | NOT NULL | — | 角色: user/assistant/tool |
| `content` | Text | NOT NULL | — | 消息内容 |
| `tool_calls` | Text | NULLABLE | null | Function Calling工具调用（JSON） |
| `tool_call_id` | String(100) | NULLABLE | null | 工具调用ID |
| `module_tag` | String(50) | NULLABLE | null | 模块标签 |

---

## 15. ai_configs — AI配置表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `user_id` | FK → users.id | NOT NULL, UNIQUE, INDEX, CASCADE | — | 用户ID |
| `provider` | String(50) | NOT NULL | `zhipu` | 服务商标识 |
| `provider_name` | String(100) | NULLABLE | null | 服务商自定义名称 |
| `api_base` | String(500) | NOT NULL | `https://open.bigmodel.cn/api/paas/v4` | API地址 |
| `model` | String(100) | NOT NULL | `glm-4.7-flash` | 模型名称 |
| `api_key_encrypted` | Text | NULLABLE | null | Fernet加密的API密钥 |
| `is_active` | Boolean | NOT NULL | true | 是否启用 |

---

## 16. dropdown_options — 下拉选项表

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `group_key` | String(100) | NOT NULL | — | 分组键（如 subject/grade） |
| `label` | String(100) | NOT NULL | — | 显示文本 |
| `value` | String(100) | NOT NULL | — | 存储值 |
| `description` | Text | NULLABLE | null | 可选描述 |
| `sort_order` | Integer | NOT NULL | 0 | 排序序号 |
| `is_active` | Boolean | NOT NULL | true | 是否启用 |

**唯一约束**: `uq_dropdown_group_value` — (group_key, value)

**索引**:
- `ix_dropdown_group_key` — (group_key)
- `ix_dropdown_group_active_sort` — (group_key, is_active, sort_order)

---

## ER关系总览

```
users ──1:N──► courses
users ──1:N──► students
users ──1:N──► lesson_plans
users ──1:N──► portfolios
users ──1:N──► resources
users ──1:N──► notifications
users ──1:N──► audit_logs
users ──1:1──► ai_configs
users ──1:N──► ai_conversations

courses ◄──M:N──► students          (via course_student)
resources ◄──M:N──► tags            (via resource_tag_association)

students ──1:N──► portfolios
lesson_templates ──1:N──► lesson_plans
ai_conversations ──1:N──► ai_messages
```

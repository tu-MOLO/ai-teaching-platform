# 代码审查报告修复 Spec

## Why
代码审查报告发现80+问题，包含6个高危安全漏洞（资源API公开访问、密码重置无验证、文件上传绕过、XSS漏洞、路径遍历）、13个业务逻辑缺陷（事务上下文外刷新、权限验证缺失、软删除唯一约束冲突）、20+ API设计不一致问题及15+前端代码质量问题。这些问题严重影响系统安全性和稳定性，必须按优先级修复。

## What Changes
- 为资源API的GET列表和GET详情接口添加认证依赖
- 为密码重置接口添加安全验证机制（管理员审批流程）
- 将python-jose替换为PyJWT
- 为文件上传添加MIME类型验证，防止扩展名绕过
- 为PDF/Word导出的HTML生成添加HTML转义，修复XSS漏洞
- 为存储路径添加路径遍历防护
- 将所有service层的`db.refresh()`调用移入事务上下文内
- 为Tag和User模型的唯一约束添加软删除条件过滤
- 为资源更新/删除操作添加所有权验证
- 为Refresh Token添加token_version绑定
- 修复前端setToken未同步isAuthenticated状态
- 修复前端Token刷新竞态条件
- 为calculate_age函数添加空值处理
- 统一通知模块的响应格式（items→data）和分页参数（skip/limit→page/page_size）
- 为Portfolio模型添加字段长度约束
- 为高频查询字段添加数据库索引
- 为Dashboard组件添加内存泄漏防护
- 为useDropdownOptions hook添加错误处理和cleanup
- 添加安全响应头中间件
- 修复健康检查端点信息泄露
- **BREAKING** 通知API响应格式从`items`改为`data`，分页参数从`skip/limit`改为`page/page_size`

## Impact
- Affected specs: 认证系统、资源管理、文件存储、数据导出、通知系统
- Affected code:
  - `backend/app/api/v1/resources.py` - 添加认证、权限验证
  - `backend/app/api/v1/auth.py` - 密码重置安全加固
  - `backend/app/core/security.py` - 替换JWT库、Refresh Token版本控制
  - `backend/app/services/storage.py` - 文件上传安全、路径遍历防护
  - `backend/app/services/export.py` - XSS修复
  - `backend/app/services/course.py` - 事务修复
  - `backend/app/services/student.py` - 事务修复、N+1优化
  - `backend/app/services/portfolio.py` - 事务修复
  - `backend/app/services/lesson_plan.py` - 事务修复
  - `backend/app/services/resource.py` - 权限验证
  - `backend/app/models/tag.py` - 软删除唯一约束
  - `backend/app/models/user.py` - 软删除唯一约束
  - `backend/app/models/portfolio.py` - 字段长度约束
  - `backend/app/models/lesson_plan.py` - 添加索引
  - `backend/app/models/notification.py` - 添加索引
  - `backend/app/models/resource.py` - 添加索引
  - `backend/app/api/v1/notifications.py` - 响应格式统一
  - `backend/app/api/v1/students.py` - 空值处理
  - `backend/app/main.py` - 安全头、健康检查修复
  - `backend/app/core/config.py` - 密钥验证
  - `frontend/src/stores/auth.ts` - setToken修复
  - `frontend/src/services/request.ts` - Token刷新竞态修复
  - `frontend/src/pages/Dashboard/index.tsx` - 内存泄漏修复
  - `frontend/src/hooks/useDropdownOptions.ts` - 错误处理和cleanup

## ADDED Requirements

### Requirement: 资源API认证保护
系统 SHALL 对所有资源API端点（包括GET列表和GET详情）要求认证，未认证请求 SHALL 返回401错误。

#### Scenario: 未认证用户访问资源列表
- **WHEN** 未认证用户请求 GET /api/v1/resources/
- **THEN** 返回401 Unauthorized错误

#### Scenario: 已认证用户访问资源列表
- **WHEN** 已认证用户请求 GET /api/v1/resources/
- **THEN** 返回该用户可见的资源列表

### Requirement: 密码重置安全验证
系统 SHALL 在密码重置流程中添加安全验证机制。本地部署场景下 SHALL 要求管理员审批或提供当前用户身份验证。

#### Scenario: 普通用户尝试重置密码
- **WHEN** 用户提交密码重置请求
- **THEN** 系统要求提供额外的身份验证信息（如当前密码或管理员token）
- **AND** 验证通过后方可重置

### Requirement: 文件上传MIME类型验证
系统 SHALL 在文件上传时同时验证文件扩展名和文件内容的MIME类型，防止扩展名伪造攻击。

#### Scenario: 上传伪造扩展名的文件
- **WHEN** 用户上传扩展名为.jpg但实际内容为PHP脚本的文件
- **THEN** 系统拒绝上传并返回错误

#### Scenario: 上传合法文件
- **WHEN** 用户上传扩展名和MIME类型匹配的合法文件
- **THEN** 系统接受上传

### Requirement: 导出内容XSS防护
系统 SHALL 对所有导出内容（PDF/Word）中的用户输入进行HTML转义，防止存储型XSS攻击。

#### Scenario: 导出包含恶意脚本的内容
- **WHEN** 教案标题包含 `<script>alert('xss')</script>`
- **THEN** 导出的HTML/PDF中该内容被转义为 `&lt;script&gt;alert('xss')&lt;/script&gt;`

### Requirement: 存储路径遍历防护
系统 SHALL 验证文件存储路径中的object_name和folder参数，拒绝包含路径遍历字符（如`../`）的输入。

#### Scenario: 恶意路径遍历尝试
- **WHEN** object_name包含 `../` 或 folder包含非字母数字字符
- **THEN** 系统拒绝操作并抛出ValueError

### Requirement: 资源所有权验证
系统 SHALL 在资源更新和删除操作中验证当前用户是否为资源所有者，非所有者操作 SHALL 返回403错误。

#### Scenario: 用户尝试修改他人资源
- **WHEN** 用户A尝试更新/删除用户B创建的资源
- **THEN** 返回403 Forbidden错误

### Requirement: Refresh Token版本控制
系统 SHALL 在Refresh Token中包含token_version，并在刷新时验证版本号是否与数据库一致，确保登出或修改密码后Refresh Token立即失效。

#### Scenario: 用户登出后使用旧Refresh Token
- **WHEN** 用户登出后尝试使用旧的Refresh Token获取新Access Token
- **THEN** 系统拒绝刷新并返回401错误

### Requirement: 安全响应头
系统 SHALL 在所有HTTP响应中添加安全响应头，包括X-Content-Type-Options、X-Frame-Options和X-XSS-Protection。

### Requirement: 健康检查信息脱敏
系统 SHALL 在健康检查端点中不暴露敏感的系统信息（Python版本、平台信息、配置详情），详细健康检查 SHALL 要求认证。

## MODIFIED Requirements

### Requirement: JWT库替换
系统 SHALL 使用PyJWT替代已停止维护的python-jose库进行JWT令牌的编码和解码。所有现有的JWT功能（创建、验证、解码） SHALL 保持兼容。

### Requirement: 事务上下文内刷新
所有service层的`db.refresh()`调用 SHALL 在事务上下文（`async with db.begin()`块）内执行，避免对象过期异常。

### Requirement: 软删除唯一约束
Tag和User模型的唯一约束 SHALL 仅对未删除记录生效，使用PostgreSQL的部分索引（WHERE is_deleted = false）实现。

### Requirement: 前端认证状态同步
前端auth store的setToken方法 SHALL 同时更新token和isAuthenticated状态，确保认证状态一致性。

### Requirement: Token刷新竞态修复
前端Token刷新逻辑 SHALL 使用Promise队列管理并发刷新请求，确保只有一个刷新请求在进行，其他请求等待刷新完成后使用新Token重试。

### Requirement: 通知API响应格式统一
通知API的列表响应 SHALL 使用`data`字段替代`items`字段，分页参数 SHALL 使用`page`/`page_size`替代`skip`/`limit`，与其他模块保持一致。

### Requirement: calculate_age空值安全
calculate_age函数 SHALL 处理birth_date为None的情况，返回None而非抛出异常。

### Requirement: Portfolio字段长度约束
Portfolio模型的type和title字段 SHALL 添加String长度约束（type: String(50), title: String(200)）。

### Requirement: 数据库索引优化
系统 SHALL 为LessonPlan的status/subject/grade字段、Resource的file_type字段、Notification的read/type字段添加数据库索引。

## REMOVED Requirements

### Requirement: 无
无需移除任何现有功能。

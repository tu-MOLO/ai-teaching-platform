# Tasks

## P0 - 阻止交付（必须立即修复）

- [x] Task 1: 资源API添加认证保护 - 为GET列表和GET详情接口添加CurrentUser认证依赖
  - [x] SubTask 1.1: 在 `backend/app/api/v1/resources.py` 的 `get_resources` 函数添加 `current_user_id: CurrentUser` 参数
  - [x] SubTask 1.2: 在 `backend/app/api/v1/resources.py` 的 `get_resource` 函数添加 `current_user_id: CurrentUser` 参数
  - [x] SubTask 1.3: 更新接口文档注释，移除"公开接口"描述

- [x] Task 2: 密码重置安全加固 - 为密码重置接口添加管理员token验证机制
  - [x] SubTask 2.1: 在 `backend/app/schemas/auth.py` 的 PasswordResetRequest 中添加 admin_token 可选字段
  - [x] SubTask 2.2: 在 `backend/app/api/v1/auth.py` 的 reset_password 中添加管理员身份验证逻辑
  - [x] SubTask 2.3: 在 `backend/app/core/config.py` 中添加 ADMIN_RESET_TOKEN 配置项

- [x] Task 3: 修复事务上下文外刷新 - 将所有service层的db.refresh()移入事务内
  - [x] SubTask 3.1: 修复 `backend/app/services/course.py` 中 create 和 update 方法的 refresh 位置
  - [x] SubTask 3.2: 修复 `backend/app/services/student.py` 中 create 和 update 方法的 refresh 位置
  - [x] SubTask 3.3: 修复 `backend/app/services/portfolio.py` 中 create 和 update 方法的 refresh 位置
  - [x] SubTask 3.4: 修复 `backend/app/services/lesson_plan.py` 中所有方法的 refresh 位置

- [x] Task 4: 修复前端setToken状态同步
  - [x] SubTask 4.1: 修改 `frontend/src/stores/auth.ts` 的 setToken 方法，同时更新 isAuthenticated 为 true

- [x] Task 5: 文件上传安全加固 - 添加MIME类型验证和路径遍历防护
  - [x] SubTask 5.1: 在 `backend/app/services/storage.py` 的 is_allowed_file 函数添加文件内容MIME类型检查
  - [x] SubTask 5.2: 在 `backend/app/services/storage.py` 的 generate_object_name 函数添加folder参数验证（仅允许字母数字下划线连字符）
  - [x] SubTask 5.3: 在 `backend/app/services/storage.py` 的 LocalFileStorage.upload_file 中添加object_name路径遍历检查
  - [x] SubTask 5.4: 更新 `backend/app/api/v1/resources.py` 的 create_resource 传递文件内容给 is_allowed_file
  - [x] SubTask 5.5: 在 `backend/app/core/config.py` 添加 ALLOWED_MIME_TYPES 配置

- [x] Task 6: 修复PDF/Word导出XSS漏洞
  - [x] SubTask 6.1: 在 `backend/app/services/export.py` 的 _generate_html 方法中添加 html.escape 转义所有用户输入
  - [x] SubTask 6.2: 在 `backend/app/services/export.py` 的 _generate_portfolio_html 方法中添加 html.escape 转义所有用户输入
  - [x] SubTask 6.3: 在 export_to_word 方法中对用户输入添加转义处理

## P1 - 重要（本周内修复）

- [x] Task 7: 替换python-jose为PyJWT
  - [x] SubTask 7.1: 修改 `backend/app/core/security.py` 将 `from jose import JWTError, jwt` 替换为 `import jwt` 和 `from jwt.exceptions import PyJWTError`
  - [x] SubTask 7.2: 更新 decode_token 函数中的异常处理，将 JWTError 替换为 PyJWTError
  - [x] SubTask 7.3: 更新 `backend/requirements.txt` 将 python-jose 替换为 PyJWT

- [x] Task 8: Refresh Token版本控制
  - [x] SubTask 8.1: 修改 `backend/app/core/security.py` 的 create_refresh_token 函数，添加 token_version 参数并写入payload的jti字段
  - [x] SubTask 8.2: 修改 `backend/app/api/v1/auth.py` 的 login 函数，在创建refresh_token时传入token_version
  - [x] SubTask 8.3: 修改 `backend/app/api/v1/auth.py` 的 refresh_token 函数，验证refresh_token中的token_version与数据库一致

- [x] Task 9: 资源所有权验证
  - [x] SubTask 9.1: 修改 `backend/app/services/resource.py` 的 update_resource 方法，添加 user_id 参数并验证所有权
  - [x] SubTask 9.2: 修改 `backend/app/services/resource.py` 的 delete_resource 方法，添加 user_id 参数并验证所有权
  - [x] SubTask 9.3: 修改 `backend/app/api/v1/resources.py` 的 update_resource 和 delete_resource，传入 current_user_id 到 service 层

- [x] Task 10: 修复前端Token刷新竞态条件
  - [x] SubTask 10.1: 重构 `frontend/src/services/request.ts` 的Token刷新逻辑，使用Promise缓存替代模块级变量

- [x] Task 11: 软删除唯一约束修复
  - [x] SubTask 11.1: 修改 `backend/app/models/tag.py` 添加部分唯一索引（PostgreSQL WHERE is_deleted = false）
  - [x] SubTask 11.2: 修改 `backend/app/models/user.py` 的 email 和 username 字段添加部分唯一索引
  - [x] SubTask 11.3: 创建 Alembic 迁移脚本添加部分唯一索引

- [x] Task 12: 修复calculate_age空值处理
  - [x] SubTask 12.1: 修改 `backend/app/api/v1/students.py` 的 calculate_age 函数，处理 birth_date 为 None 的情况

## P2 - 建议（下周修复）

- [x] Task 13: 通知API响应格式统一
  - [x] SubTask 13.1: 修改 `backend/app/api/v1/notifications.py` 的 get_notifications 函数，将分页参数从 skip/limit 改为 page/page_size
  - [x] SubTask 13.2: 修改 `backend/app/schemas/notification.py` 的 NotificationListResponse，将 items 字段改为 data，添加 page/page_size/pages 字段
  - [x] SubTask 13.3: 更新 `frontend/src/services/notification.ts` 适配新的响应格式

- [x] Task 14: Portfolio字段长度约束
  - [x] SubTask 14.1: 修改 `backend/app/models/portfolio.py` 的 type 字段添加 String(50) 约束
  - [x] SubTask 14.2: 修改 `backend/app/models/portfolio.py` 的 title 字段添加 String(200) 约束

- [x] Task 15: 数据库索引优化
  - [x] SubTask 15.1: 为 `backend/app/models/lesson_plan.py` 的 status、subject、grade 字段添加索引
  - [x] SubTask 15.2: 为 `backend/app/models/resource.py` 的 file_type 字段添加索引
  - [x] SubTask 15.3: 为 `backend/app/models/notification.py` 的 read、type 字段添加索引

- [x] Task 16: 前端内存泄漏修复
  - [x] SubTask 16.1: 修改 `frontend/src/pages/Dashboard/index.tsx` 添加 AbortController 和 isMounted 标志
  - [x] SubTask 16.2: 修改 `frontend/src/hooks/useDropdownOptions.ts` 添加错误处理和 cleanup

- [x] Task 17: 安全响应头和健康检查修复
  - [x] SubTask 17.1: 在 `backend/app/main.py` 添加安全响应头中间件
  - [x] SubTask 17.2: 修改 `backend/app/main.py` 的 health_check_detailed 端点添加认证要求
  - [x] SubTask 17.3: 修改 `backend/app/main.py` 的 health_check 端点移除敏感信息

- [x] Task 18: N+1查询优化
  - [x] SubTask 18.1: 修改 `backend/app/services/student.py` 的 get_list 方法，使用批量查询替代循环计算progress

# Task Dependencies
- Task 7 (替换python-jose) 应在 Task 8 (Refresh Token版本控制) 之前完成
- Task 5 (文件上传安全) 中的 SubTask 5.4 依赖 SubTask 5.1
- Task 11 (软删除唯一约束) 需要创建数据库迁移
- Task 13 (通知API格式统一) 需要前后端同步修改
- Task 1-6 (P0) 无相互依赖，可并行执行
- Task 7-12 (P1) 中 Task 7 和 Task 8 有依赖关系，其余可并行
- Task 13-18 (P2) 无相互依赖，可并行执行

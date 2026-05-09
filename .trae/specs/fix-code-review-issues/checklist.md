# Checklist

## P0 - 安全漏洞修复验证

- [x] 资源API的GET列表接口需要认证，未认证请求返回401
- [x] 资源API的GET详情接口需要认证，未认证请求返回401
- [x] 密码重置接口需要管理员验证，无验证信息时拒绝重置
- [x] 所有service层的db.refresh()调用在事务上下文内执行
- [x] 前端setToken同时更新token和isAuthenticated状态
- [x] 文件上传验证MIME类型，伪造扩展名的文件被拒绝
- [x] 存储路径遍历攻击被阻止（包含../的路径被拒绝）
- [x] PDF导出中用户输入被HTML转义，XSS攻击无效
- [x] Word导出中用户输入被转义处理
- [x] 成长报告PDF导出中用户输入被HTML转义

## P1 - 重要问题修复验证

- [x] python-jose已替换为PyJWT，JWT功能正常工作
- [x] Refresh Token包含token_version，登出后旧Refresh Token无法使用
- [x] 修改密码后旧Refresh Token无法使用
- [x] 资源更新操作验证所有权，非所有者操作返回403
- [x] 资源删除操作验证所有权，非所有者操作返回403
- [x] 前端Token刷新无竞态条件，并发401请求只触发一次刷新
- [x] Tag模型的唯一约束仅对未删除记录生效
- [x] User模型的email唯一约束仅对未删除记录生效
- [x] User模型的username唯一约束仅对未删除记录生效
- [x] calculate_age函数处理birth_date为None的情况返回None

## P2 - 优化建议验证

- [x] 通知API列表响应使用data字段（非items）
- [x] 通知API分页参数使用page/page_size（非skip/limit）
- [x] 前端通知服务适配新的响应格式
- [x] Portfolio的type字段有String(50)长度约束
- [x] Portfolio的title字段有String(200)长度约束
- [x] LessonPlan的status/subject/grade字段有索引
- [x] Resource的file_type字段有索引
- [x] Notification的read/type字段有索引
- [x] Dashboard组件无内存泄漏，卸载后不更新状态
- [x] useDropdownOptions hook有错误处理和cleanup
- [x] HTTP响应包含安全头（X-Content-Type-Options, X-Frame-Options, X-XSS-Protection）
- [x] 详细健康检查端点需要认证
- [x] 基本健康检查端点不暴露敏感系统信息
- [x] 学生列表查询无N+1问题，使用批量查询计算progress

## 回归测试

- [x] 用户登录/注册流程正常
- [x] 课程CRUD操作正常
- [x] 学生CRUD操作正常
- [x] 教案CRUD操作正常
- [x] 资源上传/下载/删除操作正常
- [x] 成长档案CRUD操作正常
- [x] 通知列表/标记已读操作正常
- [x] PDF/Word导出功能正常
- [x] Token刷新流程正常
- [x] 前端页面无控制台错误

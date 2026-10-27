# Changelog

All notable changes to the AI培智教学平台 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-25

### Added
- 个别化教育计划（IEP / 一人一案）：自研六领域发展评估（感知 / 认知 / 语言与沟通 / 运动 / 生活自理 / 社会适应）、0–3 级掌握度评级、可配置评估模板与快照存档
- IEP 长短期目标管理（条件 + 可观察行为 + 达成标准 + 辅助等级）、计划状态机（草稿 / 待审定 / 已锁定）与修订版本链
- 目标达成率统计、期初 / 期末双快照对比雷达
- AI 起草 IEP 与学期成长报告（仅出草稿、教师人在回路逐条采纳、全程留痕、禁止杜撰医学诊断）
- IEP 编辑页分步 AI 生成：发展评估 / 长短期目标 / 支持措施三个步骤各自「AI 生成本页内容」，仅回填当前页
- AI 学期成长报告导出为 Markdown 文件
- IEP 一键导出 PDF
- 自定义头像：无依赖 Canvas 裁剪组件与后端头像上传接口（≤2MB、强制裁剪为正方形）
- 课程支持多个年级（`grades` 数组）与多个班级（`class_names`）
- 演示数据种子脚本 `scripts/seed_demo.py`（全虚构、幂等可重复）
- GitHub Actions CI/CD 流水线、Issue 模板与贡献指南

### Changed
- 报表口径诚实化：移除名不副实的平均进度与 AI 助手占位，热门课程改为真按选课人数排序
- 能力雷达：分母按各维度实际评分数，未评估维度留空不计 0
- 主题链路：接入 antd ConfigProvider，主题色/背景/文本映射为 token 并统一控件高度为 36px
- 硬编码主色改为跟随主题的 `color-mix` 变量，保留 rgba 回退
- 搜索框与工具栏：统一输入框与按钮高度、间距与换行规则
- 脚本与配置一致性：教师默认密码、版本号统一为 1.2.0，start.bat 初始化流程补齐
- AI 错误提示：原始异常与状态码替换为面向用户文案，原始信息仅落日志
- 后端脚本目录补充 README 说明
- 课程年级由单值 `grade` 改为 JSON 数组 `grades`，并新增班级多选字段 `class_names`（含 Alembic 迁移）
- AI 助手会话卡片的归档 / 重命名 / 删除三项操作收进「⋮」下拉菜单
- 成长报告提示词不再输出内部 ID / 编号等技术标识，证据引用改为中文可读表述
- 项目名称统一为「AI培智教学平台」
- 移除与「编辑资料」重复的「账户资料」菜单项
- 全局弹窗层级调至侧边栏之上、宽度按视口自适应；宽表增加横向滚动容器
- 邮箱改为选填：注册与个人资料编辑均不再强制填写邮箱，`users.email` 允许为空（含 Alembic 迁移 `b2c3d4e5f6a7`）
- 构建与 CI 运行时统一升级到 Node.js 24（CI 的 `NODE_VERSION` 与前端 Dockerfile 基准镜像同步调整，自带 npm 11），前端 `engines` 提升为 Node ≥ 20 / npm ≥ 10；README、一键启动脚本与版本兼容性矩阵同步更新

### Removed
- 邮箱验证码机制整体下线：移除注册邮箱验证码、邮箱验证码找回密码两条链路，及相关 API、数据模型、邮件发送工具、SMTP 配置与 `aiosmtplib` 依赖；密码重置统一为密保问题验证
- 删除 `verification_codes` 数据表（Alembic 迁移 `a1b2c3d4e5f6`）

### Fixed
- SQLite 迁移链：`b234c5e6f789`、`e789f0a1b234` 改用 batch 模式，全新库 upgrade/downgrade 全链通过
- AI 接入：会话、IEP 初稿与报告生成、连接测试全部 500 的问题
  - 统一 HTTP 客户端，拆分连接超时（60s）与读取超时（600s），避免网络不通时挂死
  - 状态码与网络异常（含 SSL 中间人拦截）映射为用户可读文案
- AI 会话消息加载：`MessageListSchema` 解包后 `response.data` 恒为空，消息列表一直不显示
- AI 会话未配置密钥时整页被引导页替换，会话列表不可用
- 会话重命名/归档/删除失败时静默吞异常，界面无反馈
- 前端读取后端错误字段错误（读 `detail`，实际在 `message`），错误只显示 HTTP 状态码
- 注册页与登录页的品牌特性区、表单副标题间距不一致
- 注册页「创建账号」标题在窄屏被顶出且无法滚动查看；必填项星标与「（可选）」标注不统一
- 成长报告 / AI 初稿把列表项写成 `{description, evidence_refs}` 对象导致的 `Objects are not valid as a React child` 渲染崩溃（前后端双层判型归一化）
- 成长报告弹窗被侧边栏遮挡、弹窗宽度在窄屏溢出
- AI 助手会话列表条目的日期与归档图标部分重合
- 前端全局请求 10s 超时导致 AI 生成类长耗时接口被中断，相关接口单独放宽超时
- GitHub Actions 流水线持续失败
  - 后端 Black / isort 检查未通过，`AIService._stream_chat` 复杂度超限（C901）：格式化代码并抽取流式请求 helper 降低复杂度
  - 前端 `npm ci` 在 Node 18（npm 10）下报 `Missing: @esbuild/<platform>@0.28.2 from lock file`：随 Node 24 + npm 11 升级解决，锁文件版本号与 `engines` 同步对齐
  - 后端镜像缺少 PostgreSQL 驱动（`asyncpg`）与 Alembic 同步驱动（`psycopg2`），使用 PostgreSQL 时容器启动即崩溃：补齐两项依赖
  - E2E 流程无法启动：MinIO 镜像已下架、`BACKEND_CORS_ORIGINS` 使用逗号分隔导致配置解析失败、Playwright fixture 首个参数未使用解构写法：移除 MinIO 依赖并统一端口为 8000/5173，CORS 改为 JSON 数组，启动前初始化预置教师账号

## [1.1.0] - 2026-07-11

### Added
- AI 助手：对话归档/取消归档、批量删除、前端会话筛选
- 用户认证：邮箱验证码注册与密码重置（SMTP 发送、10 分钟有效）
- E2E 测试：新增认证、课程、教案、成长档案、资源、设置、学生等测试规格
- 支持 Python 3.13 运行时

### Changed
- 后端：存储服务重构、启动逻辑与路由注册扩展、性能与稳定性优化
- 前端：课程/学生表单、仪表盘、通知、个人中心、报告等多页面优化
- 资源中心详情页增强
- 依赖与代码格式整理、类型提示修复、测试用例补充

### Fixed
- 修复多项功能缺陷与类型提示问题

## [1.0.0] - 2026-06-15

### Added
- 课程管理：课程CRUD、状态跟踪（草稿/进行中/已结课）、学生多对多关联
- 教案设计：模板库、创建编辑发布归档工作流、月度统计、PDF/Word导出
- 学生管理：信息管理、学习进度跟踪、CSV数据导出
- 成长档案：学生成长记录、多维度能力雷达图（认知/技能/创意/合作/注意力）
- 资源中心：文件拖拽上传/下载、本地+MinIO双存储、标签管理、文件预览、类型校验
- AI助手：多服务商支持（智谱/OpenAI/DeepSeek/SiliconFlow/Moonshot/通义千问）、Function Calling工具链、SSE流式响应、多轮对话记忆、API密钥加密存储
- 通知系统：站内通知、已读/未读管理、批量操作、未读数量统计
- 报告统计：仪表盘数据、课程/学生统计、月度趋势分析
- 用户认证：JWT双Token（Access 30分钟+Refresh 7天）、HttpOnly Cookie、bcrypt密码哈希、密保问题重置、账户锁定、Token版本化
- 安全防护：CSP/HSTS/X-Frame-Options安全头、滑动窗口速率限制、软删除、配置启动验证
- 主题定制：自定义主题色、预设管理、对比度警告、颜色历史
- 下拉选项：可配置学科/年级等下拉项管理
- Docker部署：开发+生产+E2E三套docker-compose、多阶段构建、健康检查
- 测试：后端90%+覆盖率、前端70%+覆盖率、Playwright E2E 10个规格
- 数据迁移：Alembic 8个迁移版本、SQLite/PostgreSQL双数据库支持
- 文档：README、API参考、系统架构文档、运维手册、数据字典、版本兼容性矩阵、CHANGELOG
- 一键启动：start.bat(Windows) / start.sh(macOS/Linux)

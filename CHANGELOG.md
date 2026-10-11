# Changelog

All notable changes to the AI教学平台 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - Unreleased

### Added
- 个别化教育计划（IEP / 一人一案）：自研六领域发展评估（感知 / 认知 / 语言与沟通 / 运动 / 生活自理 / 社会适应）、0–3 级掌握度评级、可配置评估模板与快照存档
- IEP 长短期目标管理（条件 + 可观察行为 + 达成标准 + 辅助等级）、计划状态机（草稿 / 待审定 / 已锁定）与修订版本链
- 目标达成率统计、期初 / 期末双快照对比雷达
- AI 起草 IEP 与学期成长报告（仅出草稿、教师人在回路逐条采纳、全程留痕、禁止杜撰医学诊断）
- IEP 一键导出 PDF
- 演示数据种子脚本 `scripts/seed_demo.py`（全虚构、幂等可重复）
- GitHub Actions CI/CD 流水线、Issue 模板与贡献指南

### Changed
- 报表口径诚实化：移除名不副实的平均进度与 AI 助手占位，热门课程改为真按选课人数排序
- 能力雷达：分母按各维度实际评分数，未评估维度留空不计 0

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

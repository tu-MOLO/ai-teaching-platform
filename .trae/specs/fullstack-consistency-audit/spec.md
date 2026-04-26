# 全链路代码审查与架构审计 Spec

## Why
AI教学平台经过多轮迭代后，前端、后端、数据库三层之间可能存在接口契约不一致、数据模型不同步、业务逻辑矛盾等问题，需要进行系统性审查以确保系统的一致性、可靠性和可维护性。

## What Changes
- 对前端React+TypeScript层、后端FastAPI+SQLAlchemy层、SQLite/PostgreSQL数据库层进行全链路审查
- 建立12维度一致性审查清单（接口路径、请求/响应字段、数据库表结构、索引、枚举值、错误码、权限点、业务规则、缓存Key、日志规范、环境配置、依赖版本）
- 输出差异报告、冗余清单、缺失功能清单及修复方案
- 执行清理和补全操作，确保三层完全一致
- 建立后续迭代红线机制

## Impact
- Affected specs: 全部业务模块（用户、权限、学生、课程、教案、作品集、资源、通知、报告等）
- Affected code:
  - 前端: `frontend/src/services/*`, `frontend/src/types/*`, `frontend/src/pages/*`, `frontend/src/stores/*`
  - 后端: `backend/app/api/v1/*`, `backend/app/models/*`, `backend/app/schemas/*`, `backend/app/services/*`, `backend/app/core/*`
  - 数据库: SQLite/PostgreSQL DDL, Alembic迁移脚本

## ADDED Requirements

### Requirement: 审查基线建立
系统 SHALL 在审查开始前建立完整的基线快照，包括：
- Git commit ID 锁定
- 前端依赖版本锁定（package.json）
- 后端依赖版本锁定（requirements.txt）
- 数据库当前DDL快照
- 环境变量配置快照
- API接口文档快照（基于FastAPI OpenAPI schema）

#### Scenario: 成功建立基线
- **WHEN** 审查任务启动
- **THEN** 系统输出包含上述所有内容的《一致性审查清单》模板，涵盖12大审查维度

### Requirement: 数据库层一致性审查
系统 SHALL 对数据库层进行逐表逐字段审查，确保：
- 所有表的字段名称、类型、默认值、约束、注释与后端ORM模型完全一致
- 外键关系、索引定义与业务需求匹配
- 枚举类型与前后端定义同步
- 无废弃对象、无冗余索引、无命名不规范的情况

#### Scenario: 发现数据库差异
- **WHEN** 数据库字段与ORM模型不一致时
- **THEN** 系统生成《数据库差异报告》，包含具体差异描述、影响分析及修复SQL脚本

### Requirement: 后端层完整性审查
系统 SHALL 对后端API层进行全面扫描，识别：
- 孤立接口：后端已实现但前端未调用的接口
- 缺失接口：前端调用但后端未实现的接口
- 接口契约不一致：URL路径、HTTP方法、请求参数、响应格式、错误码不匹配的情况
- 事务边界、权限注解、日志埋点、缓存策略的合理性

#### Scenario: 识别孤立或缺失接口
- **WHEN** 扫描Controller/Service/DAO层代码
- **THEN** 输出《后端冗余清单》与《缺失功能清单》，标注每个问题的严重程度和修复建议

### Requirement: 前端层一致性审查
系统 SHALL 对前端层进行全局审查，验证：
- 所有API调用的使用率统计（识别零调用接口）
- 页面权限、菜单路由、按钮显隐逻辑与后端权限点一致
- 表单校验规则、下拉枚举值、错误提示文案与后端数据字典匹配
- 类型定义文件与后端Schema完全对齐

#### Scenario: 发现前端不一致问题
- **WHEN** 审查前端API调用、权限控制、数据校验逻辑
- **THEN** 输出《前端未使用接口列表》与《前端缺失功能列表》，提供删除或补录方案

### Requirement: 三方一致性校验
系统 SHALL 执行跨层一致性验证，确保：
- 前端请求payload → 后端接收Schema → 数据库存储模型的字段、类型、必填项100%吻合
- 权限控制在三层中的实现逻辑一致
- 错误码和错误消息在三层中统一
- 缓存Key命名和数据更新策略协调

#### Scenario: 执行自动化契约测试
- **WHEN** 使用真实请求payload进行双向验证
- **THEN** 所有接口的字段映射、类型转换、校验规则通过验证，任何不一致立即记录为Issue

### Requirement: 清理与优化执行
系统 SHALL 根据审查结果执行以下操作：
- 删除冗余接口、废弃字段、死代码、无用索引
- 补全缺失功能（按业务价值优先级排序）
- 统一异常处理、日志ID传递、错误码规范
- 确保清理后零编译错误、零启动异常、零警告

#### Scenario: 执行清理操作
- **WHEN** 审查确认冗余或缺失项
- **THEN** 系统执行删除或补全操作，并通过编译、打包、部署验证

### Requirement: 交付物与验收标准
系统 SHALL 输出以下交付物并满足验收标准：
- 《一致性审查总报告》（含差异、修复、验证三大部分）
- 《整改后架构快照》
- 前后端编译、打包、部署零错误
- 所有接口契约测试、单元测试通过率100%
- 性能指标优于基线（慢SQL数量减少、索引覆盖率提升）

#### Scenario: 通过最终验收
- **WHEN** 所有修复项完成并验证
- **THEN** 系统输出完整报告，建立后续迭代红线机制

## MODIFIED Requirements

### Requirement: 接口契约管理流程
原有接口开发流程 SHALL 增加以下强制性要求：
- 任何新增接口、字段、权限点必须同步更新三方文档（前端类型定义、后端Schema、数据库迁移脚本）
- 必须新增对应的契约测试用例
- 未满足以上要求的代码禁止合并到主干分支

### Requirement: 错误处理统一规范
原有的分散式错误处理 SHALL 统一为：
- 后端使用统一的ErrorCode枚举和BusinessException
- 前端使用统一的BusinessError类和错误码映射
- 数据库层记录统一的AuditLog
- 同一业务异常在三层返回相同的code和message

## REMOVED Requirements

无（本次审查不删除现有功能，仅清理冗余代码和补全缺失功能）

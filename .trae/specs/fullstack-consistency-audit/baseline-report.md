# AI教学平台 - 全链路一致性审查基线报告

**审查日期**: 2026-04-25
**审查版本**: 基线快照 v1.0
**项目状态**: 未初始化Git仓库（本地开发状态）

---

## 一、项目概览

### 1.1 基本信息
| 属性 | 值 |
|------|-----|
| **项目名称** | AI Teaching Platform (AI教学平台) |
| **版本号** | 1.0.0 |
| **架构模式** | 前后端分离（B/S架构） |
| **Git状态** | ❌ 未初始化Git仓库 |
| **数据库类型** | SQLite (开发) / PostgreSQL (生产) |
| **对象存储** | MinIO |

### 1.2 技术栈快照

#### 前端技术栈 (frontend/package.json)
```json
{
  "核心框架": "React 18.2.0 + TypeScript 5.2.2",
  "构建工具": "Vite 5.0.8",
  "UI组件库": "Ant Design 5.12.0 + @ant-design/icons 5.2.0",
  "HTTP客户端": "Axios 1.6.0",
  "状态管理": "Zustand 4.4.0",
  "路由": "React Router DOM 6.21.0",
  "图表库": "ECharts 5.4.0 + echarts-for-react 3.0.0",
  "编辑器": "@uiw/react-md-editor 4.0.0",
  "文件上传": "react-dropzone 14.2.0",
  "日期处理": "dayjs 1.11.0"
}
```

#### 后端技术栈 (backend/requirements.txt)
```
核心框架: FastAPI 0.109.2 + Uvicorn 0.27.1 (ASGI服务器)
ORM框架: SQLAlchemy 2.0.27 (async模式) + Alembic 1.13.1 (数据库迁移)
数据验证: Pydantic 2.6.1 + pydantic-settings 2.1.0
认证安全: python-jose 3.3.0 (JWT) + passlib 1.7.4 (密码哈希) + bcrypt
文件存储: MinIO 7.2.4
缓存: Redis 5.0.1 (可选)
HTTP客户端: httpx 0.26.0 + aiohttp 3.9.3
导出功能: weasyprint 59.0 (PDF) + python-docx 0.8.11 (Word)
测试框架: pytest 7.4.4 + pytest-asyncio 0.23.4 + factory-boy 3.3.0
代码质量: black 24.1.1 + isort 5.13.2 + flake8 7.0.0 + mypy 1.8.0
数据库驱动: asyncpg 0.29.0 (PostgreSQL异步) + aiosqlite 0.19.0 (SQLite异步) + psycopg2-binary 2.9.9
```

---

## 二、数据库层基线

### 2.1 基础模型类 (BaseModel)

所有业务模型继承自 `BaseModel`，包含以下混入类：

| 混入类 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| **UUIDMixin** | `id` | String(36), PK | UUID主键，自动生成 |
| **TimestampMixin** | `created_at` | DateTime(tz=True) | 创建时间，自动填充 |
| | `updated_at` | DateTime(tz=True) | 更新时间，自动更新 |
| **SoftDeleteMixin** | `deleted_at` | DateTime(tz=True), Nullable | 软删除时间 |
| | `is_deleted` | Boolean, default=False | 软删除标志 |
| **VersionMixin** | `version` | Integer, default=1 | 乐观锁版本号 |

### 2.2 业务数据模型清单

#### ✅ 已识别的数据表（14张）

| 序号 | 表名 | 模型类 | 说明 | 关键字段 |
|------|------|--------|------|----------|
| 1 | **users** | User | 用户表 | email, username, hashed_password, role(UserRole), status(UserStatus), is_active, is_verified, is_superuser |
| 2 | **students** | Student | 学生表 | name, gender(Gender), birth_date, grade, class_name, user_id(FK→users) |
| 3 | **courses** | Course | 课程表 | name, subject, grade, teacher, user_id(FK→users), status |
| 4 | **portfolios** | Portfolio | 成长档案表 | student_id(FK→students), type, title, content, cognitive/skill/creativity/cooperation/attention_score |
| 5 | **lesson_plans** | LessonPlan | 教案表 | user_id(FK→users), template_id(FK→lesson_templates), title, subject, grade, status(LessonPlanStatus) |
| 6 | **lesson_templates** | LessonTemplate | 教案模板表 | （待补充完整定义） |
| 7 | **tags** | Tag | 标签表 | （待补充完整定义） |
| 8 | **resources** | Resource | 资源表 | （待补充完整定义） |
| 9 | **notifications** | Notification | 通知表 | type(NotificationType) |
| 10 | **permissions** | Permission | 权限表 | （待补充完整定义） |
| 11 | **roles** | Role | 角色表 | （待补充完整定义） |
| 12 | **role_permissions** | RolePermission | 角色权限关联表 | （待补充完整定义） |
| 13 | **audit_logs** | AuditLog | 审计日志表 | action(AuditAction) |
| 14 | **dropdown_options** | DropdownOption | 下拉选项配置表 | （待补充完整定义） |

#### 📊 枚举类型定义

| 枚举名 | 可选值 | 所在模块 |
|--------|--------|----------|
| **UserRole** | teacher, admin | models/user.py |
| **UserStatus** | active, inactive, suspended, pending | models/user.py |
| **Gender** | male, female, other | models/student.py |
| **LessonPlanStatus** | draft, published, archived | models/lesson_plan.py |
| **NotificationType** | （待确认） | models/notification.py |
| **AuditAction** | （待确认） | models/audit_log.py |

#### 🔍 索引定义（已发现）

| 表名 | 索引名 | 字段 | 类型 |
|------|--------|------|------|
| users | ix_users_email | email | UNIQUE |
| users | ix_users_username | username | UNIQUE |
| students | ix_students_name | name | 普通索引 |
| students | ix_students_grade | grade | 普通索引 |
| students | ix_students_class_name | class_name | 普通索引 |
| students | ix_students_user_id | user_id | 外键索引 |
| students | **ix_students_grade_class** | grade, class_name | **复合索引** |
| courses | ix_courses_name | name | 普通索引 |
| courses | ix_courses_subject | subject | 普通索引 |
| courses | ix_courses_grade | grade | 普通索引 |
| courses | ix_courses_user_id | user_id | 外键索引 |
| courses | **ix_courses_subject_grade** | subject, grade | **复合索引** |
| courses | **ix_courses_status** | status | **普通索引** |
| portfolios | ix_portfolios_student_id | student_id | 外键索引 |
| portfolios | ix_portfolios_user_id | user_id | 外键索引 |
| lesson_plans | ix_lesson_plans_user_id | user_id | 外键索引 |
| lesson_plans | ix_lesson_plans_template_id | template_id | 外键索引 |

#### ⚠️ Check约束（已发现）

| 表名 | 约束名 | 约束条件 |
|------|--------|----------|
| portfolios | ck_cognitive_score_range | cognitive_score BETWEEN 0 AND 100 |
| portfolios | ck_skill_score_range | skill_score BETWEEN 0 AND 100 |
| portfolios | ck_creativity_score_range | creativity_score BETWEEN 0 AND 100 |
| portfolios | ck_cooperation_score_range | cooperation_score BETWEEN 0 AND 100 |
| portfolios | ck_attention_score_range | attention_score BETWEEN 0 AND 100 |

---

## 三、后端API层基线

### 3.1 API路由注册结构

**基础路径前缀**: `/api/v1`

#### 路由模块注册表（13个模块）

| 序号 | 路由模块 | 路径前缀 | 标签 | 文件位置 |
|------|----------|----------|------|----------|
| 1 | **auth** | `/auth` | 认证 | api/v1/auth.py |
| 2 | **users** | `/users` | 用户 | api/v1/users.py |
| 3 | **permissions** | （无额外前缀） | 权限管理 | api/v1/permissions.py |
| 4 | **tags** | `/tags` | 标签 | api/v1/tags.py |
| 5 | **resources** | `/resources` | 资源 | api/v1/resources.py |
| 6 | **lesson-templates** | `/lesson-templates` | 教案模板 | api/v1/lesson_templates.py |
| 7 | **lesson-plans** | `/lesson-plans` | 教案 | api/v1/lesson_plans.py |
| 8 | **students** | `/students` | 学生 | api/v1/students.py |
| 9 | **portfolios** | `/portfolios` | 成长档案 | api/v1/portfolios.py |
| 10 | **courses** | `/courses` | 课程 | api/v1/courses.py |
| 11 | **reports** | `/reports` | 报告 | api/v1/reports.py |
| 12 | **notifications** | `/notifications` | 通知 | api/v1/notifications.py |
| 13 | **dropdown_options** | （无额外前缀） | 下拉选项 | api/v1/dropdown_options.py |

### 3.2 已识别的API端点（部分示例）

#### 🔐 认证模块 (/api/v1/auth)

| HTTP方法 | 路径 | 功能 | 认证要求 | 响应模型 |
|----------|------|------|----------|----------|
| POST | `/auth/login` | 用户登录 | 否 | LoginResponse |
| POST | `/auth/register` | 用户注册 | 否 | MessageResponse (201) |
| POST | `/auth/refresh` | 刷新Token | 否 | TokenData |
| GET | `/auth/me` | 获取当前用户 | 是 (Bearer Token) | CurrentUserResponse |
| POST | `/auth/logout` | 用户登出 | 是 | MessageResponse |
| POST | `/auth/password/change` | 修改密码 | 是 | MessageResponse |

#### 👨‍🎓 学生管理模块 (/api/v1/students)

| HTTP方法 | 路径 | 功能 | 认证要求 | 响应模型 |
|----------|------|------|----------|----------|
| POST | `/students` | 创建学生 | 是 | DataResponse[StudentSchema] (201) |
| GET | `/students/{student_id}` | 获取学生详情 | 是 | DataResponse[StudentSchema] |
| GET | `/students` | 获取学生列表（分页+筛选） | 是 | ListResponse[StudentSchema] |

> **注**: 其他CRUD操作（PUT, DELETE）及更多端点待完整提取...

### 3.3 统一响应格式

#### 标准成功响应
```typescript
// 单对象响应
interface DataResponse<T> {
  data: T;
}

// 列表响应（带分页元数据）
interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// 简单消息响应
interface MessageResponse {
  message: string;
  code: string;  // 如 "success"
}
```

#### 标准错误响应
```typescript
interface ApiErrorResponse {
  error: string;      // 错误码（如 "VALIDATION_ERROR"）
  code: string;       // 错误代码（与error相同或HTTP状态码）
  message: string;    // 错误消息
  details?: any;      // 详细错误信息（可选）
  request_id: string; // 请求追踪ID（8位UUID）
}
```

### 3.4 异常处理体系

**错误码枚举** (backend/app/core/exceptions.py - 待完整提取):
- `DATA_VALIDATION_ERROR` - 数据验证错误
- `UNKNOWN_ERROR` - 未知错误
- （待补充完整枚举列表）

**异常处理器**:
1. `BusinessException` → 返回业务错误（4xx）
2. `RequestValidationError` → 返回参数验证失败（422）
3. `HTTPException` → 返回HTTP错误
4. `Exception` → 兜底返回500服务器错误

---

## 四、前端层基线

### 4.1 项目结构

```
frontend/src/
├── components/        # 公共组件
│   ├── Common/       # 通用组件（ConfigurableSelect）
│   ├── Courses/      # 课程相关组件
│   ├── Header/       # 头部导航
│   ├── Layout/       # 布局组件
│   ├── Portfolio/    # 作品集组件
│   ├── ResourceCenter/# 资源中心组件
│   ├── Sidebar/      # 侧边栏
│   ├── Students/     # 学生相关组件
│   └── Theme/        # 主题设置组件
├── pages/            # 页面组件
│   ├── AIAssistant/  # AI助手
│   ├── Courses/      # 课程页面（Create, Edit, Index）
│   ├── Dashboard/    # 仪表盘
│   ├── LessonPlanner/# 教案页面（Create, Detail, Edit, List）
│   ├── Login/        # 登录页
│   ├── Portfolio/    # 作品集页面
│   ├── Profile/      # 个人中心
│   ├── Register/     # 注册页
│   ├── Reports/      # 报告页
│   ├── ResourceCenter/# 资源中心
│   ├── Settings/     # 设置页
│   └── Students/     # 学生页面（Create, Edit, Index）
├── services/         # API服务层（15个模块）
├── stores/           # 状态管理（Zustand）
│   ├── auth.ts       # 认证状态
│   ├── dashboard.ts  # 仪表盘数据
│   ├── portfolioTypes.ts # 作品集类型
│   ├── theme.ts      # 主题状态
│   └── user.ts       # 用户状态
├── types/            # TypeScript类型定义
├── constants/        # 常量定义
├── hooks/            # 自定义Hooks
├── router/           # 路由配置
└── utils/            # 工具函数
```

### 4.2 前端API服务层清单

| 服务文件 | 对应后端模块 | 说明 |
|----------|--------------|------|
| auth.ts | /api/v1/auth | 认证相关（登录、注册、Token刷新） |
| user.ts | /api/v1/users | 用户管理 |
| student.ts | /api/v1/students | 学生管理 |
| course.ts | /api/v1/courses | 课程管理 |
| portfolio.ts | /api/v1/portfolios | 成长档案管理 |
| lessonPlan.ts | /api/v1/lesson-plans | 教案管理 |
| lessonTemplate.ts | /api/v1/lesson-templates | 教案模板管理 |
| tag.ts | /api/v1/tags | 标签管理 |
| resource.ts | /api/v1/resources | 资源管理 |
| notification.ts | /api/v1/notifications | 通知管理 |
| report.ts | /api/v1/reports | 报告管理 |
| permission.ts | /api/v1/permissions | 权限管理 |
| dropdownOption.ts | /api/v1/dropdown_options | 下拉选项配置 |
| request.ts | - | Axios实例封装（拦截器、Token刷新） |
| response.ts | - | 响应数据处理工具 |
| api.ts | - | 导出request实例 |

### 4.3 HTTP客户端配置

**Axios实例配置** (services/request.ts):
- **baseURL**: `/api/v1`
- **timeout**: 10000ms (10秒)
- **请求拦截器**: 自动附加Bearer Token
- **响应拦截器**:
  - 自动解包单对象响应（提取data字段）
  - 保留列表响应的元数据（total, page等）
  - 401错误自动刷新Token并重试
  - 统一错误处理为BusinessError对象

### 4.4 状态管理 (Zustand Stores)

| Store名称 | 文件 | 管理状态 |
|-----------|------|----------|
| **AuthStore** | stores/auth.ts | token, refreshToken, 用户信息, 登录/登出 |
| **DashboardStore** | stores/dashboard.ts | 仪表盘统计数据 |
| **PortfolioTypesStore** | stores/portfolioTypes.ts | 作品集类型列表 |
| **ThemeStore** | stores/theme.ts | 主题配置（颜色、预设） |
| **UserStore** | stores/user.ts | 当前用户详细信息 |

---

## 五、环境配置基线

### 5.1 关键环境变量 (backend/.env.example)

| 分类 | 变量名 | 默认值 | 说明 |
|------|--------|--------|------|
| **应用** | APP_NAME | "AI Teaching Platform" | 应用名称 |
| | APP_VERSION | "1.0.0" | 应用版本 |
| | DEBUG | true | 调试模式 |
| **API** | API_V1_STR | /api/v1 | API路径前缀 |
| **CORS** | BACKEND_CORS_ORIGINS | localhost:3000,5173 | 允许的跨域来源 |
| **数据库** | DATABASE_URL | postgresql+asyncpg://... | 数据库连接串 |
| | DATABASE_POOL_SIZE | 20 | 连接池大小 |
| | DATABASE_MAX_OVERFLOW | 10 | 最大溢出连接数 |
| **JWT** | SECRET_KEY | (需修改) | JWT签名密钥 |
| | ALGORITHM | HS256 | 签名算法 |
| | ACCESS_TOKEN_EXPIRE_MINUTES | 30 | Access Token有效期（分钟） |
| | REFRESH_TOKEN_EXPIRE_DAYS | 7 | Refresh Token有效期（天） |
| **MinIO** | MINIO_ENDPOINT | localhost:9000 | MinIO服务地址 |
| | MINIO_BUCKET_NAME | ai-teaching | 存储桶名称 |
| **文件上传** | MAX_UPLOAD_SIZE | 104857600 (100MB) | 最大上传大小 |
| | ALLOWED_EXTENSIONS | .pdf,.doc,... | 允许的文件扩展名 |
| **Redis** | REDIS_URL | (可选) | Redis连接串 |
| **日志** | LOG_LEVEL | INFO | 日志级别 |

---

## 六、12大审查维度检查清单模板

### ✅ 维度1: 接口路径一致性
- [ ] 所有后端注册的路由路径与前端的API调用路径完全匹配（包括前缀/api/v1）
- [ ] URL参数命名一致（如student_id vs id）
- [ ] 查询参数命名一致（如page_size vs pageSize vs perPage）

### ✅ 维度2: 请求/响应字段一致性
- [ ] 前端发送的请求体字段与后端Pydantic Schema定义一一对应
- [ ] 后端返回的响应字段前端都有对应的TypeScript类型定义
- [ ] 字段命名风格统一（snake_case vs camelCase转换正确）
- [ ] 可选/必填字段在三层中定义一致

### ✅ 维度3: 数据库表结构一致性
- [ ] ORM模型的每个字段都在数据库中有对应列
- [ ] 字段类型映射正确（Python type ↔ DB type）
- [ ] 默认值、约束、注释在ORM和DDL中一致
- [ ] 无孤立表（有ORM模型但无对应业务逻辑使用）

### ✅ 维度4: 索引定义合理性
- [ ] 频繁查询的字段都有适当的索引
- [ ] 无重复索引（相同字段组合多次索引）
- [ ] 复合索引的字段顺序符合查询模式
- [ ] 无从未使用的无用索引

### ✅ 维度5: 枚举值同步性
- [ ] 所有枚举类型在后端Python、前端TypeScript、数据库中值完全一致
- [ ] 枚举值的显示名称（label）在三层中统一
- [ ] 新增枚举值时三端同步更新

### ✅ 维度6: 错误码统一性
- [ ] 使用统一的ErrorCode枚举定义所有业务错误码
- [ ] 同一业务异常在前端、后端、文档中返回相同的code和message
- [ ] HTTP状态码使用符合RESTful规范
- [ ] 错误响应格式统一（包含error, code, message, request_id）

### ✅ 维度7: 权限点对齐
- [ ] 后端每个敏感接口都有权限注解或检查
- [ ] 前端路由守卫与后端权限点一一对应
- [ ] 按钮/菜单显隐依赖的权限标识与后端匹配
- [ ] 角色权限矩阵在前后端数据库三方一致

### ✅ 维度8: 业务规则一致性
- [ ] 同一业务规则在三层的实现逻辑一致
- [ ] 数据校验规则（长度、格式、范围）前后端统一
- [ ] 状态机转换规则（如订单状态流转）三端同步
- [ ] 计算公式（如年龄计算、评分计算）结果一致

### ✅ 维度9: 缓存Key规范
- [ ] 缓存Key命名遵循统一规范（如 `module:id:action`）
- [ ] 缓存失效策略与数据更新操作协调
- [ ] 无缓存穿透、雪崩、击穿风险
- [ ] 前后端缓存策略不冲突

### ✅ 维度10: 日志规范性
- [ ] 所有关键操作都有日志记录
- [ ] 日志级别使用正确（DEBUG/INFO/WARNING/ERROR）
- [ ] request_id在请求生命周期内传递
- [ ] 敏感信息（密码、Token）不出现在日志中

### ✅ 维度11: 环境配置一致性
- [ ] 开发/生产环境配置分离
- [ ] 敏感信息（密钥、密码）不硬编码在代码中
- - 前端环境变量通过构建时注入（非运行时）
- [ ] 配置项有默认值和验证逻辑

### ✅ 维度12: 依赖版本兼容性
- [ ] 前后端依赖版本固定（使用lock文件）
- [ ] 无已知的安全漏洞依赖
- [ ] 同类库不重复引入（如两个HTTP客户端）
- - 依赖版本之间无冲突

---

## 七、后续审查重点建议

基于基线分析，建议优先审查以下高风险区域：

### 🔴 高优先级（可能存在严重不一致）
1. **学生模型user_id字段类型不一致**
   - 后端ORM定义为 `Optional[int]` (student.py L83)
   - 但BaseModel使用UUID主键（String(36)）
   - **疑似Bug**: 应为 `Optional[str]` 而非 `Optional[int]`

2. **权限体系双重实现**
   - 存在硬编码权限（LEGACY_ROLE_PERMISSIONS in auth.py）
   - 同时也有动态权限服务（PermissionService）
   - 可能导致权限判断混乱

3. **课程status字段未使用枚举**
   - Course.status 使用 String(20) 而非 Enum
   - 可能导致状态值不一致

### 🟡 中优先级（需要详细比对）
4. **前端类型定义完整性** - 需要逐一核对types/目录与后端Schema
5. **API使用率统计** - 识别零调用的孤立接口
6. **外键关系完整性** - 验证所有FK引用的有效性
7. **索引覆盖率分析** - 检查是否有缺失索引影响性能

### 🟢 低优先级（优化改进）
8. **注释和文档完善度**
9. **代码规范统一性**（命名风格、导入顺序）
10. **废弃代码清理**

---

## 八、基线锁定声明

本基线报告作为全链路一致性审查的**唯一参考基准**，所有后续审查发现的差异都将相对于此基线进行记录和修复。

**下一步行动**:
- 启动阶段二：数据库层逐表逐字段审查
- 启动阶段三：后端API接口完整性扫描
- 启动阶段四：前端调用一致性验证

---

*报告生成时间: 2026-04-25*
*审查工具: AI-Assisted Code Review System*

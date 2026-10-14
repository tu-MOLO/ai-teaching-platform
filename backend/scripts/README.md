# backend/scripts 脚本说明

统一运行方式（在 `backend/` 目录下，使用项目虚拟环境）：

```bash
# Windows
venv\Scripts\python.exe -m scripts.<脚本名>
# macOS / Linux
python3 -m scripts.<脚本名>
```

所有脚本都会自行把 `backend/` 加入 `sys.path`，因此**不需要**设置 `PYTHONPATH`；
脚本内部按 `app.xxx` 导入应用代码。

## 初始化类（可重复执行，幂等）

| 脚本 | 用途 | 前置条件 |
| --- | --- | --- |
| `init_dropdown_options` | 写入可配置下拉选项（学生性别、年级等基础字典） | 表结构已存在（`alembic upgrade head`） |
| `init_tags` | 写入默认资源标签 | 同上 |
| `init_templates` | 写入默认教案模板 | 同上 |
| `init_data` | 创建/更新默认教师账号，并补齐标签、教案模板、下拉选项 | 同上 |
| `seed_demo` | 生成一整套全虚构演示数据（学生、课程、教案、资源、成长档案、IEP） | 同上；会重置 `teacher` 账号密码 |

默认教师账号由环境变量覆盖，缺省值三处一致（`start.bat`、`init_data.py`、`seed_demo.py`）：

- `DEFAULT_TEACHER_USERNAME`（默认 `teacher`）
- `DEFAULT_TEACHER_PASSWORD`（默认 `Teacher@Local2026!`）

`init_dropdown_options / init_tags / init_templates / init_data` 由 `start.bat` 在启动前自动执行。
`seed_demo` **不在**默认启动流程中，需显式设置 `SEED_DEMO=1` 后重跑 `start.bat`，或手动执行。

## 运维 / 迁移类

| 脚本 | 用途 | 前置条件 |
| --- | --- | --- |
| `create_user.py` | 手动创建或更新一个教师账号（命令行传参） | 表结构已存在 |
| `full_acceptance.py` | 端到端验收：直连 ASGI app 与数据库，跑一遍全链路并输出结果 | 依赖已安装（`httpx`），会真实读写数据库，仅用于本地验收 |
| `migrate_sqlite_to_postgres.py` | SQLite 全量数据迁移到 PostgreSQL | `PG_DATABASE_URL`；目标库表结构已建好 |
| `migrate_local_to_minio.py` | 把 `storage/` 下文件上传到 MinIO | MinIO 环境变量（`MINIO_ENDPOINT` 等）已配置、服务可达 |

## 一次性 / 历史脚本（保留备查，日常无需运行）

| 脚本 | 说明 |
| --- | --- |
| `fix_e712.py` | 批量把 SQLAlchemy 查询上下文里的 `== True/False` 改写成 `is_()` 形式 |
| `fix_noqa.py` | 修正上一步遗留的 `# noqa: E712` 注释位置 |
| `restore_untracked.py` | 从 git 历史恢复被误删的未跟踪文件 |

这三个脚本属于代码整理/事故恢复的一次性工具，改动范围是全仓库文件，运行前先确认工作区干净。

"""
SQLite → PostgreSQL 数据迁移脚本

用于将本地 SQLite 数据库中的全部数据迁移到 PostgreSQL。
使用 SQLAlchemy 批量导出/导入，支持所有业务表。

用法:
    python scripts/migrate_sqlite_to_postgres.py [--force | --yes | -y]

选项:
    --force, --yes, -y    跳过确认提示，直接执行迁移（适用于自动化/CI）

环境变量:
    SQLITE_DATABASE_URL: SQLite 源数据库 URL（默认 sqlite+aiosqlite:///./ai_teaching.db）
    PG_DATABASE_URL:    PostgreSQL 目标数据库 URL
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# 确保 backend 目录在 sys.path 中
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.database import Base
from app.core.logging import get_logger

logger = get_logger(__name__)

# 需要迁移的数据模型（按外键依赖顺序排列）
MODEL_ORDER = [
    "users",
    "audit_logs",
    "ai_configs",
    "ai_conversations",
    "ai_messages",
    "dropdown_options",
    "tags",
    "courses",
    "students",
    "course_student",
    "lesson_templates",
    "lesson_plans",
    "portfolios",
    "resources",
    "resource_tag_association",
    "notifications",
]


def get_table_names() -> list[str]:
    """获取 Base 中所有已注册的表名"""
    return [name for name in MODEL_ORDER if name in Base.metadata.tables]


async def get_row_count(engine, table_name: str) -> int:
    """获取表中行数"""
    async with engine.connect() as conn:
        result = await conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
        return result.scalar() or 0


async def export_table(engine, table_name: str) -> list[dict]:
    """从源数据库导出单个表的所有数据"""
    table = Base.metadata.tables[table_name]
    async with engine.connect() as conn:
        result = await conn.execute(select(table))
        columns = [col.key for col in table.columns]
        rows = []
        for row in result:
            row_dict = {}
            for col in columns:
                val = getattr(row, col, None)
                if isinstance(val, datetime):
                    val = val.replace(tzinfo=None)
                row_dict[col] = val
            rows.append(row_dict)
        return rows


BATCH_SIZE = 500


async def import_table(engine, table_name: str, rows: list[dict]):
    """向目标数据库批量导入数据"""
    if not rows:
        return 0

    table = Base.metadata.tables[table_name]
    async with engine.begin() as conn:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            await conn.execute(table.insert(), batch)
    return len(rows)


async def migrate(source_url: str, target_url: str, force: bool = False):  # noqa: C901
    """执行完整迁移"""
    logger.info("=" * 60)
    logger.info("SQLite → PostgreSQL 数据迁移开始")
    logger.info(f"源数据库: {source_url}")
    logger.info(f"目标数据库: {target_url}")
    logger.info("=" * 60)

    # 创建引擎
    source_engine = create_async_engine(source_url, echo=False)
    target_engine = create_async_engine(target_url, echo=False)

    try:
        # 1. 在目标数据库中创建所有表（如果不存在）
        async with target_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("目标数据库表结构已创建")

        # 2. 验证表一致
        source_tables = set(get_table_names())
        target_tables = set(Base.metadata.tables.keys())
        if source_tables - target_tables:
            logger.warning(f"源数据库有额外表: {source_tables - target_tables}")

        # 3. 统计源数据
        logger.info("\n统计源数据行数:")
        total_rows = 0
        table_counts = {}
        for table_name in get_table_names():
            count = await get_row_count(source_engine, table_name)
            table_counts[table_name] = count
            total_rows += count
            logger.info(f"  {table_name}: {count} 行")
        logger.info(f"共计 {total_rows} 行\n")

        # 4. 确认迁移
        if total_rows == 0:
            logger.warning("源数据库为空，无需迁移")
            return

        if not force:
            confirm = input(f"确认将 {total_rows} 行数据迁移到目标数据库？(y/N): ")
            if confirm.lower() != "y":
                logger.info("迁移已取消")
                return
        else:
            logger.info("--force 模式：跳过确认，直接执行迁移")

        # 5. 执行迁移（带事务回滚保护）
        migrated_total = 0
        try:
            # 使用事务包装所有导入操作
            async with target_engine.begin() as conn:
                for table_name in get_table_names():
                    count = table_counts.get(table_name, 0)
                    if count == 0:
                        logger.info(f"  跳过 {table_name}（无数据）")
                        continue

                    logger.info(f"  迁移 {table_name} ({count} 行)...")
                    rows = await export_table(source_engine, table_name)
                    try:
                        table = Base.metadata.tables[table_name]
                        for i in range(0, len(rows), BATCH_SIZE):
                            batch = rows[i : i + BATCH_SIZE]
                            await conn.execute(table.insert(), batch)
                        migrated_total += count
                        logger.info(f"  ✓ {table_name}: {count}/{count} 行")
                    except Exception as e:
                        logger.error(f"  ✗ {table_name} 导入失败: {e}")
                        logger.error("事务将自动回滚，目标数据库保持原状态")
                        raise

            logger.info("=" * 60)
            logger.info(f"迁移完成! 共迁移 {migrated_total} 行数据")
            logger.info("=" * 60)
        except Exception:
            logger.error("迁移失败，事务已自动回滚。目标数据库未受影响。")
            raise

        # 6. 验证迁移结果
        logger.info("\n验证目标数据:")
        for table_name in get_table_names():
            source_count = table_counts[table_name]
            target_count = await get_row_count(target_engine, table_name)
            status = "✓" if source_count == target_count else "✗"
            logger.info(f"  {status} {table_name}: 源={source_count}, 目标={target_count}")

    finally:
        await source_engine.dispose()
        await target_engine.dispose()


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(
        description="SQLite → PostgreSQL 数据迁移工具",
    )
    parser.add_argument(
        "--force",
        "--yes",
        "-y",
        dest="force",
        action="store_true",
        default=False,
        help="跳过确认提示，直接执行迁移（适用于自动化/CI）",
    )
    args = parser.parse_args()

    # 读取环境变量
    sqlite_url = os.getenv(
        "SQLITE_DATABASE_URL",
        "sqlite+aiosqlite:///./ai_teaching.db",
    )
    pg_url = os.getenv("PG_DATABASE_URL")

    if not pg_url:
        print("=" * 60)
        print("  SQLite → PostgreSQL 数据迁移工具")
        print("=" * 60)
        print()
        print("用法:")
        print("  1. 设置目标 PostgreSQL 连接:")
        print("     set PG_DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname")
        print("  2. （可选）设置源 SQLite 路径:")
        print("     set SQLITE_DATABASE_URL=sqlite+aiosqlite:///./ai_teaching.db")
        print("  3. 运行脚本:")
        print("     python scripts/migrate_sqlite_to_postgres.py [--force]")
        print()
        sys.exit(0)

    asyncio.run(migrate(sqlite_url, pg_url, force=args.force))


if __name__ == "__main__":
    main()

"""
数据迁移脚本：为单教师模式添加用户隔离

此脚本完成以下任务：
1. 为 courses, students, lesson_plans, portfolios 表添加 user_id 列
2. 为现有数据分配默认用户（第一个用户）

使用方法：
    cd d:\Projects\ai-teaching-platform\backend
    venv\Scripts\activate
    python scripts\migrate_user_isolation.py
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, select
from app.core.database import async_engine, AsyncSessionLocal


async def get_first_user_id():
    """获取第一个用户的ID作为默认用户"""
    async with async_engine.connect() as conn:
        result = await conn.execute(text("SELECT id FROM users LIMIT 1"))
        row = result.fetchone()
        if not row:
            print("错误：数据库中没有用户，请先创建用户！")
            return None
        user_id = row[0]
        # 获取用户名
        result = await conn.execute(text("SELECT username FROM users WHERE id = :id"), {"id": user_id})
        username = result.fetchone()[0]
        print(f"找到默认用户: {username} (ID: {user_id})")
        return user_id


async def add_user_id_columns():
    """为所有表添加 user_id 列"""
    async with async_engine.begin() as conn:
        print("正在添加 user_id 列...")

        # 检查并添加 courses.user_id
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN user_id VARCHAR(36)"))
            print("✓ courses.user_id 列已添加")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  courses.user_id 列已存在，跳过")
            else:
                raise

        # 检查并添加 students.user_id
        try:
            await conn.execute(text("ALTER TABLE students ADD COLUMN user_id VARCHAR(36)"))
            print("✓ students.user_id 列已添加")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  students.user_id 列已存在，跳过")
            else:
                raise

        # 检查并添加 lesson_plans.user_id
        try:
            await conn.execute(text("ALTER TABLE lesson_plans ADD COLUMN user_id VARCHAR(36)"))
            print("✓ lesson_plans.user_id 列已添加")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  lesson_plans.user_id 列已存在，跳过")
            else:
                raise

        # 检查并添加 portfolios.user_id
        try:
            await conn.execute(text("ALTER TABLE portfolios ADD COLUMN user_id VARCHAR(36)"))
            print("✓ portfolios.user_id 列已添加")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  portfolios.user_id 列已存在，跳过")
            else:
                raise


async def assign_default_user(default_user_id: str):
    """为现有数据分配默认用户"""
    async with async_engine.begin() as conn:
        print(f"\n正在为现有数据分配用户 (ID: {default_user_id})...")

        # 更新 courses
        result = await conn.execute(
            text("UPDATE courses SET user_id = :user_id WHERE user_id IS NULL"),
            {"user_id": default_user_id}
        )
        print(f"✓ 更新了 {result.rowcount} 条课程记录")

        # 更新 students
        result = await conn.execute(
            text("UPDATE students SET user_id = :user_id WHERE user_id IS NULL"),
            {"user_id": default_user_id}
        )
        print(f"✓ 更新了 {result.rowcount} 条学生记录")

        # 更新 lesson_plans
        result = await conn.execute(
            text("UPDATE lesson_plans SET user_id = :user_id WHERE user_id IS NULL"),
            {"user_id": default_user_id}
        )
        print(f"✓ 更新了 {result.rowcount} 条教案记录")

        # 更新 portfolios
        result = await conn.execute(
            text("UPDATE portfolios SET user_id = :user_id WHERE user_id IS NULL"),
            {"user_id": default_user_id}
        )
        print(f"✓ 更新了 {result.rowcount} 条成长档案记录")


async def add_indexes():
    """为 user_id 列添加索引"""
    async with async_engine.begin() as conn:
        print("\n正在添加索引...")

        indexes = [
            ("idx_courses_user_id", "courses", "user_id"),
            ("idx_students_user_id", "students", "user_id"),
            ("idx_lesson_plans_user_id", "lesson_plans", "user_id"),
            ("idx_portfolios_user_id", "portfolios", "user_id"),
        ]

        for idx_name, table, column in indexes:
            try:
                await conn.execute(text(f"CREATE INDEX {idx_name} ON {table}({column})"))
                print(f"✓ 索引 {idx_name} 已创建")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"  索引 {idx_name} 已存在，跳过")
                else:
                    print(f"  创建索引 {idx_name} 失败: {e}")


async def verify_migration():
    """验证迁移结果"""
    async with async_engine.connect() as conn:
        print("\n正在验证迁移结果...")

        tables = ["courses", "students", "lesson_plans", "portfolios"]

        for table in tables:
            # 检查没有 user_id 的记录数
            result = await conn.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE user_id IS NULL")
            )
            count = result.scalar()
            if count > 0:
                print(f"⚠ {table} 表还有 {count} 条记录没有 user_id")
            else:
                # 统计总记录数
                result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                total = result.scalar()
                print(f"✓ {table} 表所有 {total} 条记录都有 user_id")


async def main():
    """主函数"""
    print("=" * 60)
    print("单教师模式数据迁移脚本")
    print("=" * 60)

    # 获取默认用户
    default_user_id = await get_first_user_id()
    if not default_user_id:
        sys.exit(1)

    # 添加列
    await add_user_id_columns()

    # 分配用户
    await assign_default_user(default_user_id)

    # 添加索引
    await add_indexes()

    # 验证
    await verify_migration()

    print("\n" + "=" * 60)
    print("迁移完成！")
    print("=" * 60)
    print("\n注意：")
    print("1. 所有现有数据已分配给默认用户")
    print("2. 新代码会强制要求 user_id 字段")
    print("3. 建议重启后端服务以应用更改")
    print("4. SQLite 不支持直接添加外键约束，如需外键请在重建数据库时添加")


if __name__ == "__main__":
    asyncio.run(main())

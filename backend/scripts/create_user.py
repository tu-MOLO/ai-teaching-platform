"""
创建测试用户脚本

用法：
    python scripts/create_user.py
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash


async def create_test_user():
    """创建测试用户"""
    async with AsyncSessionLocal() as session:
        # 检查是否有用户
        from sqlalchemy import select
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        print("现有用户：")
        for user in users:
            print(f"  - {user.username} (ID: {user.id})")
        
        # 如果没有用户，创建一个测试用户
        if not users:
            print("\n创建测试用户...")
            test_user = User(
                username="teacher1",
                email="teacher1@example.com",
                password=get_password_hash("password123"),
                name="张老师",
                phone="13800138000",
                avatar="https://neeko-copilot.bytedance.net/api/text2image?prompt=professional%20teacher%20portrait&size=200x200"
            )
            session.add(test_user)
            await session.commit()
            await session.refresh(test_user)
            print(f"\n测试用户已创建：")
            print(f"  用户名: teacher1")
            print(f"  密码: password123")
            print(f"  邮箱: teacher1@example.com")
        else:
            print("\n已有用户存在，跳过创建")


if __name__ == "__main__":
    import asyncio
    asyncio.run(create_test_user())

#!/usr/bin/env python3
"""Query all active users in the database."""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.core.config import settings
from app.models.user import User, UserRole, UserStatus


def main() -> None:
    engine = create_engine(settings.sync_database_url, echo=False, future=True)
    session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )

    with session_factory() as db:
        users = db.execute(
            select(User).where(User.is_deleted == False)
        ).scalars().all()

        print("=" * 70)
        print(f"{'ID':<36} {'用户名':<15} {'邮箱':<25} {'角色':<10} {'状态':<8} {'活跃'}")
        print("-" * 70)
        
        for user in users:
            role_name = UserRole(user.role).name if user.role else "未知"
            status_name = UserStatus(user.status).name if user.status else "未知"
            print(f"{user.id:<36} {user.username:<15} {user.email:<25} {role_name:<10} {status_name:<8} {user.is_active}")

        print("=" * 70)
        print(f"共找到 {len(users)} 个用户")


if __name__ == "__main__":
    main()
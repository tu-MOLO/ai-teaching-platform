#!/usr/bin/env python3
"""Create or update a local teacher account for manual delivery testing."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker


ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update a teacher user.")
    parser.add_argument("--username", default="teacher")
    parser.add_argument("--email", default="teacher@example.com")
    parser.add_argument("--password", default="Teacher123")
    parser.add_argument("--full-name", default="Default Teacher")
    parser.add_argument("--phone", default="")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    engine = create_engine(settings.sync_database_url, echo=False, future=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with session_factory() as db:
        user = db.execute(
            select(User).where(
                (User.username == args.username) | (User.email == args.email),
                User.is_deleted == False,
            )
        ).scalar_one_or_none()

        if user is None:
            user = User(
                username=args.username,
                email=args.email,
                hashed_password=get_password_hash(args.password),
                full_name=args.full_name,
                phone=args.phone or None,
                role=UserRole.TEACHER,
                status=UserStatus.ACTIVE,
                is_active=True,
            )
            db.add(user)
            action = "created"
        else:
            user.email = args.email
            user.username = args.username
            user.full_name = args.full_name
            user.phone = args.phone or None
            user.hashed_password = get_password_hash(args.password)
            user.role = UserRole.TEACHER
            user.status = UserStatus.ACTIVE
            user.is_active = True
            action = "updated"

        db.commit()
        print(f"Teacher user {action}: {user.username} <{user.email}>")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Initialize local delivery data for the teacher-only product."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker


ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.lesson_template import LessonTemplate
from app.models.tag import Tag
from app.models.user import User, UserRole, UserStatus
from app.services.permission import DEFAULT_TEACHER_PERMISSIONS


DEFAULT_TEACHER = {
    "username": os.getenv("DEFAULT_TEACHER_USERNAME", "teacher"),
    "email": os.getenv("DEFAULT_TEACHER_EMAIL", "teacher@example.com"),
    "password": os.getenv("DEFAULT_TEACHER_PASSWORD", "Teacher@Local2026!"),
    "full_name": os.getenv("DEFAULT_TEACHER_FULL_NAME", "本地教师账号"),
}

TAGS = [
    {"name": "Mind+", "description": "Mind+ programming resources", "color": "#1677ff"},
    {"name": "AI启蒙", "description": "AI introductory teaching resources", "color": "#52c41a"},
    {"name": "计算机基础", "description": "Basic computer literacy content", "color": "#faad14"},
    {"name": "课堂活动", "description": "Classroom activity materials", "color": "#722ed1"},
    {"name": "评价量表", "description": "Assessment and rubric resources", "color": "#eb2f96"},
]

TEMPLATES = [
    {
        "name": "通用信息科技教案",
        "description": "Teacher-facing general lesson plan template.",
        "structure": json.dumps(
            {
                "subject": "信息科技",
                "sections": [
                    {"title": "教学目标", "type": "goals"},
                    {"title": "课前准备", "type": "preparation"},
                    {"title": "教学过程", "type": "process"},
                    {"title": "分层支持", "type": "support"},
                    {"title": "评价方式", "type": "assessment"},
                ],
            },
            ensure_ascii=False,
        ),
        "is_default": True,
    },
    {
        "name": "AI启蒙教案",
        "description": "Template for AI introductory classes.",
        "structure": json.dumps(
            {
                "subject": "AI启蒙",
                "sections": [
                    {"title": "教学目标", "type": "goals"},
                    {"title": "教学素材", "type": "materials"},
                    {"title": "教学过程", "type": "process"},
                    {"title": "练习与反馈", "type": "practice"},
                    {"title": "课后延伸", "type": "extension"},
                ],
            },
            ensure_ascii=False,
        ),
        "is_default": False,
    },
]


def get_engine():
    return create_engine(settings.sync_database_url, echo=False, future=True)


def ensure_schema(engine) -> None:
    Base.metadata.create_all(bind=engine)


def seed_tags(db: Session) -> int:
    created = 0
    for item in TAGS:
        exists = db.execute(
            select(Tag).where(Tag.name == item["name"], Tag.is_deleted == False)
        ).scalar_one_or_none()
        if exists:
            continue
        db.add(Tag(**item))
        created += 1
    return created


def seed_templates(db: Session) -> int:
    created = 0
    for item in TEMPLATES:
        exists = db.execute(
            select(LessonTemplate).where(
                LessonTemplate.name == item["name"],
                LessonTemplate.is_deleted == False,
            )
        ).scalar_one_or_none()
        if exists:
            continue
        db.add(LessonTemplate(**item))
        created += 1
    return created


def seed_teacher(db: Session) -> tuple[User, bool]:
    username = DEFAULT_TEACHER["username"]
    email = DEFAULT_TEACHER["email"]
    user = db.execute(
        select(User).where(
            (User.username == username) | (User.email == email),
            User.is_deleted == False,
        )
    ).scalar_one_or_none()
    if user:
        return user, False

    user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(DEFAULT_TEACHER["password"]),
        full_name=DEFAULT_TEACHER["full_name"],
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        is_active=True,
        security_question="您的母校名称是什么？",
        hashed_security_answer=get_password_hash("default_answer"),
    )
    db.add(user)
    return user, True


def main() -> None:
    engine = get_engine()
    ensure_schema(engine)
    session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )

    with session_factory() as db:
        tag_count = seed_tags(db)
        template_count = seed_templates(db)
        user, created_teacher = seed_teacher(db)
        db.commit()
        total_tags = db.execute(select(Tag)).scalars().all()
        total_templates = db.execute(select(LessonTemplate)).scalars().all()
        teacher_username = user.username
        teacher_email = user.email

    print("Local data initialization completed.")
    print(f"Seeded tags this run: {tag_count}")
    print(f"Seeded lesson templates this run: {template_count}")
    print(f"Total tags available: {len(total_tags)}")
    print(f"Total lesson templates available: {len(total_templates)}")
    print(f"Teacher account created: {'yes' if created_teacher else 'no'}")
    print(f"Teacher username: {teacher_username}")
    print(f"Teacher email: {teacher_email}")
    print(f"Teacher default password: {DEFAULT_TEACHER['password']}")
    print("Please change the teacher password after first login if this environment will be shared.")
    print(f"Teacher permissions baseline: {', '.join(DEFAULT_TEACHER_PERMISSIONS[:4])} ...")


if __name__ == "__main__":
    main()

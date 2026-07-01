"""
Initialize default tags for the resource center.

Usage:
    python scripts/init_tags.py
"""

import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

from app.core.database import AsyncSessionLocal
from app.schemas.tag import TagCreate
from app.services.tags import TagService

DEFAULT_TAGS = [
    {"name": "课件", "description": "教学课件", "color": "#4CAF50"},
    {"name": "视频", "description": "教学视频", "color": "#2196F3"},
    {"name": "文档", "description": "教学文档", "color": "#FFC107"},
    {"name": "作业", "description": "作业练习", "color": "#9C27B0"},
    {"name": "测验", "description": "测验考试", "color": "#F44336"},
    {"name": "参考资料", "description": "参考学习资料", "color": "#607D8B"},
    {"name": "AI工具", "description": "AI 相关工具", "color": "#00BCD4"},
    {"name": "案例分析", "description": "案例分析资料", "color": "#FF9800"},
]


async def init_tags() -> None:
    print("Initializing tags...")

    async with AsyncSessionLocal() as session:
        created_count = 0

        for tag_data in DEFAULT_TAGS:
            existing_tag = await TagService.get_tag_by_name(session, tag_data["name"])
            if existing_tag:
                print(f"Skipped existing tag: {tag_data['name']}")
                continue

            await TagService.create_tag(session, TagCreate(**tag_data))
            created_count += 1
            print(f"Created tag: {tag_data['name']}")

        print(f"Done. Created {created_count} new tags.")


if __name__ == "__main__":
    asyncio.run(init_tags())

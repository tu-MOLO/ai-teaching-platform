"""
Initialize default configurable dropdown options.
"""

import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

from app.core.database import AsyncSessionLocal
from app.schemas.dropdown_option import DropdownOptionCreate
from app.services.dropdown_options import DropdownOptionService

DEFAULTS: dict[str, list[tuple[str, str]]] = {
    "student_gender": [("男", "male"), ("女", "female"), ("其他", "other")],
    "student_grade": [
        ("培智一年级", "培智一年级"),
        ("培智二年级", "培智二年级"),
        ("培智三年级", "培智三年级"),
        ("培智四年级", "培智四年级"),
        ("培智五年级", "培智五年级"),
        ("培智六年级", "培智六年级"),
    ],
    "student_class": [("1班", "1班"), ("2班", "2班"), ("3班", "3班")],
    "student_status": [("在读", "active"), ("已离校", "inactive")],
    "course_subject": [
        ("语文", "语文"),
        ("数学", "数学"),
        ("英语", "英语"),
        ("美术", "美术"),
        ("音乐", "音乐"),
        ("体育", "体育"),
        ("生活适应", "生活适应"),
        ("语言训练", "语言训练"),
    ],
    "course_grade": [
        ("培智一年级", "培智一年级"),
        ("培智二年级", "培智二年级"),
        ("培智三年级", "培智三年级"),
        ("培智四年级", "培智四年级"),
        ("培智五年级", "培智五年级"),
        ("培智六年级", "培智六年级"),
    ],
    "course_status": [("进行中", "active"), ("已结束", "inactive"), ("草稿", "draft")],
    "lesson_plan_subject": [
        ("语文", "语文"),
        ("数学", "数学"),
        ("美术", "美术"),
        ("音乐", "音乐"),
        ("体育", "体育"),
        ("生活适应", "生活适应"),
    ],
    "lesson_plan_grade": [
        ("培智一年级", "培智一年级"),
        ("培智二年级", "培智二年级"),
        ("培智三年级", "培智三年级"),
        ("培智四年级", "培智四年级"),
        ("培智五年级", "培智五年级"),
        ("培智六年级", "培智六年级"),
    ],
    "iep_teaching_method": [
        ("示范教学", "示范教学"),
        ("任务分解", "任务分解"),
        ("情境教学", "情境教学"),
        ("游戏教学", "游戏教学"),
        ("多感官教学", "多感官教学"),
        ("同伴互助", "同伴互助"),
        ("正向强化", "正向强化"),
        ("视觉提示", "视觉提示"),
    ],
    "iep_material": [
        ("实物教具", "实物教具"),
        ("图片卡片", "图片卡片"),
        ("视频素材", "视频素材"),
        ("操作板", "操作板"),
        ("绘本", "绘本"),
        ("多媒体课件", "多媒体课件"),
        ("生活用品", "生活用品"),
        ("辅助沟通设备", "辅助沟通设备"),
    ],
    "iep_support_teaching": [
        ("分层教学", "分层教学"),
        ("个别辅导", "个别辅导"),
        ("助学伙伴", "助学伙伴"),
        ("视觉提示卡", "视觉提示卡"),
        ("任务卡", "任务卡"),
    ],
    "iep_support_rehab": [
        ("言语治疗", "言语治疗"),
        ("物理治疗", "物理治疗"),
        ("作业治疗", "作业治疗"),
        ("感统训练", "感统训练"),
        ("心理辅导", "心理辅导"),
    ],
    "iep_support_family": [
        ("家庭训练指导", "家庭训练指导"),
        ("家长沟通", "家长沟通"),
        ("家庭环境调整", "家庭环境调整"),
        ("亲子活动建议", "亲子活动建议"),
    ],
    "portfolio_record_type": [
        ("作品", "work"),
        ("评价", "evaluation"),
        ("观察记录", "observation"),
        ("里程碑", "milestone"),
    ],
    "resource_tag": [
        ("教案", "教案"),
        ("视频", "视频"),
        ("图片", "图片"),
        ("文档", "文档"),
        ("模板", "模板"),
        ("培智教育", "培智教育"),
        ("生活技能", "生活技能"),
        ("认知训练", "认知训练"),
    ],
}


async def main() -> None:
    async with AsyncSessionLocal() as session:
        for group_key, items in DEFAULTS.items():
            existing = await DropdownOptionService.list_options(
                session,
                group_key=group_key,
                active_only=False,
            )
            existing_values = {item.value for item in existing}
            for index, (label, value) in enumerate(items):
                if value in existing_values:
                    continue
                await DropdownOptionService.create_option(
                    session,
                    DropdownOptionCreate(
                        group_key=group_key,
                        label=label,
                        value=value,
                        sort_order=index,
                        is_active=True,
                    ),
                )
                print(f"Created {group_key}: {label} -> {value}")


if __name__ == "__main__":
    asyncio.run(main())

"""
初始化教案模板数据
"""

import json

from backend.app.core.database import get_sync_session
from backend.app.models.lesson_template import LessonTemplate


def init_templates():
    """
    初始化教案模板数据
    """
    # 模板结构定义
    templates = [
        {
            "name": "常规课教案模板",
            "description": "适用于常规课堂教学的教案模板",
            "structure": json.dumps(
                {
                    "sections": [
                        "基本信息",
                        "教学目标",
                        "教学内容",
                        "教学方法",
                        "教学过程",
                        "教学资源",
                        "评价方式",
                        "备注",
                    ]
                }
            ),
            "is_default": True,
        },
        {
            "name": "实验课教案模板",
            "description": "适用于实验教学的教案模板",
            "structure": json.dumps(
                {
                    "sections": [
                        "基本信息",
                        "实验目标",
                        "实验原理",
                        "实验器材",
                        "实验步骤",
                        "实验注意事项",
                        "实验评价",
                        "备注",
                    ]
                }
            ),
            "is_default": False,
        },
        {
            "name": "复习课教案模板",
            "description": "适用于复习教学的教案模板",
            "structure": json.dumps(
                {
                    "sections": [
                        "基本信息",
                        "复习目标",
                        "复习重点",
                        "复习难点",
                        "复习过程",
                        "巩固练习",
                        "评价方式",
                        "备注",
                    ]
                }
            ),
            "is_default": False,
        },
    ]

    # 获取数据库会话
    session_generator = get_sync_session()
    session = next(session_generator)

    try:
        # 检查是否已存在模板
        existing_templates = session.query(LessonTemplate).count()
        if existing_templates > 0:
            print(f"模板数据已存在（{existing_templates}个），跳过初始化")
            return

        # 创建模板
        for template_data in templates:
            template = LessonTemplate(**template_data)
            session.add(template)

        session.commit()
        print(f"成功初始化{len(templates)}个教案模板")
    except Exception as e:
        print(f"初始化模板数据失败: {e}")
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    init_templates()

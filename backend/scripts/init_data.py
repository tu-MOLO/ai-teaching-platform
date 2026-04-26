#!/usr/bin/env python3
"""
Demo数据初始化脚本
创建预置标签、教案模板和测试用户
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
import json
from app.core.config import settings
from app.models.user import User, UserRole, UserStatus
from app.models.tag import Tag
from app.models.lesson_template import LessonTemplate
from app.core.security import get_password_hash

# 预置标签数据
TAGS_DATA = [
    {'name': 'Mind+编程', 'description': 'Mind+图形化编程课程标签', 'color': '#1890ff'},
    {'name': 'AI启蒙', 'description': 'AI启蒙课程标签', 'color': '#52c41a'},
    {'name': '计算机基础', 'description': '计算机基础课程标签', 'color': '#faad14'},
    {'name': '认知理解', 'description': '认知理解能力标签', 'color': '#722ed1'},
    {'name': '操作技能', 'description': '操作技能能力标签', 'color': '#eb2f96'},
    {'name': '创意表达', 'description': '创意表达能力标签', 'color': '#13c2c2'},
    {'name': '问题解决', 'description': '问题解决能力标签', 'color': '#f5222d'},
    {'name': '基础', 'description': '基础难度标签', 'color': '#52c41a'},
    {'name': '进阶', 'description': '进阶难度标签', 'color': '#faad14'},
    {'name': '拓展', 'description': '拓展难度标签', 'color': '#f5222d'},
    {'name': '教案', 'description': '教案资源类型标签', 'color': '#1890ff'},
    {'name': '课件', 'description': '课件资源类型标签', 'color': '#52c41a'},
    {'name': '教学视频', 'description': '教学视频资源类型标签', 'color': '#faad14'},
    {'name': '示例程序', 'description': '示例程序资源类型标签', 'color': '#722ed1'},
    {'name': '评价量表', 'description': '评价量表资源类型标签', 'color': '#eb2f96'},
    {'name': '素材图片', 'description': '素材图片资源类型标签', 'color': '#13c2c2'},
]

# 预置教案模板
TEMPLATE_DATA = [
    {
        'name': 'Mind+编程标准教案',
        'description': '适用于培智教育Mind+图形化编程课程',
        'structure': json.dumps({
            'subject': 'Mind+编程',
            'sections': [
                {'title': '教学目标', 'type': 'goals'},
                {'title': '教学准备', 'type': 'preparation'},
                {'title': '教学过程', 'type': 'process'},
                {'title': '个别化支持', 'type': 'support'},
                {'title': '评价方式', 'type': 'assessment'}
            ]
        }),
        'is_default': True
    },
    {
        'name': 'AI启蒙标准教案',
        'description': '适用于培智教育AI启蒙课程',
        'structure': json.dumps({
            'subject': 'AI启蒙',
            'sections': [
                {'title': '教学目标', 'type': 'goals'},
                {'title': '教学准备', 'type': 'preparation'},
                {'title': '教学过程', 'type': 'process'},
                {'title': '个别化支持', 'type': 'support'},
                {'title': '评价方式', 'type': 'assessment'}
            ]
        }),
        'is_default': False
    },
]

# 测试用户
USERS_DATA = [
    {
        'email': 'admin@example.com',
        'username': 'admin',
        'full_name': '管理员',
        'role': UserRole.ADMIN,
        'status': UserStatus.ACTIVE,
        'is_active': True,
        'is_verified': True,
        'is_superuser': True,
        'password': 'admin123'
    },
    {
        'email': 'teacher@example.com',
        'username': 'teacher',
        'full_name': '张老师',
        'role': UserRole.TEACHER,
        'status': UserStatus.ACTIVE,
        'is_active': True,
        'is_verified': True,
        'is_superuser': False,
        'password': 'teacher123'
    },
]

def get_sync_engine():
    """获取同步数据库引擎"""
    return create_engine(
        settings.sync_database_url,
        echo=False
    )

def init_database():
    """初始化数据库"""
    from app.models.base import Base
    engine = get_sync_engine()
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成")
    return engine

def init_tags(db: Session):
    """初始化标签数据"""
    for tag_data in TAGS_DATA:
        existing_tag = db.query(Tag).filter(
            Tag.name == tag_data['name']
        ).first()
        if not existing_tag:
            tag = Tag(**tag_data)
            db.add(tag)
    db.commit()
    print("标签数据初始化完成")

def init_templates(db: Session):
    """初始化教案模板"""
    for template_data in TEMPLATE_DATA:
        existing_template = db.query(LessonTemplate).filter(
            LessonTemplate.name == template_data['name']
        ).first()
        if not existing_template:
            template = LessonTemplate(**template_data)
            db.add(template)
    db.commit()
    print("教案模板初始化完成")

def init_users(db: Session):
    """初始化测试用户"""
    for user_data in USERS_DATA:
        existing_user = db.query(User).filter(
            User.username == user_data['username']
        ).first()
        if not existing_user:
            password = user_data.pop('password')
            user = User(
                hashed_password=get_password_hash(password),
                **user_data
            )
            db.add(user)
    db.commit()
    print("测试用户初始化完成")

def main():
    """主函数"""
    from sqlalchemy.orm import sessionmaker
    
    print("开始初始化Demo数据...")
    
    # 初始化数据库
    engine = init_database()
    
    # 创建数据库会话工厂
    SessionLocal = sessionmaker(bind=engine)
    
    # 创建数据库会话
    db = SessionLocal()
    
    try:
        # 初始化标签
        init_tags(db)
        
        # 初始化教案模板
        init_templates(db)
        
        # 初始化测试用户
        init_users(db)
        
        print("Demo数据初始化完成！")
        print("\n测试账号：")
        print("  管理员：username=admin, password=admin123")
        print("  教师：username=teacher, password=teacher123")
    except Exception as e:
        print(f"初始化失败：{e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

"""
数据工厂模块
用于生成测试数据
"""
from datetime import date, datetime
from typing import Optional
import uuid

from faker import Faker

from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.course import Course
from app.models.student import Student, Gender
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.resource import Resource
from app.models.tag import Tag
from app.models.portfolio import Portfolio

faker = Faker("zh_CN")


class UserFactory:
    """用户数据工厂"""
    
    @staticmethod
    def create(
        username: Optional[str] = None,
        email: Optional[str] = None,
        password: str = "testpassword123",
        full_name: Optional[str] = None,
        role: UserRole = UserRole.TEACHER,
        status: UserStatus = UserStatus.ACTIVE
    ) -> User:
        """创建用户实例"""
        return User(
            id=str(uuid.uuid4()),
            username=username or faker.user_name(),
            email=email or faker.email(),
            hashed_password=get_password_hash(password),
            full_name=full_name or faker.name(),
            role=role,
            status=status,
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class CourseFactory:
    """课程数据工厂"""
    
    @staticmethod
    def create(
        name: Optional[str] = None,
        subject: Optional[str] = None,
        grade: Optional[str] = None,
        teacher: Optional[str] = None,
        user_id: Optional[str] = None,
        status: str = "active"
    ) -> Course:
        """创建课程实例"""
        return Course(
            id=str(uuid.uuid4()),
            name=name or f"{faker.word()}课程",
            subject=subject or faker.random_element(["语文", "数学", "英语", "科学"]),
            grade=grade or faker.random_element(["一年级", "二年级", "三年级"]),
            teacher=teacher or faker.name(),
            user_id=user_id,
            status=status,
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class StudentFactory:
    """学生数据工厂"""
    
    @staticmethod
    def create(
        name: Optional[str] = None,
        gender: Gender = Gender.MALE,
        birth_date: Optional[date] = None,
        grade: Optional[str] = None,
        class_name: Optional[str] = None,
        user_id: Optional[str] = None,
        is_active: bool = True
    ) -> Student:
        """创建学生实例"""
        return Student(
            id=str(uuid.uuid4()),
            name=name or faker.name(),
            gender=gender,
            birth_date=birth_date or faker.date_of_birth(minimum_age=6, maximum_age=18),
            grade=grade or faker.random_element(["一年级", "二年级", "三年级"]),
            class_name=class_name or f"{faker.random_int(1, 10)}班",
            user_id=user_id,
            is_active=is_active,
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class LessonPlanFactory:
    """教案数据工厂"""
    
    @staticmethod
    def create(
        user_id: str,
        title: Optional[str] = None,
        subject: Optional[str] = None,
        grade: Optional[str] = None,
        duration: int = 45,
        status: LessonPlanStatus = LessonPlanStatus.DRAFT,
        template_id: Optional[str] = None
    ) -> LessonPlan:
        """创建教案实例"""
        return LessonPlan(
            id=str(uuid.uuid4()),
            user_id=user_id,
            template_id=template_id,
            title=title or f"{faker.word()}教案",
            subject=subject or faker.random_element(["语文", "数学", "英语"]),
            grade=grade or faker.random_element(["一年级", "二年级"]),
            duration=duration,
            status=status,
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class ResourceFactory:
    """资源数据工厂"""
    
    @staticmethod
    def create(
        user_id: str,
        name: Optional[str] = None,
        file_path: str = "/uploads/test.pdf",
        file_name: str = "test.pdf",
        file_size: int = 1024,
        file_type: str = "application/pdf"
    ) -> Resource:
        """创建资源实例"""
        return Resource(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name or faker.file_name(extension="pdf"),
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            file_type=file_type,
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class TagFactory:
    """标签数据工厂"""
    
    @staticmethod
    def create(
        name: Optional[str] = None,
        color: Optional[str] = None
    ) -> Tag:
        """创建标签实例"""
        return Tag(
            id=str(uuid.uuid4()),
            name=name or faker.word(),
            color=color or faker.hex_color(),
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class PortfolioFactory:
    """档案数据工厂"""
    
    @staticmethod
    def create(
        student_id: str,
        user_id: Optional[str] = None,
        type: str = "work",
        title: Optional[str] = None,
        content: Optional[str] = None,
        cognitive_score: Optional[int] = None
    ) -> Portfolio:
        """创建档案实例"""
        return Portfolio(
            id=str(uuid.uuid4()),
            student_id=student_id,
            user_id=user_id,
            type=type,
            title=title or faker.sentence(),
            content=content or faker.text(),
            cognitive_score=cognitive_score,
            is_deleted=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


__all__ = [
    "UserFactory",
    "CourseFactory", 
    "StudentFactory",
    "LessonPlanFactory",
    "ResourceFactory",
    "TagFactory",
    "PortfolioFactory",
    "faker"
]

"""
课程服务
"""
from typing import List, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate


class CourseService:
    """课程服务类"""

    @staticmethod
    async def create(db: AsyncSession, course_in: CourseCreate, user_id: str) -> Course:
        """
        创建课程

        Args:
            db: 数据库会话
            course_in: 课程创建数据
            user_id: 用户ID

        Returns:
            创建的课程对象
        """
        db_course = Course(**course_in.model_dump())
        db_course.user_id = user_id
        db.add(db_course)
        await db.flush()
        await db.refresh(db_course)
        return db_course

    @staticmethod
    async def get_by_id(db: AsyncSession, course_id: str, user_id: str) -> Optional[Course]:
        """
        根据ID获取课程

        Args:
            db: 数据库会话
            course_id: 课程ID
            user_id: 用户ID

        Returns:
            课程对象（仅返回属于该用户的课程）
        """
        result = await db.execute(
            select(Course).where(
                Course.id == course_id,
                Course.user_id == user_id,
                Course.is_deleted == False
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_list(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        keyword: Optional[str] = None,
        subject: Optional[str] = None,
        grade: Optional[str] = None,
        status: Optional[str] = None,
        teacher: Optional[str] = None
    ) -> List[Course]:
        """
        获取课程列表

        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过的记录数
            limit: 返回的记录数
            subject: 学科筛选
            grade: 年级筛选
            status: 状态筛选
            teacher: 教师筛选

        Returns:
            课程列表（仅返回属于该用户的课程）
        """
        query = select(Course).where(
            Course.user_id == user_id,
            Course.is_deleted == False
        )

        if keyword:
            keyword_filter = or_(
                Course.name.ilike(f"%{keyword}%"),
                Course.teacher.ilike(f"%{keyword}%"),
            )
            query = query.where(keyword_filter)

        if subject:
            query = query.where(Course.subject == subject)

        if grade:
            query = query.where(Course.grade == grade)

        if status:
            query = query.where(Course.status == status)

        if teacher:
            query = query.where(Course.teacher == teacher)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: str,
        keyword: Optional[str] = None,
        subject: Optional[str] = None,
        grade: Optional[str] = None,
        status: Optional[str] = None,
        teacher: Optional[str] = None
    ) -> int:
        """
        统计课程数量

        Args:
            db: 数据库会话
            user_id: 用户ID
            subject: 学科筛选
            grade: 年级筛选
            status: 状态筛选
            teacher: 教师筛选

        Returns:
            课程数量（仅统计属于该用户的课程）
        """
        query = select(func.count()).select_from(Course).where(
            Course.user_id == user_id,
            Course.is_deleted == False
        )

        if keyword:
            keyword_filter = or_(
                Course.name.ilike(f"%{keyword}%"),
                Course.teacher.ilike(f"%{keyword}%"),
            )
            query = query.where(keyword_filter)

        if subject:
            query = query.where(Course.subject == subject)

        if grade:
            query = query.where(Course.grade == grade)

        if status:
            query = query.where(Course.status == status)

        if teacher:
            query = query.where(Course.teacher == teacher)

        result = await db.execute(query)
        return result.scalar()

    @staticmethod
    async def update(
        db: AsyncSession,
        course_id: str,
        course_in: CourseUpdate,
        user_id: str
    ) -> Optional[Course]:
        """
        更新课程

        Args:
            db: 数据库会话
            course_id: 课程ID
            course_in: 课程更新数据
            user_id: 用户ID

        Returns:
            更新后的课程对象（仅更新属于该用户的课程）
        """
        db_course = await CourseService.get_by_id(db, course_id, user_id)
        if not db_course:
            return None

        update_data = course_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_course, field, value)
        await db.flush()
        await db.refresh(db_course)
        return db_course

    @staticmethod
    async def delete(db: AsyncSession, course_id: str, user_id: str) -> bool:
        """
        删除课程（软删除）

        Args:
            db: 数据库会话
            course_id: 课程ID
            user_id: 用户ID

        Returns:
            是否删除成功（仅删除属于该用户的课程）
        """
        db_course = await CourseService.get_by_id(db, course_id, user_id)
        if not db_course:
            return False

        db_course.soft_delete()
        await db.flush()
        return True

"""
学生服务
"""
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.portfolio import Portfolio
from app.schemas.student import StudentCreate, StudentUpdate


class StudentService:
    """学生服务类"""

    @staticmethod
    async def create(db: AsyncSession, student_in: StudentCreate, user_id: int) -> Student:
        """
        创建学生

        Args:
            db: 数据库会话
            student_in: 学生创建数据
            user_id: 用户ID，自动设置为学生所有者

        Returns:
            创建的学生对象
        """
        async with db.begin():
            db_student = Student(**student_in.model_dump(), user_id=user_id)
            db.add(db_student)
            await db.flush()
        await db.refresh(db_student)
        return db_student

    @staticmethod
    async def get(db: AsyncSession, student_id: str, user_id: int) -> Optional[Student]:
        """
        获取学生（带用户隔离）

        Args:
            db: 数据库会话
            student_id: 学生ID
            user_id: 用户ID，用于过滤

        Returns:
            学生对象，包含 progress 计算字段
        """
        result = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.user_id == user_id,
                Student.is_deleted == False
            )
        )
        student = result.scalar_one_or_none()
        if student:
            student.progress = await StudentService.calculate_progress(db, student_id)
        return student

    @staticmethod
    async def get_list(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        grade: Optional[str] = None,
        class_name: Optional[str] = None
    ) -> List[Student]:
        """
        获取学生列表（带用户隔离）

        Args:
            db: 数据库会话
            user_id: 用户ID，用于过滤
            skip: 跳过的记录数
            limit: 返回的记录数
            grade: 年级筛选
            class_name: 班级筛选

        Returns:
            学生列表，每个学生对象包含 progress 计算字段
        """
        query = select(Student).where(
            Student.user_id == user_id,
            Student.is_deleted == False
        )

        if grade:
            query = query.where(Student.grade == grade)

        if class_name:
            query = query.where(Student.class_name == class_name)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        students = result.scalars().all()

        # 为每个学生计算进度
        for student in students:
            student.progress = await StudentService.calculate_progress(db, student.id)

        return students

    @staticmethod
    async def update(
        db: AsyncSession,
        student_id: str,
        student_in: StudentUpdate,
        user_id: int
    ) -> Optional[Student]:
        """
        更新学生（带所有权验证）

        Args:
            db: 数据库会话
            student_id: 学生ID
            student_in: 学生更新数据
            user_id: 用户ID，用于验证所有权

        Returns:
            更新后的学生对象，如果不存在或无权限则返回None
        """
        db_student = await StudentService.get(db, student_id, user_id)
        if not db_student:
            return None

        update_data = student_in.model_dump(exclude_unset=True)
        async with db.begin():
            for field, value in update_data.items():
                setattr(db_student, field, value)
        await db.refresh(db_student)
        return db_student

    @staticmethod
    async def delete(db: AsyncSession, student_id: str, user_id: int) -> bool:
        """
        删除学生（软删除，带所有权验证）

        Args:
            db: 数据库会话
            student_id: 学生ID
            user_id: 用户ID，用于验证所有权

        Returns:
            是否删除成功
        """
        db_student = await StudentService.get(db, student_id, user_id)
        if not db_student:
            return False

        async with db.begin():
            db_student.soft_delete()
        return True

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: int,
        grade: Optional[str] = None,
        class_name: Optional[str] = None
    ) -> int:
        """
        统计学生数量（带用户隔离）

        Args:
            db: 数据库会话
            user_id: 用户ID，用于过滤
            grade: 年级筛选
            class_name: 班级筛选

        Returns:
            学生数量
        """
        query = select(func.count()).select_from(Student).where(
            Student.user_id == user_id,
            Student.is_deleted == False
        )

        if grade:
            query = query.where(Student.grade == grade)

        if class_name:
            query = query.where(Student.class_name == class_name)

        result = await db.execute(query)
        return result.scalar()

    @staticmethod
    async def calculate_progress(db: AsyncSession, student_id: str) -> int:
        """
        计算学生学习进度

        根据学生成长档案记录数量计算进度，每条记录增加10%进度，最高100%

        Args:
            db: 数据库会话
            student_id: 学生ID

        Returns:
            进度值 (0-100)
        """
        result = await db.execute(
            select(func.count()).select_from(Portfolio).where(
                Portfolio.student_id == student_id,
                Portfolio.is_deleted == False
            )
        )
        count = result.scalar() or 0
        return min(count * 10, 100)

    @staticmethod
    async def verify_ownership(
        db: AsyncSession,
        student_id: str,
        user_id: int
    ) -> bool:
        """
        验证学生是否属于指定用户

        Args:
            db: 数据库会话
            student_id: 学生ID
            user_id: 用户ID

        Returns:
            是否拥有该学生的所有权
        """
        result = await db.execute(
            select(Student).where(
                Student.id == student_id,
                Student.user_id == user_id,
                Student.is_deleted == False
            )
        )
        return result.scalar_one_or_none() is not None

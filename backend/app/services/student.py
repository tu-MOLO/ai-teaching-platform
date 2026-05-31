"""
学生服务
"""
from typing import List, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.portfolio import Portfolio
from app.models.notification import NotificationType
from app.schemas.student import StudentCreate, StudentUpdate
from app.schemas.notification import NotificationCreate
from app.services.notification import NotificationService


class StudentService:
    """学生服务类"""

    @staticmethod
    async def create(db: AsyncSession, student_in: StudentCreate, user_id: str) -> Student:
        """
        创建学生

        Args:
            db: 数据库会话
            student_in: 学生创建数据
            user_id: 用户ID，自动设置为学生所有者

        Returns:
            创建的学生对象
        """
        db_student = Student(**student_in.model_dump(), user_id=user_id)
        db.add(db_student)
        await db.flush()
        await db.refresh(db_student)

        await NotificationService.create(
            db,
            NotificationCreate(
                title="添加学生成功",
                content=f"您已成功添加学生：{db_student.name}",
                type=NotificationType.SYSTEM,
                user_id=user_id,
                target_id=db_student.id,
                target_type="student",
            )
        )

        return db_student

    @staticmethod
    async def get(db: AsyncSession, student_id: str, user_id: str) -> Optional[Student]:
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
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        keyword: Optional[str] = None,
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

        if keyword:
            safe_keyword = keyword.replace("%", "\\%").replace("_", "\\_")
            keyword_filter = or_(
                Student.name.ilike(f"%{safe_keyword}%", escape="\\"),
                Student.class_name.ilike(f"%{safe_keyword}%", escape="\\"),
            )
            query = query.where(keyword_filter)

        if grade:
            query = query.where(Student.grade == grade)

        if class_name:
            query = query.where(Student.class_name == class_name)

        query = query.order_by(Student.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        students = result.scalars().all()

        student_ids = [s.id for s in students]
        if student_ids:
            result = await db.execute(
                select(Portfolio).where(
                    Portfolio.student_id.in_(student_ids),
                    Portfolio.is_deleted == False
                )
            )
            all_portfolios = result.scalars().all()

            portfolios_by_student: dict = {}
            for p in all_portfolios:
                portfolios_by_student.setdefault(p.student_id, []).append(p)

            progress_map = {}
            for sid, portfolios in portfolios_by_student.items():
                progress_map[sid] = StudentService._compute_progress_from_portfolios(portfolios)
        else:
            progress_map = {}

        for student in students:
            student.progress = progress_map.get(student.id, 0)

        return students

    @staticmethod
    async def update(
        db: AsyncSession,
        student_id: str,
        student_in: StudentUpdate,
        user_id: str
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
        for field, value in update_data.items():
            setattr(db_student, field, value)
        await db.flush()
        await db.refresh(db_student)
        return db_student

    @staticmethod
    async def delete(db: AsyncSession, student_id: str, user_id: str) -> bool:
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

        db_student.soft_delete()
        await db.flush()
        return True

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: str,
        keyword: Optional[str] = None,
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

        if keyword:
            safe_keyword = keyword.replace("%", "\\%").replace("_", "\\_")
            keyword_filter = or_(
                Student.name.ilike(f"%{safe_keyword}%", escape="\\"),
                Student.class_name.ilike(f"%{safe_keyword}%", escape="\\"),
            )
            query = query.where(keyword_filter)

        if grade:
            query = query.where(Student.grade == grade)

        if class_name:
            query = query.where(Student.class_name == class_name)

        result = await db.execute(query)
        return result.scalar()

    @staticmethod
    def _compute_progress_from_portfolios(portfolios: list) -> int:
        dimensions = [
            [p.cognitive_score for p in portfolios if p.cognitive_score is not None],
            [p.skill_score for p in portfolios if p.skill_score is not None],
            [p.creativity_score for p in portfolios if p.creativity_score is not None],
            [p.cooperation_score for p in portfolios if p.cooperation_score is not None],
            [p.attention_score for p in portfolios if p.attention_score is not None],
        ]
        dimension_avgs = [sum(scores) / len(scores) if scores else 0 for scores in dimensions]
        return round(sum(dimension_avgs) / len(dimension_avgs))

    @staticmethod
    async def calculate_progress(db: AsyncSession, student_id: str) -> int:
        """
        计算学生学习进度

        基于多维度评分计算：查询学生所有 Portfolio 记录，
        对 cognitive_score、skill_score、creativity_score、
        cooperation_score、attention_score 五个维度各自取平均值，
        再对各维度平均值取算术平均作为最终进度（0-100）。

        Args:
            db: 数据库会话
            student_id: 学生ID

        Returns:
            进度值 (0-100)
        """
        result = await db.execute(
            select(Portfolio).where(
                Portfolio.student_id == student_id,
                Portfolio.is_deleted == False
            )
        )
        portfolios = result.scalars().all()

        if not portfolios:
            return 0

        return StudentService._compute_progress_from_portfolios(list(portfolios))

    @staticmethod
    async def verify_ownership(
        db: AsyncSession,
        student_id: str,
        user_id: str
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

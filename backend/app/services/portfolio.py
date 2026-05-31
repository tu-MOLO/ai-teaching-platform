"""
成长档案服务
"""
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio import Portfolio
from app.models.student import Student
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate
from app.core.exceptions import NotFoundException


class PortfolioService:
    """成长档案服务类"""

    @staticmethod
    async def create(db: AsyncSession, portfolio_in: PortfolioCreate, user_id: str) -> Portfolio:
        """
        创建成长档案

        Args:
            db: 数据库会话
            portfolio_in: 成长档案创建数据
            user_id: 用户ID

        Returns:
            创建的成长档案对象
        """
        db_portfolio = Portfolio(**portfolio_in.model_dump(), user_id=user_id)
        student_result = await db.execute(
            select(Student).where(
                Student.id == portfolio_in.student_id,
                Student.user_id == user_id,
                Student.is_deleted == False
            )
        )
        if not student_result.scalar_one_or_none():
            raise NotFoundException("学生")
        db.add(db_portfolio)
        await db.flush()
        await db.refresh(db_portfolio)
        return db_portfolio

    @staticmethod
    async def get(db: AsyncSession, portfolio_id: str, user_id: str) -> Optional[Portfolio]:
        """
        获取成长档案（带用户验证）

        Args:
            db: 数据库会话
            portfolio_id: 成长档案ID
            user_id: 用户ID

        Returns:
            成长档案对象（仅当属于该用户时）
        """
        result = await db.execute(
            select(Portfolio).where(
                Portfolio.id == portfolio_id,
                Portfolio.user_id == user_id,
                Portfolio.is_deleted == False
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_list(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        student_id: Optional[str] = None,
        type: Optional[str] = None
    ) -> List[Portfolio]:
        """
        获取成长档案列表（用户隔离）

        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过的记录数
            limit: 返回的记录数
            student_id: 学生ID筛选
            type: 记录类型筛选

        Returns:
            成长档案列表
        """
        query = select(Portfolio).where(
            Portfolio.user_id == user_id,
            Portfolio.is_deleted == False
        )

        if student_id:
            query = query.where(Portfolio.student_id == student_id)

        if type:
            query = query.where(Portfolio.type == type)

        query = query.order_by(Portfolio.created_at.desc())
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def update(
        db: AsyncSession,
        portfolio_id: str,
        portfolio_in: PortfolioUpdate,
        user_id: str
    ) -> Optional[Portfolio]:
        """
        更新成长档案（带所有权验证）

        Args:
            db: 数据库会话
            portfolio_id: 成长档案ID
            portfolio_in: 成长档案更新数据
            user_id: 用户ID

        Returns:
            更新后的成长档案对象（仅当属于该用户时）
        """
        db_portfolio = await PortfolioService.get(db, portfolio_id, user_id)
        if not db_portfolio:
            return None

        update_data = portfolio_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_portfolio, field, value)
        await db.flush()
        await db.refresh(db_portfolio)
        return db_portfolio

    @staticmethod
    async def delete(db: AsyncSession, portfolio_id: str, user_id: str) -> bool:
        """
        删除成长档案（软删除，带所有权验证）

        Args:
            db: 数据库会话
            portfolio_id: 成长档案ID
            user_id: 用户ID

        Returns:
            是否删除成功（仅当属于该用户时）
        """
        db_portfolio = await PortfolioService.get(db, portfolio_id, user_id)
        if not db_portfolio:
            return False

        db_portfolio.soft_delete()
        await db.flush()
        return True

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: str,
        student_id: Optional[str] = None,
        type: Optional[str] = None
    ) -> int:
        """
        统计成长档案数量（用户隔离）

        Args:
            db: 数据库会话
            user_id: 用户ID
            student_id: 学生ID筛选
            type: 记录类型筛选

        Returns:
            成长档案数量
        """
        query = select(func.count()).select_from(Portfolio).where(
            Portfolio.user_id == user_id,
            Portfolio.is_deleted == False
        )

        if student_id:
            query = query.where(Portfolio.student_id == student_id)

        if type:
            query = query.where(Portfolio.type == type)

        result = await db.execute(query)
        return result.scalar() or 0

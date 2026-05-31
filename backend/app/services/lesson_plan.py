"""
教案服务层
提供教案的CRUD操作
"""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.notification import NotificationType
from app.schemas.lesson_plan import LessonPlanCreate, LessonPlanUpdate
from app.schemas.notification import NotificationCreate
from app.services.notification import NotificationService


class LessonPlanService:
    """教案服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: LessonPlanCreate, user_id: str) -> LessonPlan:
        """
        创建教案

        Args:
            data: 教案创建数据
            user_id: 用户ID

        Returns:
            创建的教案对象
        """
        lesson_plan = LessonPlan(
            user_id=user_id,
            title=data.title,
            subject=data.subject,
            grade=data.grade,
            duration=data.duration,
            teaching_objectives=data.teaching_objectives,
            teaching_content=data.teaching_content,
            teaching_methods=data.teaching_methods,
            teaching_process=data.teaching_process,
            teaching_resources=data.teaching_resources,
            notes=data.notes,
            status=data.status or LessonPlanStatus.DRAFT
        )

        self.db.add(lesson_plan)
        await self.db.flush()
        await self.db.refresh(lesson_plan)
        return lesson_plan

    async def get_list(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[LessonPlan]:
        """
        获取教案列表

        Args:
            user_id: 用户ID
            skip: 跳过数量
            limit: 限制数量
            status_filter: 状态筛选
            search: 搜索关键词

        Returns:
            教案列表
        """
        query = select(LessonPlan).where(
            LessonPlan.user_id == user_id,
            LessonPlan.is_deleted == False
        )

        if status_filter:
            query = query.where(LessonPlan.status == status_filter)

        if search:
            safe_search = search.replace("%", "\\%").replace("_", "\\_")
            query = query.where(
                (LessonPlan.title.ilike(f"%{safe_search}%", escape="\\")) |
                (LessonPlan.subject.ilike(f"%{safe_search}%", escape="\\"))
            )

        query = query.order_by(LessonPlan.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count(
        self,
        user_id: str,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> int:
        """
        统计教案数量

        Args:
            user_id: 用户ID
            status_filter: 状态筛选

        Returns:
            教案数量
        """
        query = select(func.count(LessonPlan.id)).where(
            LessonPlan.user_id == user_id,
            LessonPlan.is_deleted == False
        )

        if status_filter:
            query = query.where(LessonPlan.status == status_filter)

        if search:
            safe_search = search.replace("%", "\\%").replace("_", "\\_")
            query = query.where(
                (LessonPlan.title.ilike(f"%{safe_search}%", escape="\\")) |
                (LessonPlan.subject.ilike(f"%{safe_search}%", escape="\\"))
            )

        result = await self.db.execute(query)
        return result.scalar()

    async def get_by_id(self, plan_id: str, user_id: str) -> Optional[LessonPlan]:
        """
        根据ID获取教案

        Args:
            plan_id: 教案ID
            user_id: 用户ID

        Returns:
            教案对象或None
        """
        result = await self.db.execute(
            select(LessonPlan).where(
                LessonPlan.id == plan_id,
                LessonPlan.user_id == user_id,
                LessonPlan.is_deleted == False
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        plan_id: str,
        user_id: str,
        data: LessonPlanUpdate
    ) -> Optional[LessonPlan]:
        """
        更新教案

        Args:
            plan_id: 教案ID
            user_id: 用户ID
            data: 更新数据

        Returns:
            更新后的教案对象或None
        """
        lesson_plan = await self.get_by_id(plan_id, user_id)
        if not lesson_plan:
            return None

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lesson_plan, field, value)
        await self.db.flush()
        await self.db.refresh(lesson_plan)
        return lesson_plan

    async def delete(self, plan_id: str, user_id: str) -> bool:
        """
        删除教案（软删除）

        Args:
            plan_id: 教案ID
            user_id: 用户ID

        Returns:
            是否删除成功
        """
        lesson_plan = await self.get_by_id(plan_id, user_id)
        if not lesson_plan:
            return False

        lesson_plan.soft_delete()
        await self.db.flush()
        return True

    async def publish(self, plan_id: str, user_id: str) -> Optional[LessonPlan]:
        """
        发布教案

        Args:
            plan_id: 教案ID
            user_id: 用户ID

        Returns:
            更新后的教案对象或None
        """
        lesson_plan = await self.get_by_id(plan_id, user_id)
        if not lesson_plan:
            return None

        lesson_plan.status = LessonPlanStatus.PUBLISHED
        await self.db.flush()
        await self.db.refresh(lesson_plan)

        await NotificationService.create(
            self.db,
            NotificationCreate(
                title="教案已发布",
                content=f"教案「{lesson_plan.title}」已发布",
                type=NotificationType.COURSE,
                user_id=user_id,
                target_id=lesson_plan.id,
                target_type="lesson_plan",
            )
        )

        return lesson_plan

    async def unpublish(self, plan_id: str, user_id: str) -> Optional[LessonPlan]:
        """
        取消发布教案（将已完成状态恢复为草稿）

        Args:
            plan_id: 教案ID
            user_id: 用户ID

        Returns:
            更新后的教案对象或None
        """
        lesson_plan = await self.get_by_id(plan_id, user_id)
        if not lesson_plan:
            return None

        lesson_plan.status = LessonPlanStatus.DRAFT
        await self.db.flush()
        await self.db.refresh(lesson_plan)
        return lesson_plan

    async def archive(self, plan_id: str, user_id: str) -> Optional[LessonPlan]:
        """
        归档教案

        Args:
            plan_id: 教案ID
            user_id: 用户ID

        Returns:
            更新后的教案对象或None
        """
        lesson_plan = await self.get_by_id(plan_id, user_id)
        if not lesson_plan:
            return None

        lesson_plan.status = LessonPlanStatus.ARCHIVED
        await self.db.flush()
        await self.db.refresh(lesson_plan)
        return lesson_plan

    async def restore(self, plan_id: str, user_id: str) -> Optional[LessonPlan]:
        """
        恢复教案（将已归档教案恢复为草稿）

        Args:
            plan_id: 教案ID
            user_id: 用户ID

        Returns:
            更新后的教案对象或None
        """
        lesson_plan = await self.get_by_id(plan_id, user_id)
        if not lesson_plan:
            return None

        lesson_plan.status = LessonPlanStatus.DRAFT
        await self.db.flush()
        await self.db.refresh(lesson_plan)
        return lesson_plan

    async def get_monthly_count(self, user_id: str, year: int, month: int) -> int:
        """
        获取月度教案数量

        Args:
            user_id: 用户ID
            year: 年份
            month: 月份

        Returns:
            教案数量
        """
        from datetime import datetime

        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        result = await self.db.execute(
            select(func.count(LessonPlan.id)).where(
                LessonPlan.user_id == user_id,
                LessonPlan.is_deleted == False,
                LessonPlan.created_at >= start_date,
                LessonPlan.created_at < end_date
            )
        )
        return result.scalar()

    async def get_draft_count(self, user_id: str) -> int:
        """
        获取草稿教案数量

        Args:
            user_id: 用户ID

        Returns:
            草稿教案数量
        """
        result = await self.db.execute(
            select(func.count(LessonPlan.id)).where(
                LessonPlan.user_id == user_id,
                LessonPlan.is_deleted == False,
                LessonPlan.status == LessonPlanStatus.DRAFT
            )
        )
        return result.scalar()

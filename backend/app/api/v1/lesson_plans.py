"""
教案相关的API接口
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.core.database import get_async_session
from app.core.security import get_current_user_id_with_version_check
from app.core.exceptions import NotFoundException
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.schemas.lesson_plan import (
    LessonPlanCreate,
    LessonPlanUpdate,
    LessonPlanResponse
)
from app.schemas.base import DataResponse, ListResponse
from app.services.lesson_plan import LessonPlanService


# 依赖注入
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]

router = APIRouter(tags=["教案管理"])


@router.post("/", response_model=DataResponse[LessonPlanResponse], status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("", response_model=DataResponse[LessonPlanResponse], status_code=status.HTTP_201_CREATED)
async def create_lesson_plan(
    lesson_plan: LessonPlanCreate,
    db: DBSession,
    user_id: CurrentUser
):
    """
    创建教案

    Args:
        lesson_plan: 教案创建数据
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        创建的教案
    """
    service = LessonPlanService(db)
    result = await service.create(lesson_plan, user_id)
    return DataResponse(data=result)


@router.get("/", response_model=ListResponse[LessonPlanResponse], include_in_schema=False)
@router.get("", response_model=ListResponse[LessonPlanResponse])
async def get_lesson_plans(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status_filter: str = Query(None, description="教案状态筛选"),
    search: str = Query(None, description="搜索关键词")
):
    """
    获取教案列表

    Args:
        db: 数据库会话
        user_id: 当前用户ID
        page: 页码
        page_size: 每页数量
        status_filter: 教案状态筛选
        search: 搜索关键词

    Returns:
        教案列表
    """
    service = LessonPlanService(db)
    skip = (page - 1) * page_size
    items = await service.get_list(
        user_id=user_id,
        skip=skip,
        limit=page_size,
        status_filter=status_filter,
        search=search
    )
    total = await service.count(user_id, status_filter, search)
    pages = (total + page_size - 1) // page_size
    return ListResponse(
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/{plan_id}", response_model=DataResponse[LessonPlanResponse])
async def get_lesson_plan(
    plan_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    获取单个教案详情

    Args:
        plan_id: 教案ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        教案详情
    """
    service = LessonPlanService(db)
    plan = await service.get_by_id(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.put("/{plan_id}", response_model=DataResponse[LessonPlanResponse])
async def update_lesson_plan(
    plan_id: str,
    lesson_plan: LessonPlanUpdate,
    db: DBSession,
    user_id: CurrentUser
):
    """
    更新教案

    Args:
        plan_id: 教案ID
        lesson_plan: 教案更新数据
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        更新后的教案
    """
    service = LessonPlanService(db)
    updated_plan = await service.update(plan_id, user_id, lesson_plan)
    if not updated_plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=updated_plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson_plan(
    plan_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    删除教案（软删除）

    Args:
        plan_id: 教案ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        删除结果
    """
    service = LessonPlanService(db)
    success = await service.delete(plan_id, user_id)
    if not success:
        raise NotFoundException("LessonPlan", plan_id)


@router.post("/{plan_id}/publish", response_model=DataResponse[LessonPlanResponse])
async def publish_lesson_plan(
    plan_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    发布教案

    Args:
        plan_id: 教案ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        发布后的教案
    """
    service = LessonPlanService(db)
    plan = await service.publish(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.post("/{plan_id}/unpublish", response_model=DataResponse[LessonPlanResponse])
async def unpublish_lesson_plan(
    plan_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    取消发布教案（将已完成状态恢复为草稿）

    Args:
        plan_id: 教案ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        取消发布后的教案
    """
    service = LessonPlanService(db)
    plan = await service.unpublish(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.post("/{plan_id}/archive", response_model=DataResponse[LessonPlanResponse])
async def archive_lesson_plan(
    plan_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    归档教案

    Args:
        plan_id: 教案ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        归档后的教案
    """
    service = LessonPlanService(db)
    plan = await service.archive(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.post("/{plan_id}/restore", response_model=DataResponse[LessonPlanResponse])
async def restore_lesson_plan(
    plan_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    恢复教案（将已归档教案恢复为草稿）

    Args:
        plan_id: 教案ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        恢复后的教案
    """
    service = LessonPlanService(db)
    plan = await service.restore(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.get("/stats/monthly", response_model=DataResponse[dict])
async def get_monthly_stats(
    db: DBSession,
    user_id: CurrentUser,
    year: int = Query(None, description="年份，默认为当前年份"),
    month: int = Query(None, description="月份，默认为当前月份")
):
    """
    获取月度教案统计

    Args:
        db: 数据库会话
        user_id: 当前用户ID
        year: 年份
        month: 月份

    Returns:
        月度统计信息
    """
    from datetime import datetime

    if year is None or month is None:
        now = datetime.now()
        year = now.year
        month = now.month

    service = LessonPlanService(db)
    monthly_count = await service.get_monthly_count(user_id, year, month)
    draft_count = await service.get_draft_count(user_id)

    return DataResponse(data={
        "year": year,
        "month": month,
        "monthly_count": monthly_count,
        "draft_count": draft_count
    })

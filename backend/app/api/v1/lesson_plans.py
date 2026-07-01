"""
教案相关的API接口
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.models.lesson_plan import LessonPlanStatus
from app.schemas.base import DataResponse, ListResponse
from app.schemas.lesson_plan import LessonPlanCreate, LessonPlanResponse, LessonPlanUpdate
from app.services.lesson_plans import LessonPlanService

DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]

router = APIRouter(tags=["教案管理"])


@router.post(
    "", response_model=DataResponse[LessonPlanResponse], status_code=status.HTTP_201_CREATED
)
async def create_lesson_plan(lesson_plan: LessonPlanCreate, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    result = await service.create(lesson_plan, user_id)
    return DataResponse(data=result)


@router.get("/stats/monthly", response_model=DataResponse[dict])
async def get_monthly_stats(
    db: DBSession,
    user_id: CurrentUser,
    year: int = Query(None, description="年份，默认为当前年份"),
    month: int = Query(None, description="月份，默认为当前月份"),
):
    from datetime import datetime, timezone

    if year is None or month is None:
        now = datetime.now(timezone.utc)
        year = now.year
        month = now.month

    service = LessonPlanService(db)
    monthly_count = await service.get_monthly_count(user_id, year, month)
    draft_count = await service.get_draft_count(user_id)

    return DataResponse(
        data={
            "year": year,
            "month": month,
            "monthly_count": monthly_count,
            "draft_count": draft_count,
        }
    )


@router.get("", response_model=ListResponse[LessonPlanResponse])
async def get_lesson_plans(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status_filter: Optional[LessonPlanStatus] = Query(None, description="教案状态筛选"),
    search: str = Query(None, description="搜索关键词"),
):
    service = LessonPlanService(db)
    skip = (page - 1) * page_size
    items = await service.get_list(
        user_id=user_id, skip=skip, limit=page_size, status_filter=status_filter, search=search
    )
    total = await service.count(user_id, status_filter, search)
    pages = (total + page_size - 1) // page_size
    return ListResponse(data=items, total=total, page=page, page_size=page_size, pages=pages)


@router.get("/{plan_id}", response_model=DataResponse[LessonPlanResponse])
async def get_lesson_plan(plan_id: str, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    plan = await service.get_by_id(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.put("/{plan_id}", response_model=DataResponse[LessonPlanResponse])
async def update_lesson_plan(
    plan_id: str, lesson_plan: LessonPlanUpdate, db: DBSession, user_id: CurrentUser
):
    service = LessonPlanService(db)
    updated_plan = await service.update(plan_id, user_id, lesson_plan)
    if not updated_plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=updated_plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson_plan(plan_id: str, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    success = await service.delete(plan_id, user_id)
    if not success:
        raise NotFoundException("LessonPlan", plan_id)


@router.post("/{plan_id}/publish", response_model=DataResponse[LessonPlanResponse])
async def publish_lesson_plan(plan_id: str, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    plan = await service.publish(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.post("/{plan_id}/unpublish", response_model=DataResponse[LessonPlanResponse])
async def unpublish_lesson_plan(plan_id: str, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    plan = await service.unpublish(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.post("/{plan_id}/archive", response_model=DataResponse[LessonPlanResponse])
async def archive_lesson_plan(plan_id: str, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    plan = await service.archive(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)


@router.post("/{plan_id}/restore", response_model=DataResponse[LessonPlanResponse])
async def restore_lesson_plan(plan_id: str, db: DBSession, user_id: CurrentUser):
    service = LessonPlanService(db)
    plan = await service.restore(plan_id, user_id)
    if not plan:
        raise NotFoundException("LessonPlan", plan_id)
    return DataResponse(data=plan)

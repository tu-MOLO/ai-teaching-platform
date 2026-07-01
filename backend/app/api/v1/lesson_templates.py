"""
教案模板相关的API接口
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.models.lesson_template import LessonTemplate
from app.schemas.base import DataResponse, ListResponse
from app.schemas.lesson_template import LessonTemplateResponse

router = APIRouter(tags=["教案模板"])

# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.get("", response_model=ListResponse[LessonTemplateResponse])
async def get_lesson_templates(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
):
    """
    获取教案模板列表

    Args:
        db: 数据库会话
        user_id: 当前用户ID
        page: 页码
        page_size: 每页数量

    Returns:
        教案模板列表
    """
    skip = (page - 1) * page_size
    result = await db.execute(
        select(LessonTemplate)
        .where(LessonTemplate.is_deleted == False)  # noqa: E712
        .offset(skip)
        .limit(page_size)
    )
    templates = result.scalars().all()
    total = (
        await db.execute(
            select(func.count(LessonTemplate.id)).where(
                LessonTemplate.is_deleted == False
            )  # noqa: E712
        )
    ).scalar() or 0
    pages = (total + page_size - 1) // page_size
    return ListResponse(
        data=list(templates), total=total, page=page, page_size=page_size, pages=pages
    )


@router.get("/{template_id}", response_model=DataResponse[LessonTemplateResponse])
async def get_lesson_template(template_id: str, db: DBSession, user_id: CurrentUser):
    """
    获取单个教案模板详情

    Args:
        template_id: 模板ID
        db: 数据库会话
        user_id: 当前用户ID

    Returns:
        教案模板详情
    """
    result = await db.execute(
        select(LessonTemplate)
        .where(LessonTemplate.id == template_id)
        .where(LessonTemplate.is_deleted == False)  # noqa: E712
    )
    template = result.scalar_one_or_none()

    if not template:
        raise NotFoundException("模板")

    return DataResponse(data=template)

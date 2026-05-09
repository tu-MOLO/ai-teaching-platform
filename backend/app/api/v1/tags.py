"""
标签相关API
"""
from typing import List, Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import InternalException, NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.schemas.tag import TagListResponse, TagResponse
from app.schemas.base import ListResponse, DataResponse
from app.services.tag import get_tag_service, TagService

router = APIRouter(tags=["标签"])

# 依赖注入类型
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.get("/", response_model=ListResponse[TagListResponse])
async def get_tags(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_async_session),
    tag_service: TagService = Depends(get_tag_service)
):
    """
    获取标签列表（公开接口）

    Args:
        page: 页码
        page_size: 每页数量
        db: 数据库会话
        tag_service: 标签服务

    Returns:
        标签列表
    """
    try:
        skip = (page - 1) * page_size
        tags = await tag_service.get_tags(db, skip=skip, limit=page_size)
        total = await tag_service.count_tags(db)
        pages = (total + page_size - 1) // page_size
        return ListResponse(
            data=tags,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages
        )
    except Exception as e:
        raise InternalException("获取标签列表失败")


@router.get("/{tag_id}", response_model=DataResponse[TagResponse])
async def get_tag(
    tag_id: str,
    current_user_id: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
    tag_service: TagService = Depends(get_tag_service)
):
    """
    根据ID获取标签

    Args:
        tag_id: 标签ID
        db: 数据库会话
        tag_service: 标签服务
        current_user_id: 当前用户ID

    Returns:
        标签详情
    """
    try:
        tag = await tag_service.get_tag_by_id(db, tag_id)
        if not tag:
            raise NotFoundException("标签")
        return DataResponse(data=tag)
    except NotFoundException:
        raise
    except Exception as e:
        raise InternalException("获取标签失败")

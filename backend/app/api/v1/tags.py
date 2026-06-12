"""
标签相关API
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import AlreadyExistsException, InternalException, NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate
from app.schemas.base import ListResponse, DataResponse
from app.services.tags import get_tag_service, TagService

router = APIRouter(tags=["标签"])

# 依赖注入类型
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.get("", response_model=ListResponse[TagListResponse])
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
    except Exception as _e:  # noqa: F841
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
    except Exception as _e:  # noqa: F841
        raise InternalException("获取标签失败")


@router.post("", response_model=DataResponse[TagResponse], status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    current_user_id: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
    tag_service: TagService = Depends(get_tag_service)
):
    """
    创建标签
    """
    try:
        existing = await tag_service.get_tag_by_name(db, tag_data.name)
        if existing:
            raise AlreadyExistsException("标签", "标签名称")
        tag = await tag_service.create_tag(db, tag_data)
        return DataResponse(data=tag)
    except AlreadyExistsException:
        raise
    except Exception:
        raise InternalException("创建标签失败")


@router.put("/{tag_id}", response_model=DataResponse[TagResponse])
async def update_tag(
    tag_id: str,
    tag_data: TagUpdate,
    current_user_id: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
    tag_service: TagService = Depends(get_tag_service)
):
    """
    更新标签
    """
    try:
        existing = await tag_service.get_tag_by_id(db, tag_id)
        if not existing:
            raise NotFoundException("标签")

        if tag_data.name and tag_data.name != existing.name:
            duplicate = await tag_service.get_tag_by_name(db, tag_data.name)
            if duplicate:
                raise AlreadyExistsException("标签", "标签名称")

        tag = await tag_service.update_tag(db, tag_id, tag_data)
        if not tag:
            raise NotFoundException("标签")
        return DataResponse(data=tag)
    except (AlreadyExistsException, NotFoundException):
        raise
    except Exception:
        raise InternalException("更新标签失败")


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    current_user_id: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
    tag_service: TagService = Depends(get_tag_service)
):
    """
    删除标签
    """
    try:
        success = await tag_service.delete_tag(db, tag_id)
        if not success:
            raise NotFoundException("标签")
    except NotFoundException:
        raise
    except Exception:
        raise InternalException("删除标签失败")

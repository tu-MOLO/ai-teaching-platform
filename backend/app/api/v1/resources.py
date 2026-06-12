"""
资源相关API
"""
import functools
import mimetypes
from typing import List, Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import (
    get_current_user_id_with_version_check,
)
from app.core.exceptions import (
    AuthorizationException,
    BadRequestException,
    InternalException,
    NotFoundException
)
from app.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceResponse,
    ResourceListResponse, ResourceSearchParams
)
from app.schemas.base import ListResponse, DataResponse
from app.services.resources import get_resource_service, ResourceService
from app.core.config import settings
from app.services.storage import is_allowed_file

router = APIRouter(tags=["资源"])

# 依赖注入类型
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


def serialize_resource(resource, file_url: str | None = None) -> dict:
    resource_dict = resource.to_dict()
    resource_dict["tags"] = [
        {"id": tag.id, "name": tag.name, "description": tag.description, "color": tag.color}
        for tag in resource.tags
    ] if resource.tags else []
    if file_url is not None:
        resource_dict["file_url"] = file_url
    return resource_dict


def handle_resource_errors(func):
    """
    资源端点统一异常处理装饰器
    让已知异常（BadRequestException、NotFoundException、AuthorizationException）自然抛出，
    只捕获未知异常并包装为 InternalException
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except (BadRequestException, NotFoundException, AuthorizationException):
            raise
        except Exception as e:
            raise InternalException(str(e))
    return wrapper


@router.post("", response_model=DataResponse[ResourceResponse], status_code=status.HTTP_201_CREATED)
@handle_resource_errors
async def create_resource(
    current_user_id: CurrentUser,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(None),
    tag_ids: List[str] = Form(None),
    db: AsyncSession = Depends(get_async_session),
    resource_service: ResourceService = Depends(get_resource_service)
):
    """
    创建资源

    Args:
        file: 上传的文件
        name: 资源名称
        description: 资源描述
        tag_ids: 标签ID列表
        user_id: 创建者ID
        db: 数据库会话
        resource_service: 资源服务

    Returns:
        创建的资源详情
    """
    # 检查文件类型
    if not file.filename:
        raise BadRequestException("文件名不能为空")
    file_header = await file.read(64)
    await file.seek(0)
    if not is_allowed_file(file.filename, file_header):
        raise BadRequestException("不支持的文件类型")

    # 检查文件大小
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise BadRequestException(f"文件大小超过限制（最大{settings.MAX_UPLOAD_SIZE//1024//1024}MB）")

    # 构建资源创建数据
    resource_data = ResourceCreate(
        name=name,
        description=description,
        tag_ids=tag_ids or []
    )

    # 创建资源
    resource = await resource_service.create_resource(
        db=db,
        resource_data=resource_data,
        file_data=file.file,
        file_name=file.filename,
        user_id=current_user_id
    )

    # 重新查询以预加载tags关系，避免async上下文中的懒加载问题
    resource_with_tags = await resource_service.get_resource_by_id(db, resource.id, user_id=current_user_id)
    if not resource_with_tags:
        raise NotFoundException("Resource", resource_id="")
    resource = resource_with_tags

    # 获取文件URL
    file_url = await resource_service.get_resource_file_url(resource)
    resource_dict = serialize_resource(resource, file_url=file_url)

    return DataResponse(data=resource_dict)


@router.get("", response_model=ListResponse[ResourceListResponse])
@handle_resource_errors
async def get_resources(
    current_user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    keyword: str = Query(None, description="搜索关键词"),
    tag_ids: List[str] = Query(None, description="标签ID列表"),
    file_type: str = Query(None, description="文件类型"),
    db: AsyncSession = Depends(get_async_session),
    resource_service: ResourceService = Depends(get_resource_service)
):
    """
    获取资源列表（支持搜索和筛选）

    Args:
        page: 页码
        page_size: 每页数量
        keyword: 搜索关键词
        tag_ids: 标签ID列表
        file_type: 文件类型
        db: 数据库会话
        resource_service: 资源服务

    Returns:
        资源列表和分页信息
    """
    params = ResourceSearchParams(
        page=page,
        page_size=page_size,
        keyword=keyword,
        tag_ids=tag_ids,
        file_type=file_type,
        user_id=current_user_id
    )

    # 获取资源列表
    resources, total = await resource_service.get_resources(db, params)

    # 计算总页数
    pages = (total + page_size - 1) // page_size

    # 将资源模型转换为响应格式
    resources_data = []
    for resource in resources:
        resource_dict = serialize_resource(resource)
        # 确保created_at是字符串格式
        if hasattr(resource, "created_at") and resource.created_at:
            from datetime import datetime
            if isinstance(resource.created_at, datetime):
                resource_dict["created_at"] = resource.created_at.isoformat()
        resources_data.append(resource_dict)

    return ListResponse(
        data=resources_data,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/{resource_id}", response_model=DataResponse[ResourceResponse])
@handle_resource_errors
async def get_resource(
    current_user_id: CurrentUser,
    resource_id: str,
    db: AsyncSession = Depends(get_async_session),
    resource_service: ResourceService = Depends(get_resource_service)
):
    """
    根据ID获取资源

    Args:
        resource_id: 资源ID
        db: 数据库会话
        resource_service: 资源服务

    Returns:
        资源详情
    """
    resource = await resource_service.get_resource_by_id(db, resource_id, user_id=current_user_id)
    if not resource:
        raise NotFoundException("Resource", resource_id)

    # 获取文件URL
    file_url = await resource_service.get_resource_file_url(resource)
    resource_dict = serialize_resource(resource, file_url=file_url)

    return DataResponse(data=resource_dict)


@router.put("/{resource_id}", response_model=DataResponse[ResourceResponse])
@handle_resource_errors
async def update_resource(
    resource_id: str,
    current_user_id: CurrentUser,
    resource_data: ResourceUpdate,
    db: AsyncSession = Depends(get_async_session),
    resource_service: ResourceService = Depends(get_resource_service)
):
    """
    更新资源

    Args:
        resource_id: 资源ID
        resource_data: 资源更新数据
        db: 数据库会话
        resource_service: 资源服务

    Returns:
        更新后的资源详情
    """
    resource = await resource_service.update_resource(db, resource_id, resource_data, current_user_id)
    if not resource:
        raise NotFoundException("Resource", resource_id)
    resource = await resource_service.get_resource_by_id(db, resource.id, user_id=current_user_id)
    if not resource:
        raise NotFoundException("Resource", resource_id)

    # 获取文件URL
    file_url = await resource_service.get_resource_file_url(resource)
    resource_dict = serialize_resource(resource, file_url=file_url)

    return DataResponse(data=resource_dict)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_resource_errors
async def delete_resource(
    resource_id: str,
    current_user_id: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
    resource_service: ResourceService = Depends(get_resource_service)
):
    """
    删除资源

    Args:
        resource_id: 资源ID
        db: 数据库会话
        resource_service: 资源服务

    Returns:
        成功消息
    """
    success = await resource_service.delete_resource(db, resource_id, current_user_id)
    if not success:
        raise NotFoundException("Resource", resource_id)


@router.get("/{resource_id}/file")
@handle_resource_errors
async def get_resource_file(
    resource_id: str,
    current_user_id: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
    resource_service: ResourceService = Depends(get_resource_service)
):
    try:
        resource, file_bytes, filename = await resource_service.get_resource_file_content(
            db=db,
            resource_id=resource_id,
            user_id=current_user_id
        )
        media_type = resource.file_type or mimetypes.guess_type(
            filename)[0] or "application/octet-stream"
        quoted_filename = quote(filename)
        headers = {
            "Content-Disposition": f"inline; filename*=UTF-8''{quoted_filename}",
            "Cache-Control": "private, max-age=3600",
        }
        return Response(content=file_bytes, media_type=media_type, headers=headers)
    except ValueError:
        raise NotFoundException("Resource", resource_id)

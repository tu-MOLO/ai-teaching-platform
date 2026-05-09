"""
课程API模块
实现课程的CRUD操作
"""
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.models.course import Course
from app.schemas.base import DataResponse, ListResponse
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.services.course import CourseService

router = APIRouter(tags=["课程管理"])


# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.post(
    "",
    response_model=DataResponse[CourseResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建课程"
)
async def create_course(
    course_in: CourseCreate,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[CourseResponse]:
    """
    创建新课程
    """
    course = await CourseService.create(db, course_in, user_id)
    return DataResponse(data=CourseResponse.model_validate(course))


@router.get(
    "/{course_id}",
    response_model=DataResponse[CourseResponse],
    summary="获取课程详情"
)
async def get_course(
    course_id: str,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[CourseResponse]:
    """
    根据ID获取课程详情
    """
    course = await CourseService.get_by_id(db, course_id, user_id)
    if not course:
        raise NotFoundException("课程")
    return DataResponse(data=CourseResponse.model_validate(course))


@router.get(
    "",
    response_model=ListResponse[CourseResponse],
    summary="获取课程列表"
)
async def get_courses(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    subject: Optional[str] = Query(None, description="学科筛选"),
    grade: Optional[str] = Query(None, description="年级筛选"),
    status: Optional[str] = Query(None, description="状态筛选")
) -> ListResponse[CourseResponse]:
    """
    获取课程列表，支持分页和筛选
    """
    # 计算偏移量
    offset = (page - 1) * page_size

    # 获取总数
    total = await CourseService.count(
        db,
        user_id,
        keyword=keyword,
        subject=subject,
        grade=grade,
        status=status
    )

    # 获取分页数据
    courses = await CourseService.get_list(
        db,
        user_id,
        skip=offset,
        limit=page_size,
        keyword=keyword,
        subject=subject,
        grade=grade,
        status=status
    )

    # 计算总页数
    pages = (total + page_size - 1) // page_size

    return ListResponse(
        data=[CourseResponse.model_validate(course) for course in courses],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.put(
    "/{course_id}",
    response_model=DataResponse[CourseResponse],
    summary="更新课程"
)
async def update_course(
    course_id: str,
    course_in: CourseUpdate,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[CourseResponse]:
    """
    更新课程信息
    """
    course = await CourseService.update(db, course_id, course_in, user_id)
    if not course:
        raise NotFoundException("课程")
    return DataResponse(data=CourseResponse.model_validate(course))


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除课程"
)
async def delete_course(
    course_id: str,
    db: DBSession,
    user_id: CurrentUser
) -> None:
    """
    删除课程（软删除）
    """
    success = await CourseService.delete(db, course_id, user_id)
    if not success:
        raise NotFoundException("课程")

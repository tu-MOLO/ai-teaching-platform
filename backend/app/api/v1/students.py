"""
学生API模块
实现学生的CRUD操作
"""
from typing import Annotated, Optional
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id
from app.models.student import Student
from app.schemas.base import DataResponse, ListResponse
from app.schemas.student import Student as StudentSchema, StudentCreate, StudentUpdate
from app.services.student import StudentService


def calculate_age(birth_date: date) -> int:
    """
    根据出生日期计算年龄

    Args:
        birth_date: 出生日期

    Returns:
        年龄（当前年份 - 出生年份）
    """
    today = date.today()
    return today.year - birth_date.year

router = APIRouter(tags=["学生管理"])


# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id)]


@router.post("", response_model=DataResponse[StudentSchema], status_code=status.HTTP_201_CREATED, summary="创建学生")
async def create_student(
    student_in: StudentCreate,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[StudentSchema]:
    """
    创建新学生
    """
    # 确保 is_active 默认为 True
    if student_in.is_active is None:
        student_in.is_active = True

    db_student = await StudentService.create(db, student_in, user_id)

    # 计算并设置进度和年龄
    db_student.progress = await StudentService.calculate_progress(db, db_student.id)
    db_student.age = calculate_age(db_student.birth_date)

    return DataResponse(data=StudentSchema.model_validate(db_student))


@router.get("/{student_id}", response_model=DataResponse[StudentSchema], summary="获取学生详情")
async def get_student(
    student_id: str,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[StudentSchema]:
    """
    根据ID获取学生详情
    """
    student = await StudentService.get(db, student_id, user_id)
    if not student:
        raise NotFoundException("学生")

    # 计算年龄
    student.age = calculate_age(student.birth_date)

    return DataResponse(data=StudentSchema.model_validate(student))


@router.get("", response_model=ListResponse[StudentSchema], summary="获取学生列表")
async def get_students(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    grade: Optional[str] = Query(None, description="年级筛选"),
    class_name: Optional[str] = Query(None, description="班级筛选")
) -> ListResponse[StudentSchema]:
    """
    获取学生列表，支持分页和筛选
    """
    # 计算偏移量
    offset = (page - 1) * page_size

    # 获取总数
    total = await StudentService.count(db, user_id=user_id, grade=grade, class_name=class_name)

    # 获取分页数据
    students = await StudentService.get_list(
        db, user_id=user_id, skip=offset, limit=page_size, grade=grade, class_name=class_name
    )

    # 为每个学生计算年龄
    for student in students:
        student.age = calculate_age(student.birth_date)

    # 计算总页数
    pages = (total + page_size - 1) // page_size

    return ListResponse(
        data=[StudentSchema.model_validate(student) for student in students],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.put("/{student_id}", response_model=DataResponse[StudentSchema], summary="更新学生")
async def update_student(
    student_id: str,
    student_in: StudentUpdate,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[StudentSchema]:
    """
    更新学生信息
    """
    student = await StudentService.update(db, student_id, student_in, user_id)
    if not student:
        raise NotFoundException("学生")

    return DataResponse(data=StudentSchema.model_validate(student))


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除学生")
async def delete_student(
    student_id: str,
    db: DBSession,
    user_id: CurrentUser
) -> None:
    """
    删除学生（软删除）
    """
    success = await StudentService.delete(db, student_id, user_id)
    if not success:
        raise NotFoundException("学生")


@router.get("/{student_id}/export", summary="导出学生成长报告")
async def export_student_portfolio(
    student_id: str,
    db: DBSession,
    user_id: CurrentUser
):
    """
    导出学生成长报告为PDF
    """
    # 检查学生是否存在
    student = await StudentService.get(db, student_id, user_id)
    if not student:
        raise NotFoundException("学生")

    # 获取学生的成长档案
    from app.models.portfolio import Portfolio

    portfolios_result = await db.execute(
        select(Portfolio).where(
            Portfolio.student_id == student_id,
            Portfolio.is_deleted == False
        )
    )
    portfolios = portfolios_result.scalars().all()

    # 导出PDF
    from app.services.export import ExportService
    export_service = ExportService()
    pdf_bytes = export_service.export_student_portfolio_to_pdf(student, portfolios)

    # 返回PDF文件
    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={student.name}_成长报告.pdf"
        }
    )

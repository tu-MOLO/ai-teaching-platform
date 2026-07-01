"""
报告API模块
实现教学数据分析报告的查询接口
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user_id_with_version_check
from app.schemas.base import DataResponse
from app.services.reports import ReportService

router = APIRouter(tags=["报告分析"])

# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.get("/dashboard", response_model=DataResponse[dict], summary="获取仪表盘报告")
async def get_dashboard_report(db: DBSession, user_id: CurrentUser) -> DataResponse[dict]:
    """
    获取仪表盘统计数据报告

    返回包括：
    - 总课程数及趋势
    - 总学生数及趋势
    - 活跃课程数
    - 平均学习进度
    - 本月新增数据
    - 最近活动列表
    """
    stats = await ReportService.get_dashboard_stats(db, user_id)
    return DataResponse(data=stats)


@router.get("/courses", response_model=DataResponse[dict], summary="获取课程统计报告")
async def get_course_report(db: DBSession, user_id: CurrentUser) -> DataResponse[dict]:
    """
    获取课程统计分析报告

    返回包括：
    - 课程分类统计（按学科）
    - 热门课程排行
    - 课程状态分布
    """
    stats = await ReportService.get_course_statistics(db, user_id)
    return DataResponse(data=stats)


@router.get("/students", response_model=DataResponse[dict], summary="获取学生统计报告")
async def get_student_report(db: DBSession, user_id: CurrentUser) -> DataResponse[dict]:
    """
    获取学生统计分析报告

    返回包括：
    - 学生年级分布
    - 学生性别分布
    - 学习进度分布
    """
    stats = await ReportService.get_student_statistics(db, user_id)
    return DataResponse(data=stats)


@router.get("/trends", response_model=DataResponse[list], summary="获取月度趋势数据")
async def get_monthly_trends(
    db: DBSession, user_id: CurrentUser, months: int = Query(6, ge=1, le=12, description="查询月数")
) -> DataResponse[list]:
    """
    获取月度教学趋势数据

    Args:
        months: 查询的月数（1-12个月）

    返回包括：
    - 每月新增课程数
    - 每月新增学生数
    """
    trends = await ReportService.get_monthly_trends(db, months, user_id)
    return DataResponse(data=trends)

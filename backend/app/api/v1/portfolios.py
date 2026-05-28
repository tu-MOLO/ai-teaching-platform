"""
成长档案API模块
实现成长档案的CRUD操作
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.schemas.base import DataResponse, ListResponse
from app.schemas.portfolio import Portfolio as PortfolioSchema, PortfolioCreate, PortfolioUpdate
from app.services.portfolio import PortfolioService

router = APIRouter(tags=["成长档案管理"])


# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.post("", response_model=DataResponse[PortfolioSchema], status_code=status.HTTP_201_CREATED, summary="创建成长档案")
async def create_portfolio(
    portfolio_in: PortfolioCreate,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[PortfolioSchema]:
    """
    创建新成长档案
    """
    db_portfolio = await PortfolioService.create(db, portfolio_in, user_id)
    return DataResponse(data=PortfolioSchema.model_validate(db_portfolio))


@router.get("/{portfolio_id}", response_model=DataResponse[PortfolioSchema], summary="获取成长档案详情")
async def get_portfolio(
    portfolio_id: str,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[PortfolioSchema]:
    """
    根据ID获取成长档案详情
    """
    portfolio = await PortfolioService.get(db, portfolio_id, user_id)
    if not portfolio:
        raise NotFoundException("成长档案")
    return DataResponse(data=PortfolioSchema.model_validate(portfolio))


@router.get("", response_model=ListResponse[PortfolioSchema], summary="获取成长档案列表")
async def get_portfolios(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    student_id: Optional[str] = Query(None, description="学生ID筛选"),
    type: Optional[str] = Query(None, description="记录类型筛选")
) -> ListResponse[PortfolioSchema]:
    """
    获取成长档案列表，支持分页和筛选
    """
    # 计算偏移量
    skip = (page - 1) * page_size
    
    # 获取成长档案列表
    portfolios = await PortfolioService.get_list(
        db, user_id, skip=skip, limit=page_size, student_id=student_id, type=type
    )
    
    # 获取总数
    total = await PortfolioService.count(db, user_id, student_id=student_id, type=type)
    
    # 计算总页数
    pages = (total + page_size - 1) // page_size
    
    return ListResponse(
        data=[PortfolioSchema.model_validate(portfolio) for portfolio in portfolios],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.put("/{portfolio_id}", response_model=DataResponse[PortfolioSchema], summary="更新成长档案")
async def update_portfolio(
    portfolio_id: str,
    portfolio_in: PortfolioUpdate,
    db: DBSession,
    user_id: CurrentUser
) -> DataResponse[PortfolioSchema]:
    """
    更新成长档案信息
    """
    portfolio = await PortfolioService.update(db, portfolio_id, portfolio_in, user_id)
    if not portfolio:
        raise NotFoundException("成长档案")
    return DataResponse(data=PortfolioSchema.model_validate(portfolio))


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除成长档案")
async def delete_portfolio(
    portfolio_id: str,
    db: DBSession,
    user_id: CurrentUser
) -> None:
    """
    删除成长档案（软删除）
    """
    success = await PortfolioService.delete(db, portfolio_id, user_id)
    if not success:
        raise NotFoundException("成长档案")

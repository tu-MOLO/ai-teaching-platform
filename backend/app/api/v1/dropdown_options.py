"""
Dropdown option APIs.
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import get_current_user_id
from app.schemas.base import DataResponse, ListResponse, MessageResponse
from app.schemas.dropdown_option import (
    DropdownOptionCreate,
    DropdownOptionResponse,
    DropdownOptionUpdate,
)
from app.services.dropdown_option import DropdownOptionService

router = APIRouter(prefix="/dropdown-options", tags=["dropdown-options"])

DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id)]


@router.get("", response_model=ListResponse[DropdownOptionResponse], summary="List dropdown options")
async def list_dropdown_options(
    db: DBSession,
    user_id: CurrentUser,
    group_key: Optional[str] = Query(default=None),
    active_only: bool = Query(default=True),
) -> ListResponse[DropdownOptionResponse]:
    options = await DropdownOptionService.list_options(
        db,
        group_key=group_key,
        active_only=active_only,
    )
    total = await DropdownOptionService.count_options(
        db,
        group_key=group_key,
        active_only=active_only,
    )
    return ListResponse(
        data=[DropdownOptionResponse.model_validate(item) for item in options],
        total=total,
        page=1,
        page_size=total or 1,
        pages=1,
    )


@router.post("", response_model=DataResponse[DropdownOptionResponse], status_code=status.HTTP_201_CREATED)
async def create_dropdown_option(
    option_in: DropdownOptionCreate,
    db: DBSession,
    user_id: CurrentUser,
) -> DataResponse[DropdownOptionResponse]:
    try:
        option = await DropdownOptionService.create_option(db, option_in)
    except ValueError as exc:
        raise BadRequestException(str(exc)) from exc

    return DataResponse(data=DropdownOptionResponse.model_validate(option))


@router.put("/{option_id}", response_model=DataResponse[DropdownOptionResponse])
async def update_dropdown_option(
    option_id: str,
    option_in: DropdownOptionUpdate,
    db: DBSession,
    user_id: CurrentUser,
) -> DataResponse[DropdownOptionResponse]:
    try:
        option = await DropdownOptionService.update_option(db, option_id, option_in)
    except ValueError as exc:
        raise BadRequestException(str(exc)) from exc

    if not option:
        raise NotFoundException("下拉选项")

    return DataResponse(data=DropdownOptionResponse.model_validate(option))


@router.delete("/{option_id}", response_model=MessageResponse)
async def delete_dropdown_option(
    option_id: str,
    db: DBSession,
    user_id: CurrentUser,
) -> MessageResponse:
    deleted = await DropdownOptionService.delete_option(db, option_id)
    if not deleted:
        raise NotFoundException("下拉选项")
    return MessageResponse(message="下拉选项删除成功", code="success")

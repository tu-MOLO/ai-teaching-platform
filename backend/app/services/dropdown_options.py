"""
Service for configurable dropdown options.
"""
from collections import defaultdict
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dropdown_option import DropdownOption
from app.schemas.dropdown_option import DropdownOptionCreate, DropdownOptionUpdate
from app.core.exceptions import AlreadyExistsException


class DropdownOptionService:
    @staticmethod
    async def list_options(
        db: AsyncSession,
        group_key: Optional[str] = None,
        active_only: bool = True,
    ) -> list[DropdownOption]:
        query = select(DropdownOption).where(DropdownOption.is_deleted == False)  # noqa: E712

        if group_key:
            query = query.where(DropdownOption.group_key == group_key)
        if active_only:
            query = query.where(DropdownOption.is_active == True)  # noqa: E712

        query = query.order_by(
            DropdownOption.group_key.asc(),
            DropdownOption.sort_order.asc(),
            DropdownOption.created_at.asc(),
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count_options(
        db: AsyncSession,
        group_key: Optional[str] = None,
        active_only: bool = True,
    ) -> int:
        query = select(func.count()).select_from(DropdownOption).where(
            DropdownOption.is_deleted == False  # noqa: E712
        )
        if group_key:
            query = query.where(DropdownOption.group_key == group_key)
        if active_only:
            query = query.where(DropdownOption.is_active == True)  # noqa: E712

        result = await db.execute(query)
        return int(result.scalar() or 0)

    @staticmethod
    async def create_option(db: AsyncSession, option_in: DropdownOptionCreate) -> DropdownOption:
        existing = await db.execute(
            select(DropdownOption).where(
                DropdownOption.group_key == option_in.group_key,
                DropdownOption.value == option_in.value,
                DropdownOption.is_deleted == False,  # noqa: E712
            )
        )
        existing_option = existing.scalar_one_or_none()
        if existing_option:
            raise AlreadyExistsException("下拉选项", "分组下已存在相同值")

        option = DropdownOption(**option_in.model_dump())
        db.add(option)
        await db.commit()
        await db.refresh(option)
        return option

    @staticmethod
    async def get_option(db: AsyncSession, option_id: str) -> Optional[DropdownOption]:
        result = await db.execute(
            select(DropdownOption).where(
                DropdownOption.id == option_id,
                DropdownOption.is_deleted == False,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_option(
        db: AsyncSession,
        option_id: str,
        option_in: DropdownOptionUpdate,
    ) -> Optional[DropdownOption]:
        option = await DropdownOptionService.get_option(db, option_id)
        if not option:
            return None

        update_data = option_in.model_dump(exclude_unset=True)
        next_value = update_data.get("value")
        if next_value and next_value != option.value:
            existing = await db.execute(
                select(DropdownOption).where(
                    DropdownOption.group_key == option.group_key,
                    DropdownOption.value == next_value,
                    DropdownOption.id != option.id,
                    DropdownOption.is_deleted == False,  # noqa: E712
                )
            )
            if existing.scalar_one_or_none():
                raise AlreadyExistsException("下拉选项", "分组下已存在相同值")

        for field, value in update_data.items():
            setattr(option, field, value)

        await db.commit()
        await db.refresh(option)
        return option

    @staticmethod
    async def delete_option(db: AsyncSession, option_id: str) -> bool:
        option = await DropdownOptionService.get_option(db, option_id)
        if not option:
            return False

        option.soft_delete()
        await db.commit()
        return True

    @staticmethod
    async def list_grouped_options(
        db: AsyncSession,
        active_only: bool = False,
    ) -> dict[str, list[DropdownOption]]:
        options = await DropdownOptionService.list_options(db, active_only=active_only)
        grouped: dict[str, list[DropdownOption]] = defaultdict(list)
        for option in options:
            grouped[option.group_key].append(option)
        return dict(grouped)

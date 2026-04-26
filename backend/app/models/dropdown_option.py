"""
Dropdown option model.
"""
from sqlalchemy import Boolean, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class DropdownOption(BaseModel):
    """Configurable dropdown option."""

    __tablename__ = "dropdown_options"
    __table_args__ = (
        UniqueConstraint("group_key", "value", name="uq_dropdown_group_value"),
        Index("ix_dropdown_group_key", "group_key"),
        Index("ix_dropdown_group_active_sort", "group_key", "is_active", "sort_order"),
    )

    group_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Dropdown group key",
    )
    label: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Display label",
    )
    value: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Stored value",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Optional description",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Sort order",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether option is active",
    )

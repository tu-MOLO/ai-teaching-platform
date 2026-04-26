"""
Schemas for configurable dropdown options.
"""
from typing import Optional

from pydantic import Field

from app.schemas.base import AuditSchema, BaseSchema


class DropdownOptionBase(BaseSchema):
    group_key: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)


class DropdownOptionCreate(DropdownOptionBase):
    pass


class DropdownOptionUpdate(BaseSchema):
    label: Optional[str] = Field(default=None, min_length=1, max_length=100)
    value: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    sort_order: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = Field(default=None)


class DropdownOptionResponse(DropdownOptionBase, AuditSchema):
    id: str

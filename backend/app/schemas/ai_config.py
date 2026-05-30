from typing import Optional

from pydantic import Field

from app.schemas.base import BaseSchema


class AIConfigResponse(BaseSchema):
    provider: str = Field(...)
    provider_name: Optional[str] = Field(None)
    api_base: str = Field(...)
    model: str = Field(...)
    api_key: Optional[str] = Field(None)
    is_active: bool = Field(True)
    is_user_configured: bool = Field(False)


class AIConfigUpdate(BaseSchema):
    provider: Optional[str] = Field(None)
    provider_name: Optional[str] = Field(None)
    api_base: Optional[str] = Field(None)
    model: Optional[str] = Field(None)
    api_key: Optional[str] = Field(None)


class AIConfigTestRequest(BaseSchema):
    provider: Optional[str] = Field(None)
    api_base: Optional[str] = Field(None)
    model: Optional[str] = Field(None)
    api_key: Optional[str] = Field(None)


class AIConfigTestResponse(BaseSchema):
    success: bool = Field(...)
    message: str = Field(...)

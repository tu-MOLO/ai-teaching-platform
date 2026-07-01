from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user_id_with_version_check
from app.schemas.ai_config import (
    AIConfigResponse,
    AIConfigTestRequest,
    AIConfigTestResponse,
    AIConfigUpdate,
)
from app.services.ai_config import AIConfigService

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


@router.get("/config", response_model=AIConfigResponse, summary="获取AI配置")
async def get_ai_config(
    db: DBSession,
    user_id: CurrentUser,
):
    return await AIConfigService.get_user_config(db, user_id)


@router.put("/config", response_model=AIConfigResponse, summary="更新AI配置")
async def update_ai_config(
    config_update: AIConfigUpdate,
    db: DBSession,
    user_id: CurrentUser,
):
    return await AIConfigService.save_config(db, user_id, config_update)


@router.post("/config/test", response_model=AIConfigTestResponse, summary="测试API连接")
async def test_ai_config(
    db: DBSession,
    user_id: CurrentUser,
    test_request: Optional[AIConfigTestRequest] = None,
):
    return await AIConfigService.test_connection(db, user_id, test_request)


@router.delete("/config", response_model=AIConfigResponse, summary="重置AI配置")
async def reset_ai_config(
    db: DBSession,
    user_id: CurrentUser,
):
    return await AIConfigService.reset_config(db, user_id)

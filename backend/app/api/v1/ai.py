import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session as get_db
from app.core.security import get_current_user_id
from app.schemas.ai import ChatRequest, ChatResponse, ConversationListSchema, ConversationSchema, MessageListSchema, MessageSchema, ConversationRenameRequest
from app.services.ai import AIService

router = APIRouter()

_rate_limit_store: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(user_id: str) -> bool:
    now = time.time()
    window = 60.0
    max_requests = settings.AI_REQUEST_RATE_LIMIT

    timestamps = _rate_limit_store[user_id]
    _rate_limit_store[user_id] = [t for t in timestamps if now - t < window]

    if len(_rate_limit_store[user_id]) >= max_requests:
        return False

    _rate_limit_store[user_id].append(now)
    return True


@router.post("/chat", summary="AI对话")
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if not _check_rate_limit(user_id):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")

    try:
        if request.stream:
            generator = await AIService.chat(db, user_id, request, stream=True)
            return StreamingResponse(
                generator,
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            return await AIService.chat(db, user_id, request, stream=False)
    except ValueError as e:
        if str(e) == "NO_API_KEY":
            raise HTTPException(status_code=400, detail="未配置API密钥，请先在设置中配置API密钥")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations", response_model=ConversationListSchema, summary="对话列表")
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    conversations = await AIService.get_conversations(db, user_id)
    return ConversationListSchema(
        data=conversations,
        total=len(conversations),
    )


@router.get("/conversations/{conversation_id}", response_model=MessageListSchema, summary="对话消息")
async def get_conversation_messages(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.get_conversation_messages(db, conversation_id, user_id)


@router.delete("/conversations/{conversation_id}", summary="删除对话")
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    success = await AIService.delete_conversation(db, conversation_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "删除成功", "code": "success"}


@router.patch("/conversations/{conversation_id}", summary="重命名对话")
async def rename_conversation(
    conversation_id: str,
    request: ConversationRenameRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await AIService.rename_conversation(db, conversation_id, user_id, request.title)
    if not result:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "重命名成功", "code": "success"}

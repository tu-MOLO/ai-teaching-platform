from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session as get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.rate_limiter import rate_limit_dep
from app.core.security import get_current_user_id_with_version_check
from app.schemas.ai import (
    ChatRequest,
    ConversationBatchDeleteRequest,
    ConversationListSchema,
    ConversationRenameRequest,
    MessageListSchema,
)
from app.services.ai import AIService

router = APIRouter()


@router.post("/chat", summary="AI对话")
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_dep("ai_chat")),
):

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
            raise BadRequestException("未配置API密钥，请先在设置中配置API密钥")
        raise BadRequestException(str(e))


@router.get("/conversations", response_model=ConversationListSchema, summary="对话列表")
async def list_conversations(
    archived: bool = Query(None, description="筛选归档状态：true=已归档，false=未归档，不传=全部"),
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
):
    conversations = await AIService.get_conversations(db, user_id, archived=archived)
    return ConversationListSchema(
        data=conversations,
        total=len(conversations),
    )


@router.get(
    "/conversations/{conversation_id}", response_model=MessageListSchema, summary="对话消息"
)
async def get_conversation_messages(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.get_conversation_messages(db, conversation_id, user_id)


@router.delete("/conversations/{conversation_id}", summary="删除对话")
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
):
    success = await AIService.delete_conversation(db, conversation_id, user_id)
    if not success:
        raise NotFoundException("对话")
    return {"message": "删除成功", "code": "success"}


@router.post("/conversations/batch-delete", summary="批量删除对话")
async def batch_delete_conversations(
    request: ConversationBatchDeleteRequest,
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
):
    deleted_count = await AIService.batch_delete_conversations(
        db, request.conversation_ids, user_id
    )
    return {"message": f"成功删除 {deleted_count} 条对话", "code": "success", "count": deleted_count}


@router.patch("/conversations/{conversation_id}", summary="重命名对话")
async def rename_conversation(
    conversation_id: str,
    request: ConversationRenameRequest,
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
):
    result = await AIService.rename_conversation(db, conversation_id, user_id, request.title)
    if not result:
        raise NotFoundException("对话")
    return {"message": "重命名成功", "code": "success"}


@router.post("/conversations/{conversation_id}/archive", summary="归档/取消归档对话")
async def archive_conversation(
    conversation_id: str,
    archived: bool = Query(..., description="true=归档，false=取消归档"),
    user_id: str = Depends(get_current_user_id_with_version_check),
    db: AsyncSession = Depends(get_db),
):
    result = await AIService.archive_conversation(db, conversation_id, user_id, archived)
    if not result:
        raise NotFoundException("对话")
    action = "归档" if archived else "取消归档"
    return {"message": f"{action}成功", "code": "success"}

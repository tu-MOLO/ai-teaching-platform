from typing import List, Optional

from pydantic import Field

from app.schemas.base import BaseSchema, ListResponse


class ChatRequest(BaseSchema):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(None)
    module: Optional[str] = Field(None)
    stream: bool = Field(True)


class ChatResponse(BaseSchema):
    conversation_id: str = Field(...)
    message: str = Field(...)
    module_tag: Optional[str] = Field(None)


class ConversationRenameRequest(BaseSchema):
    title: str = Field(..., min_length=1, max_length=100)


class ConversationBatchDeleteRequest(BaseSchema):
    conversation_ids: List[str] = Field(..., min_length=1)


class ConversationSchema(BaseSchema):
    id: str = Field(...)
    title: str = Field(...)
    module: Optional[str] = Field(None)
    is_archived: bool = Field(default=False)
    created_at: str = Field(...)
    updated_at: str = Field(...)


class ConversationListSchema(ListResponse[ConversationSchema]):
    pass


class MessageSchema(BaseSchema):
    id: str = Field(...)
    conversation_id: str = Field(...)
    role: str = Field(...)
    content: str = Field(...)
    tool_calls: Optional[str] = Field(None)
    tool_call_id: Optional[str] = Field(None)
    module_tag: Optional[str] = Field(None)
    created_at: str = Field(...)


class MessageListSchema(BaseSchema):
    data: List[MessageSchema] = Field(default_factory=list)

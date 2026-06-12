from typing import Optional

from sqlalchemy import String, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, SoftDeleteMixin


class AIModelBase(Base, UUIDMixin, TimestampMixin):
    __abstract__ = True


class AIConversation(AIModelBase, SoftDeleteMixin):
    __tablename__ = "ai_conversations"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    module: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    messages: Mapped[list["AIMessage"]] = relationship(
        "AIMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_ai_conversations_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<AIConversation(id={self.id}, user_id={self.user_id}, title={self.title})>"


class AIMessage(AIModelBase):
    __tablename__ = "ai_messages"

    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    tool_calls: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    tool_call_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    module_tag: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    conversation: Mapped["AIConversation"] = relationship(
        "AIConversation",
        back_populates="messages",
    )

    __table_args__ = (
        Index("ix_ai_messages_conversation_id", "conversation_id"),
    )

    def __repr__(self) -> str:
        return f"<AIMessage(id={
    self.id}, conversation_id={
        self.conversation_id}, role={
            self.role})>"

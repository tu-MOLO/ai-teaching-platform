"""
通知相关Schemas模块
定义通知数据的Pydantic模型
"""

from typing import List, Optional

from pydantic import ConfigDict, Field

from app.models.notification import NotificationType
from app.schemas.base import AuditSchema, BaseSchema

# ============== 基础字段 ==============


class NotificationBase(BaseSchema):
    """通知基础信息"""

    title: str = Field(..., min_length=1, max_length=200, description="通知标题")
    content: str = Field(..., min_length=1, description="通知内容")
    type: NotificationType = Field(default=NotificationType.SYSTEM, description="通知类型")


# ============== 创建请求 ==============


class NotificationCreate(NotificationBase):
    """通知创建请求"""

    user_id: str = Field(..., description="用户ID")
    target_id: Optional[str] = Field(default=None, description="关联对象ID")
    target_type: Optional[str] = Field(default=None, max_length=50, description="关联对象类型")


class NotificationCreateBulk(BaseSchema):
    """批量创建通知请求"""

    user_ids: List[str] = Field(..., description="用户ID列表")
    title: str = Field(..., min_length=1, max_length=200, description="通知标题")
    content: str = Field(..., min_length=1, description="通知内容")
    type: NotificationType = Field(default=NotificationType.SYSTEM, description="通知类型")
    target_id: Optional[str] = Field(default=None, description="关联对象ID")
    target_type: Optional[str] = Field(default=None, description="关联对象类型")


# ============== 更新请求 ==============


class NotificationUpdate(BaseSchema):
    """通知更新请求"""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200, description="通知标题")
    content: Optional[str] = Field(default=None, min_length=1, description="通知内容")
    read: Optional[bool] = Field(default=None, description="是否已读")


class NotificationReadRequest(BaseSchema):
    """标记通知已读请求"""

    ids: Optional[List[str]] = Field(default=None, description="通知ID列表，为空则标记所有")


# ============== 响应模型 ==============


class NotificationResponse(AuditSchema):
    """通知响应模型"""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="通知ID")
    user_id: str = Field(..., description="用户ID")
    title: str = Field(..., description="通知标题")
    content: str = Field(..., description="通知内容")
    type: NotificationType = Field(..., description="通知类型")
    read: bool = Field(default=False, description="是否已读")
    target_id: Optional[str] = Field(default=None, description="关联对象ID")
    target_type: Optional[str] = Field(default=None, description="关联对象类型")


class NotificationListResponse(BaseSchema):
    """通知列表响应"""

    data: List[NotificationResponse] = Field(default=[], description="通知列表")
    total: int = Field(default=0, description="总数量")
    unread_count: int = Field(default=0, description="未读数量")
    page: int = Field(default=1, description="页码")
    page_size: int = Field(default=20, description="每页数量")
    pages: int = Field(default=0, description="总页数")


# ============== 查询参数 ==============


class NotificationQueryParams(BaseSchema):
    """通知查询参数"""

    type: Optional[NotificationType] = Field(default=None, description="通知类型")
    read: Optional[bool] = Field(default=None, description="是否已读")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")


# ============== 统计信息 ==============


class NotificationStats(BaseSchema):
    """通知统计信息"""

    total: int = Field(default=0, description="总通知数")
    unread: int = Field(default=0, description="未读通知数")
    read: int = Field(default=0, description="已读通知数")
    by_type: dict = Field(default_factory=dict, description="按类型统计")

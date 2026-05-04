"""
通知API模块
实现通知相关的增删改查接口
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id
from app.models.notification import NotificationType
from app.schemas.base import MessageResponse
from app.schemas.notification import (
    NotificationListResponse,
    NotificationReadRequest,
    NotificationResponse,
    NotificationStats,
    NotificationUpdate
)
from app.services.notification import NotificationService

router = APIRouter(tags=["通知"])

# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id)]


@router.get("", response_model=NotificationListResponse, summary="获取通知列表")
async def get_notifications(
    db: DBSession,
    current_user: CurrentUser,
    type: Optional[NotificationType] = Query(None, description="通知类型筛选"),
    read: Optional[bool] = Query(None, description="已读状态筛选"),
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数")
) -> NotificationListResponse:
    """
    获取当前用户的通知列表
    
    支持按类型和已读状态筛选，按创建时间倒序排列
    """
    # 使用异步服务直接调用
    notifications = await NotificationService.get_list(
        db,
        user_id=current_user,
        skip=skip,
        limit=limit,
        notification_type=type,
        read=read
    )
    
    # 获取总数
    total = await NotificationService.count(
        db,
        user_id=current_user,
        notification_type=type,
        read=read
    )
    
    # 获取未读数量
    unread_count = await NotificationService.get_unread_count(db, current_user)
    
    # 转换为响应模型
    notification_responses = [
        NotificationResponse.model_validate(n) for n in notifications
    ]
    
    return NotificationListResponse(
        items=notification_responses,
        total=total,
        unread_count=unread_count
    )


@router.get("/stats", response_model=NotificationStats, summary="获取通知统计")
async def get_notification_stats(
    db: DBSession,
    current_user: CurrentUser
) -> NotificationStats:
    """
    获取当前用户的通知统计信息
    
    包括总数量、未读数量、已读数量和按类型统计
    """
    # 获取总数
    total = await NotificationService.count(db, user_id=current_user)
    
    # 获取未读数量
    unread = await NotificationService.get_unread_count(db, current_user)
    
    # 获取已读数量
    read = await NotificationService.count(db, user_id=current_user, read=True)
    
    # 按类型统计
    by_type = {}
    for notification_type in NotificationType:
        count = await NotificationService.count(
            db, user_id=current_user, notification_type=notification_type
        )
        by_type[notification_type.value] = count
    
    return NotificationStats(
        total=total,
        unread=unread,
        read=read,
        by_type=by_type
    )


@router.get("/unread-count", response_model=dict, summary="获取未读通知数量")
async def get_unread_count(
    db: DBSession,
    current_user: CurrentUser
) -> dict:
    """
    获取当前用户的未读通知数量
    """
    count = await NotificationService.get_unread_count(db, current_user)
    return {"unread_count": count}


@router.get("/{notification_id}", response_model=NotificationResponse, summary="获取通知详情")
async def get_notification(
    notification_id: str,
    db: DBSession,
    current_user: CurrentUser
) -> NotificationResponse:
    """
    获取指定通知的详细信息
    """
    notification = await NotificationService.get(
        db, notification_id, user_id=current_user
    )
    
    if not notification:
        raise NotFoundException("通知")

    return NotificationResponse.model_validate(notification)


@router.put("/{notification_id}/read", response_model=NotificationResponse, summary="标记通知为已读")
async def mark_notification_as_read(
    notification_id: str,
    db: DBSession,
    current_user: CurrentUser
) -> NotificationResponse:
    """
    将指定通知标记为已读
    """
    notification = await NotificationService.mark_as_read(
        db, notification_id, user_id=current_user
    )
    
    if not notification:
        raise NotFoundException("通知")
    
    return NotificationResponse.model_validate(notification)


@router.put("/read-all", response_model=MessageResponse, summary="标记所有通知为已读")
async def mark_all_as_read(
    db: DBSession,
    current_user: CurrentUser
) -> MessageResponse:
    """
    将当前用户的所有通知标记为已读
    """
    updated_count = await NotificationService.mark_all_as_read(db, current_user)
    
    return MessageResponse(
        message=f"成功标记 {updated_count} 条通知为已读",
        code="success"
    )


@router.put("/read-batch", response_model=MessageResponse, summary="批量标记通知为已读")
async def mark_batch_as_read(
    read_request: NotificationReadRequest,
    db: DBSession,
    current_user: CurrentUser
) -> MessageResponse:
    """
    批量标记通知为已读
    
    如果提供了ids列表，则标记指定通知；否则标记所有未读通知
    """
    if read_request.ids:
        updated_count = await NotificationService.mark_multiple_as_read(
            db, current_user, read_request.ids
        )
    else:
        updated_count = await NotificationService.mark_all_as_read(db, current_user)
    
    return MessageResponse(
        message=f"成功标记 {updated_count} 条通知为已读",
        code="success"
    )


@router.put("/{notification_id}", response_model=NotificationResponse, summary="更新通知")
async def update_notification(
    notification_id: str,
    notification_in: NotificationUpdate,
    db: DBSession,
    current_user: CurrentUser
) -> NotificationResponse:
    """
    更新通知信息
    """
    notification = await NotificationService.update(
        db, notification_id, current_user, notification_in
    )
    
    if not notification:
        raise NotFoundException("通知")
    
    return NotificationResponse.model_validate(notification)


@router.delete("/{notification_id}", response_model=MessageResponse, summary="删除通知")
async def delete_notification(
    notification_id: str,
    db: DBSession,
    current_user: CurrentUser
) -> MessageResponse:
    """
    删除指定通知（软删除）
    """
    success = await NotificationService.delete(
        db, notification_id, current_user
    )
    
    if not success:
        raise NotFoundException("通知")
    
    return MessageResponse(
        message="通知删除成功",
        code="success"
    )


@router.delete("/read/all", response_model=MessageResponse, summary="删除所有已读通知")
async def delete_all_read(
    db: DBSession,
    current_user: CurrentUser
) -> MessageResponse:
    """
    删除当前用户的所有已读通知
    """
    deleted_count = await NotificationService.delete_all_read(db, current_user)
    
    return MessageResponse(
        message=f"成功删除 {deleted_count} 条已读通知",
        code="success"
    )

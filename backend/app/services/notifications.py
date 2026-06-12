"""
通知服务 - 异步版本
"""
from typing import List, Optional

from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationCreate, NotificationCreateBulk, NotificationUpdate


class NotificationService:
    """通知服务类 - 异步版本"""

    @staticmethod
    async def create(db: AsyncSession, notification_in: NotificationCreate) -> Notification:
        """
        创建通知

        Args:
            db: 数据库会话
            notification_in: 通知创建数据

        Returns:
            创建的通知对象
        """
        db_notification = Notification(**notification_in.model_dump())
        db.add(db_notification)
        await db.commit()
        await db.refresh(db_notification)
        return db_notification

    @staticmethod
    async def create_bulk(db: AsyncSession, bulk_in: NotificationCreateBulk) -> List[Notification]:
        """
        批量创建通知

        Args:
            db: 数据库会话
            bulk_in: 批量创建数据

        Returns:
            创建的通知对象列表
        """
        notifications = []
        for user_id in bulk_in.user_ids:
            notification = Notification(
                user_id=user_id,
                title=bulk_in.title,
                content=bulk_in.content,
                type=bulk_in.type,
                target_id=bulk_in.target_id,
                target_type=bulk_in.target_type
            )
            notifications.append(notification)
            db.add(notification)

        await db.commit()
        for notification in notifications:
            await db.refresh(notification)
        return notifications

    @staticmethod
    async def get(
    db: AsyncSession,
    notification_id: str,
     user_id: Optional[str] = None) -> Optional[Notification]:
        """
        获取通知

        Args:
            db: 数据库会话
            notification_id: 通知ID
            user_id: 用户ID（用于权限验证）

        Returns:
            通知对象
        """
        query = select(Notification).where(
            Notification.id == notification_id,
            Notification.is_deleted == False  # noqa: E712
        )

        if user_id:
            query = query.where(Notification.user_id == user_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_list(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        notification_type: Optional[NotificationType] = None,
        read: Optional[bool] = None
    ) -> List[Notification]:
        """
        获取用户的通知列表

        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过的记录数
            limit: 返回的记录数
            notification_type: 通知类型筛选
            read: 已读状态筛选

        Returns:
            通知列表
        """
        query = select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_deleted == False  # noqa: E712
        )

        if notification_type:
            query = query.where(Notification.type == notification_type)

        if read is not None:
            query = query.where(Notification.read == read)

        # 按创建时间倒序排列
        query = query.order_by(desc(Notification.created_at))
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: str,
        notification_type: Optional[NotificationType] = None,
        read: Optional[bool] = None
    ) -> int:
        """
        统计通知数量

        Args:
            db: 数据库会话
            user_id: 用户ID
            notification_type: 通知类型筛选
            read: 已读状态筛选

        Returns:
            通知数量
        """
        query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_deleted == False  # noqa: E712
        )

        if notification_type:
            query = query.where(Notification.type == notification_type)

        if read is not None:
            query = query.where(Notification.read == read)

        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: str) -> int:
        """
        获取用户未读通知数量

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            未读通知数量
        """
        query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.read == False,  # noqa: E712
            Notification.is_deleted == False  # noqa: E712
        )
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def mark_as_read(
    db: AsyncSession,
    notification_id: str,
     user_id: str) -> Optional[Notification]:
        """
        标记通知为已读

        Args:
            db: 数据库会话
            notification_id: 通知ID
            user_id: 用户ID

        Returns:
            更新后的通知对象
        """
        db_notification = await NotificationService.get(db, notification_id, user_id)
        if not db_notification:
            return None

        db_notification.mark_as_read()
        await db.commit()
        await db.refresh(db_notification)
        return db_notification

    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
        """
        标记用户所有通知为已读

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            更新的通知数量
        """
        from sqlalchemy import update

        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read == False,  # noqa: E712
                Notification.is_deleted == False  # noqa: E712
            )
            .values(read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount  # type: ignore[attr-defined]

    @staticmethod
    async def mark_multiple_as_read(
    db: AsyncSession,
    user_id: str,
     notification_ids: List[str]) -> int:
        """
        批量标记通知为已读

        Args:
            db: 数据库会话
            user_id: 用户ID
            notification_ids: 通知ID列表

        Returns:
            更新的通知数量
        """
        from sqlalchemy import update

        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.id.in_(notification_ids),
                Notification.is_deleted == False  # noqa: E712
            )
            .values(read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount  # type: ignore[attr-defined]

    @staticmethod
    async def update(db: AsyncSession, notification_id: str, user_id: str,
                     notification_in: NotificationUpdate) -> Optional[Notification]:
        """
        更新通知

        Args:
            db: 数据库会话
            notification_id: 通知ID
            user_id: 用户ID
            notification_in: 通知更新数据

        Returns:
            更新后的通知对象
        """
        db_notification = await NotificationService.get(db, notification_id, user_id)
        if not db_notification:
            return None

        update_data = notification_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_notification, field, value)

        await db.commit()
        await db.refresh(db_notification)
        return db_notification

    @staticmethod
    async def delete(db: AsyncSession, notification_id: str, user_id: str) -> bool:
        """
        删除通知（软删除）

        Args:
            db: 数据库会话
            notification_id: 通知ID
            user_id: 用户ID

        Returns:
            是否删除成功
        """
        db_notification = await NotificationService.get(db, notification_id, user_id)
        if not db_notification:
            return False

        db_notification.soft_delete()
        await db.commit()
        return True

    @staticmethod
    async def delete_all_read(db: AsyncSession, user_id: str) -> int:
        """
        删除所有已读通知

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            删除的通知数量
        """
        query = select(Notification).where(
            Notification.user_id == user_id,
            Notification.read == True,  # noqa: E712
            Notification.is_deleted == False  # noqa: E712
        )
        result = await db.execute(query)
        notifications = result.scalars().all()

        for notification in notifications:
            notification.soft_delete()

        await db.commit()
        return len(notifications)

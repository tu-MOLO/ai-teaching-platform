import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call

from app.services.notification import NotificationService
from app.models.notification import NotificationType
from app.schemas.notification import NotificationCreate, NotificationCreateBulk


class TestCreate:
    @pytest.mark.asyncio
    async def test_notification_created_with_correct_fields(self):
        mock_db = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        mock_notification_in = MagicMock()
        mock_notification_in.model_dump.return_value = {
            "title": "Test Title",
            "content": "Test Content",
            "type": NotificationType.SYSTEM,
            "user_id": "user-1",
            "target_id": "target-1",
            "target_type": "student",
        }

        result = await NotificationService.create(mock_db, mock_notification_in)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()


class TestCreateBulk:
    @pytest.mark.asyncio
    async def test_creates_notifications_for_all_user_ids(self):
        mock_db = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        mock_bulk_in = MagicMock()
        mock_bulk_in.user_ids = ["user-1", "user-2", "user-3"]
        mock_bulk_in.title = "Bulk Title"
        mock_bulk_in.content = "Bulk Content"
        mock_bulk_in.type = NotificationType.COURSE
        mock_bulk_in.target_id = "target-1"
        mock_bulk_in.target_type = "lesson_plan"

        result = await NotificationService.create_bulk(mock_db, mock_bulk_in)

        assert mock_db.add.call_count == 3
        mock_db.commit.assert_called_once()
        assert mock_db.refresh.call_count == 3
        assert len(result) == 3


class TestNotificationServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_with_real_db(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="测试通知",
            content="这是一条测试通知内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
            target_id="some-target",
            target_type="student",
        )
        notification = await NotificationService.create(db_session, notification_in)
        assert notification is not None
        assert notification.title == "测试通知"
        assert notification.content == "这是一条测试通知内容"
        assert notification.type == NotificationType.SYSTEM
        assert notification.user_id == test_user.id
        assert notification.read is False

    @pytest.mark.asyncio
    async def test_create_bulk_with_real_db(self, db_session, test_user, inactive_user):
        bulk_in = NotificationCreateBulk(
            user_ids=[test_user.id, inactive_user.id],
            title="批量通知",
            content="批量通知内容",
            type=NotificationType.COURSE,
        )
        notifications = await NotificationService.create_bulk(db_session, bulk_in)
        assert len(notifications) == 2
        assert notifications[0].title == "批量通知"
        assert notifications[1].title == "批量通知"

    @pytest.mark.asyncio
    async def test_get_with_real_db(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="获取测试",
            content="获取测试内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        notification = await NotificationService.get(db_session, created.id, test_user.id)
        assert notification is not None
        assert notification.title == "获取测试"

    @pytest.mark.asyncio
    async def test_get_without_user_id(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="无用户过滤",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        notification = await NotificationService.get(db_session, created.id)
        assert notification is not None
        assert notification.id == created.id

    @pytest.mark.asyncio
    async def test_get_returns_none_for_wrong_user(self, db_session, test_user, inactive_user):
        notification_in = NotificationCreate(
            title="他人通知",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        notification = await NotificationService.get(db_session, created.id, inactive_user.id)
        assert notification is None

    @pytest.mark.asyncio
    async def test_get_list_with_real_db(self, db_session, test_user):
        for i in range(3):
            notification_in = NotificationCreate(
                title=f"列表通知{i}",
                content="内容",
                type=NotificationType.SYSTEM,
                user_id=test_user.id,
            )
            await NotificationService.create(db_session, notification_in)

        notifications = await NotificationService.get_list(db_session, test_user.id)
        assert len(notifications) >= 3

    @pytest.mark.asyncio
    async def test_get_list_with_type_filter(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="课程通知",
            content="内容",
            type=NotificationType.COURSE,
            user_id=test_user.id,
        )
        await NotificationService.create(db_session, notification_in)

        notifications = await NotificationService.get_list(
            db_session, test_user.id, notification_type=NotificationType.COURSE
        )
        assert len(notifications) >= 1
        assert all(n.type == NotificationType.COURSE for n in notifications)

    @pytest.mark.asyncio
    async def test_get_list_with_read_filter(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="未读通知",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        unread = await NotificationService.get_list(db_session, test_user.id, read=False)
        assert len(unread) >= 1

        read_notifications = await NotificationService.get_list(db_session, test_user.id, read=True)
        assert all(n.read is True for n in read_notifications)

    @pytest.mark.asyncio
    async def test_count_with_real_db(self, db_session, test_user):
        initial_count = await NotificationService.count(db_session, test_user.id)

        for i in range(2):
            notification_in = NotificationCreate(
                title=f"计数通知{i}",
                content="内容",
                type=NotificationType.SYSTEM,
                user_id=test_user.id,
            )
            await NotificationService.create(db_session, notification_in)

        new_count = await NotificationService.count(db_session, test_user.id)
        assert new_count == initial_count + 2

    @pytest.mark.asyncio
    async def test_count_with_type_filter(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="作业通知",
            content="内容",
            type=NotificationType.HOMEWORK,
            user_id=test_user.id,
        )
        await NotificationService.create(db_session, notification_in)

        count = await NotificationService.count(
            db_session, test_user.id, notification_type=NotificationType.HOMEWORK
        )
        assert count >= 1

    @pytest.mark.asyncio
    async def test_get_unread_count_with_real_db(self, db_session, test_user):
        for i in range(3):
            notification_in = NotificationCreate(
                title=f"未读{i}",
                content="内容",
                type=NotificationType.SYSTEM,
                user_id=test_user.id,
            )
            await NotificationService.create(db_session, notification_in)

        unread_count = await NotificationService.get_unread_count(db_session, test_user.id)
        assert unread_count >= 3

    @pytest.mark.asyncio
    async def test_mark_as_read_with_real_db(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="标记已读",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)
        assert created.read is False

        updated = await NotificationService.mark_as_read(db_session, created.id, test_user.id)
        assert updated is not None
        assert updated.read is True

    @pytest.mark.asyncio
    async def test_mark_as_read_returns_none_for_wrong_user(self, db_session, test_user, inactive_user):
        notification_in = NotificationCreate(
            title="他人通知",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        result = await NotificationService.mark_as_read(db_session, created.id, inactive_user.id)
        assert result is None

    @pytest.mark.asyncio
    async def test_mark_all_as_read_with_real_db(self, db_session, test_user):
        for i in range(3):
            notification_in = NotificationCreate(
                title=f"全部标记{i}",
                content="内容",
                type=NotificationType.SYSTEM,
                user_id=test_user.id,
            )
            await NotificationService.create(db_session, notification_in)

        count = await NotificationService.mark_all_as_read(db_session, test_user.id)
        assert count >= 3

        unread_count = await NotificationService.get_unread_count(db_session, test_user.id)
        assert unread_count == 0

    @pytest.mark.asyncio
    async def test_delete_with_real_db(self, db_session, test_user):
        notification_in = NotificationCreate(
            title="待删除通知",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        result = await NotificationService.delete(db_session, created.id, test_user.id)
        assert result is True

        notification = await NotificationService.get(db_session, created.id, test_user.id)
        assert notification is None

    @pytest.mark.asyncio
    async def test_delete_returns_false_for_wrong_user(self, db_session, test_user, inactive_user):
        notification_in = NotificationCreate(
            title="他人通知",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        created = await NotificationService.create(db_session, notification_in)

        result = await NotificationService.delete(db_session, created.id, inactive_user.id)
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_all_read_with_real_db(self, db_session, test_user):
        for i in range(2):
            notification_in = NotificationCreate(
                title=f"已读删除{i}",
                content="内容",
                type=NotificationType.SYSTEM,
                user_id=test_user.id,
            )
            created = await NotificationService.create(db_session, notification_in)
            await NotificationService.mark_as_read(db_session, created.id, test_user.id)

        notification_in = NotificationCreate(
            title="未读保留",
            content="内容",
            type=NotificationType.SYSTEM,
            user_id=test_user.id,
        )
        await NotificationService.create(db_session, notification_in)

        deleted_count = await NotificationService.delete_all_read(db_session, test_user.id)
        assert deleted_count >= 2

        remaining = await NotificationService.get_list(db_session, test_user.id, read=False)
        assert len(remaining) >= 1

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.lesson_plan import LessonPlanStatus
from app.schemas.lesson_plan import LessonPlanCreate, LessonPlanUpdate
from app.services.lesson_plans import LessonPlanService


class TestRestore:
    @pytest.mark.asyncio
    async def test_success(self):
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_plan = MagicMock()
        mock_plan.status = LessonPlanStatus.ARCHIVED

        service = LessonPlanService(mock_db)
        with patch.object(service, "get_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_plan
            result = await service.restore("plan-1", "user-1")

        assert result is mock_plan
        assert mock_plan.status == LessonPlanStatus.DRAFT
        mock_db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_not_found_returns_none(self):
        mock_db = AsyncMock()
        service = LessonPlanService(mock_db)
        with patch.object(service, "get_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            result = await service.restore("nonexistent", "user-1")

        assert result is None


class TestGetMonthlyCount:
    @pytest.mark.asyncio
    async def test_count_query(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar.return_value = 5
        mock_db.execute = AsyncMock(return_value=mock_result)

        service = LessonPlanService(mock_db)
        result = await service.get_monthly_count("user-1", 2025, 3)

        assert result == 5
        mock_db.execute.assert_called_once()


class TestGetDraftCount:
    @pytest.mark.asyncio
    async def test_count_query(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar.return_value = 3
        mock_db.execute = AsyncMock(return_value=mock_result)

        service = LessonPlanService(mock_db)
        result = await service.get_draft_count("user-1")

        assert result == 3
        mock_db.execute.assert_called_once()


class TestPublish:
    @pytest.mark.asyncio
    async def test_success_with_notification(self):
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_plan = MagicMock()
        mock_plan.status = LessonPlanStatus.DRAFT
        mock_plan.title = "My Lesson"
        mock_plan.id = "plan-1"

        service = LessonPlanService(mock_db)
        with patch.object(service, "get_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_plan
            with patch(
                "app.services.notifications.NotificationService.create", new_callable=AsyncMock
            ) as mock_notify:
                result = await service.publish("plan-1", "user-1")

        assert result is mock_plan
        assert mock_plan.status == LessonPlanStatus.PUBLISHED
        mock_db.flush.assert_called_once()
        mock_notify.assert_called_once()

    @pytest.mark.asyncio
    async def test_not_found_returns_none(self):
        mock_db = AsyncMock()
        service = LessonPlanService(mock_db)
        with patch.object(service, "get_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            result = await service.publish("nonexistent", "user-1")

        assert result is None


class TestLessonPlanServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="测试教案",
            subject="数学",
            grade="三年级",
            duration=45,
            teaching_objectives="掌握加法",
        )
        plan = await service.create(data, test_user.id)
        assert plan is not None
        assert plan.title == "测试教案"
        assert plan.subject == "数学"
        assert plan.status == LessonPlanStatus.DRAFT
        assert plan.user_id == test_user.id

    @pytest.mark.asyncio
    async def test_create_with_status(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="带状态教案",
            subject="语文",
            grade="二年级",
            duration=40,
            status=LessonPlanStatus.PUBLISHED,
        )
        plan = await service.create(data, test_user.id)
        assert plan.status == LessonPlanStatus.PUBLISHED

    @pytest.mark.asyncio
    async def test_get_list_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        for i in range(3):
            data = LessonPlanCreate(
                title=f"列表教案{i}",
                subject="英语",
                grade="四年级",
                duration=45,
            )
            await service.create(data, test_user.id)

        plans = await service.get_list(test_user.id)
        assert len(plans) >= 3

    @pytest.mark.asyncio
    async def test_get_list_with_status_filter(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="草稿教案",
            subject="物理",
            grade="五年级",
            duration=50,
        )
        await service.create(data, test_user.id)

        plans = await service.get_list(test_user.id, status_filter=LessonPlanStatus.DRAFT)
        assert len(plans) >= 1
        assert all(p.status == LessonPlanStatus.DRAFT for p in plans)

    @pytest.mark.asyncio
    async def test_get_list_with_search(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="独特搜索标题教案",
            subject="化学",
            grade="六年级",
            duration=45,
        )
        await service.create(data, test_user.id)

        plans = await service.get_list(test_user.id, search="独特搜索标题")
        assert len(plans) >= 1
        assert plans[0].title == "独特搜索标题教案"

    @pytest.mark.asyncio
    async def test_get_by_id_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="获取教案",
            subject="生物",
            grade="七年级",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        plan = await service.get_by_id(created.id, test_user.id)
        assert plan is not None
        assert plan.title == "获取教案"

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_for_wrong_user(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="他人教案",
            subject="历史",
            grade="八年级",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        plan = await service.get_by_id(created.id, "wrong-user-id")
        assert plan is None

    @pytest.mark.asyncio
    async def test_update_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="更新前教案",
            subject="地理",
            grade="九年级",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        update_data = LessonPlanUpdate(title="更新后教案", duration=60)
        updated = await service.update(created.id, test_user.id, update_data)
        assert updated is not None
        assert updated.title == "更新后教案"
        assert updated.duration == 60

    @pytest.mark.asyncio
    async def test_update_returns_none_for_wrong_user(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="不可更新教案",
            subject="政治",
            grade="高一",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        update_data = LessonPlanUpdate(title="不应更新")
        result = await service.update(created.id, "wrong-user-id", update_data)
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="待删除教案",
            subject="音乐",
            grade="高二",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        result = await service.delete(created.id, test_user.id)
        assert result is True

        plan = await service.get_by_id(created.id, test_user.id)
        assert plan is None

    @pytest.mark.asyncio
    async def test_delete_returns_false_for_wrong_user(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="不可删除教案",
            subject="美术",
            grade="高三",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        result = await service.delete(created.id, "wrong-user-id")
        assert result is False

    @pytest.mark.asyncio
    async def test_publish_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="发布教案",
            subject="体育",
            grade="四年级",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        published = await service.publish(created.id, test_user.id)
        assert published is not None
        assert published.status == LessonPlanStatus.PUBLISHED

    @pytest.mark.asyncio
    async def test_publish_returns_none_for_nonexistent(self, db_session, test_user):
        service = LessonPlanService(db_session)
        result = await service.publish("nonexistent-id", test_user.id)
        assert result is None

    @pytest.mark.asyncio
    async def test_unpublish_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="取消发布教案",
            subject="信息技术",
            grade="五年级",
            duration=45,
            status=LessonPlanStatus.PUBLISHED,
        )
        created = await service.create(data, test_user.id)

        unpublished = await service.unpublish(created.id, test_user.id)
        assert unpublished is not None
        assert unpublished.status == LessonPlanStatus.DRAFT

    @pytest.mark.asyncio
    async def test_archive_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="归档教案",
            subject="科学",
            grade="六年级",
            duration=45,
        )
        created = await service.create(data, test_user.id)

        archived = await service.archive(created.id, test_user.id)
        assert archived is not None
        assert archived.status == LessonPlanStatus.ARCHIVED

    @pytest.mark.asyncio
    async def test_archive_returns_none_for_nonexistent(self, db_session, test_user):
        service = LessonPlanService(db_session)
        result = await service.archive("nonexistent-id", test_user.id)
        assert result is None

    @pytest.mark.asyncio
    async def test_restore_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="恢复教案",
            subject="社会",
            grade="三年级",
            duration=45,
        )
        created = await service.create(data, test_user.id)
        await service.archive(created.id, test_user.id)

        restored = await service.restore(created.id, test_user.id)
        assert restored is not None
        assert restored.status == LessonPlanStatus.DRAFT

    @pytest.mark.asyncio
    async def test_restore_returns_none_for_nonexistent(self, db_session, test_user):
        service = LessonPlanService(db_session)
        result = await service.restore("nonexistent-id", test_user.id)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_monthly_count_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="月度统计教案",
            subject="数学",
            grade="三年级",
            duration=45,
        )
        await service.create(data, test_user.id)

        from datetime import datetime

        now = datetime.now()
        count = await service.get_monthly_count(test_user.id, now.year, now.month)
        assert count >= 1

    @pytest.mark.asyncio
    async def test_get_draft_count_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        data = LessonPlanCreate(
            title="草稿统计教案",
            subject="语文",
            grade="二年级",
            duration=40,
        )
        await service.create(data, test_user.id)

        count = await service.get_draft_count(test_user.id)
        assert count >= 1

    @pytest.mark.asyncio
    async def test_count_with_real_db(self, db_session, test_user):
        service = LessonPlanService(db_session)
        initial_count = await service.count(test_user.id)

        data = LessonPlanCreate(
            title="计数教案",
            subject="英语",
            grade="四年级",
            duration=45,
        )
        await service.create(data, test_user.id)

        new_count = await service.count(test_user.id)
        assert new_count == initial_count + 1

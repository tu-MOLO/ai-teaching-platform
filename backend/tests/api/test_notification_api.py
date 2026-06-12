import pytest
import pytest_asyncio

from app.models.notification import Notification, NotificationType


@pytest_asyncio.fixture(scope="function")
async def seed_notifications(db_session, test_user):
    notifications = []
    for i in range(5):
        n = Notification(
            user_id=test_user.id,
            title=f"通知标题{i}",
            content=f"通知内容{i}",
            type=NotificationType.SYSTEM if i % 2 == 0 else NotificationType.COURSE,
            read=(i < 2),
        )
        db_session.add(n)
        notifications.append(n)
    await db_session.commit()
    for n in notifications:
        await db_session.refresh(n)
    return notifications


class TestNotificationAPI:
    @pytest.mark.asyncio
    async def test_list_notifications(self, client, test_user, auth_headers, seed_notifications):
        response = await client.get("/api/v1/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert data["unread_count"] == 3
        assert len(data["data"]) == 5
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_notifications_pagination(
    self, client, test_user, auth_headers, seed_notifications):
        response = await client.get("/api/v1/notifications?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    @pytest.mark.asyncio
    async def test_list_notifications_filter_by_type(
    self, client, test_user, auth_headers, seed_notifications):
        response = await client.get("/api/v1/notifications?type=system", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["data"]:
            assert item["type"] == "system"

    @pytest.mark.asyncio
    async def test_list_notifications_filter_by_read(
    self, client, test_user, auth_headers, seed_notifications):
        response = await client.get("/api/v1/notifications?read=false", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["data"]:
            assert item["read"] is False

    @pytest.mark.asyncio
    async def test_get_notification_stats(
    self,
    client,
    test_user,
    auth_headers,
     seed_notifications):
        response = await client.get("/api/v1/notifications/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert data["unread"] == 3
        assert data["read"] == 2
        assert "by_type" in data

    @pytest.mark.asyncio
    async def test_get_unread_count(self, client, test_user, auth_headers, seed_notifications):
        response = await client.get("/api/v1/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["unread_count"] == 3

    @pytest.mark.asyncio
    async def test_get_notification_detail(
    self,
    client,
    test_user,
    auth_headers,
     seed_notifications):
        notification_id = seed_notifications[0].id
        response = await client.get(f"/api/v1/notifications/{notification_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == notification_id
        assert data["title"] == "通知标题0"

    @pytest.mark.asyncio
    async def test_get_notification_not_found(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/notifications/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_mark_notification_as_read(
    self, client, test_user, auth_headers, seed_notifications):
        unread = [n for n in seed_notifications if not n.read]
        notification_id = unread[0].id
        response = await client.put(f"/api/v1/notifications/{notification_id}/read", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["read"] is True

    @pytest.mark.asyncio
    async def test_mark_notification_as_read_not_found(self, client, test_user, auth_headers):
        response = await client.put("/api/v1/notifications/nonexistent-id/read", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_mark_all_as_read(self, client, test_user, auth_headers, seed_notifications):
        response = await client.put("/api/v1/notifications/read-all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "success"

        count_resp = await client.get("/api/v1/notifications/unread-count", headers=auth_headers)
        assert count_resp.json()["unread_count"] == 0

    @pytest.mark.asyncio
    async def test_mark_batch_as_read(self, client, test_user, auth_headers, seed_notifications):
        unread = [n for n in seed_notifications if not n.read]
        ids = [n.id for n in unread[:2]]
        response = await client.put("/api/v1/notifications/read-batch", json={"ids": ids}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "success"

    @pytest.mark.asyncio
    async def test_mark_batch_as_read_without_ids(
    self, client, test_user, auth_headers, seed_notifications):
        response = await client.put("/api/v1/notifications/read-batch", json={}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "success"

    @pytest.mark.asyncio
    async def test_update_notification(self, client, test_user, auth_headers, seed_notifications):
        notification_id = seed_notifications[0].id
        response = await client.put(
            f"/api/v1/notifications/{notification_id}",
            json={"title": "更新后的标题", "content": "更新后的内容"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "更新后的标题"
        assert data["content"] == "更新后的内容"

    @pytest.mark.asyncio
    async def test_update_notification_not_found(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/notifications/nonexistent-id",
            json={"title": "不存在"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_notification(self, client, test_user, auth_headers, seed_notifications):
        notification_id = seed_notifications[0].id
        response = await client.delete(f"/api/v1/notifications/{notification_id}", headers=auth_headers)
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/notifications/{notification_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_notification_not_found(self, client, test_user, auth_headers):
        response = await client.delete("/api/v1/notifications/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_all_read(self, client, test_user, auth_headers, seed_notifications):
        response = await client.delete("/api/v1/notifications/read/all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "success"

    @pytest.mark.asyncio
    async def test_empty_notification_list(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

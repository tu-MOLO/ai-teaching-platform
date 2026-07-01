"""
用户服务测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.users import UserService
from app.schemas.user import UserUpdate


class TestUserService:
    """用户服务测试"""

    @pytest.mark.asyncio
    async def test_get_user_success(self):
        """测试获取用户成功"""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = MagicMock(id="user-123", username="test")
        db.execute = AsyncMock(return_value=result_mock)

        user = await UserService.get(db, "user-123")

        assert user is not None
        assert user.id == "user-123"
        db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_not_found(self):
        """测试获取用户不存在"""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result_mock)

        user = await UserService.get(db, "non-existent")

        assert user is None

    @pytest.mark.asyncio
    async def test_update_user_success(self):
        """测试更新用户成功"""
        db = AsyncMock()
        user_mock = MagicMock(id="user-123", username="old")
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = user_mock
        db.execute = AsyncMock(return_value=result_mock)
        db.refresh = AsyncMock()

        user_data = UserUpdate(username="new_username")
        updated_user = await UserService.update(db, "user-123", user_data)

        assert updated_user is not None
        assert updated_user.username == "new_username"
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(updated_user)

    @pytest.mark.asyncio
    async def test_update_user_not_found(self):
        """测试更新不存在的用户"""
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result_mock)

        user_data = UserUpdate(username="new")
        updated_user = await UserService.update(db, "non-existent", user_data)

        assert updated_user is None

    @pytest.mark.asyncio
    async def test_verify_ownership_same_user(self):
        """测试验证所有权 - 同一用户"""
        db = AsyncMock()
        result = await UserService.verify_ownership(db, "user-123", "user-123")
        assert result is True

    @pytest.mark.asyncio
    async def test_verify_ownership_different_user(self):
        """测试验证所有权 - 不同用户"""
        db = AsyncMock()
        result = await UserService.verify_ownership(db, "user-123", "user-456")
        assert result is False

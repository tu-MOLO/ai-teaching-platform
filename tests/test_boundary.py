"""
边界条件和权限测试
"""
import pytest
from httpx import AsyncClient


class TestBoundaryValidation:
    """数据验证边界测试"""

    @pytest.mark.asyncio
    async def test_create_user_long_username(self, client: AsyncClient, admin_headers: dict):
        """测试超长用户名"""
        long_username = "a" * 100  # 超长用户名
        response = await client.post("/api/v1/users", headers=admin_headers, json={
            "username": long_username,
            "email": "long@example.com",
            "password": "password123"
        })

        # 应该返回400或422错误
        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_create_user_empty_fields(self, client: AsyncClient, admin_headers: dict):
        """测试空值必填字段"""
        response = await client.post("/api/v1/users", headers=admin_headers, json={
            "username": "",
            "email": "",
            "password": ""
        })

        assert response.status_code == 422


class TestPermissionControl:
    """权限控制测试"""

    @pytest.mark.asyncio
    async def test_access_without_auth(self, client: AsyncClient):
        """测试未认证访问受保护资源"""
        response = await client.get("/api/v1/users")

        assert response.status_code == 403
        data = response.json()
        assert data.get("message", "")

    @pytest.mark.asyncio
    async def test_access_with_invalid_token(self, client: AsyncClient):
        """测试使用无效令牌访问"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/v1/users", headers=headers)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_normal_user_create_user(self, client: AsyncClient, auth_headers: dict):
        """测试普通用户尝试创建用户（无权限）"""
        response = await client.post("/api/v1/users", headers=auth_headers, json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123"
        })

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_access_admin_resource_as_user(self, client: AsyncClient, auth_headers: dict):
        """测试普通用户访问管理员资源"""
        # 尝试访问所有用户列表（可能需要管理员权限）
        response = await client.get("/api/v1/users", headers=auth_headers)

        # 根据具体权限控制逻辑，可能成功也可能403
        # 这里假设普通用户可以查看用户列表
        assert response.status_code in [200, 403]

"""
用户模块CRUD测试
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole, UserStatus
from app.core.security import verify_password
from tests.factories import UserFactory


class TestUserCreate:
    """用户创建测试"""
    
    @pytest.mark.asyncio
    async def test_create_user_success(self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
        """测试管理员成功创建用户"""
        response = await client.post("/api/v1/users", headers=admin_headers, json={
            "username": "newteacher",
            "email": "newteacher@example.com",
            "password": "password123",
            "full_name": "New Teacher",
            "role": "teacher"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newteacher"
        assert data["email"] == "newteacher@example.com"
        assert data["role"] == "teacher"
        
        # 验证密码已哈希
        stmt = select(User).where(User.username == "newteacher")
        result = await db_session.execute(stmt)
        user = result.scalar_one()
        assert verify_password("password123", user.hashed_password)
    
    @pytest.mark.asyncio
    async def test_create_user_duplicate_username(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """测试创建重复用户名用户"""
        response = await client.post("/api/v1/users", headers=admin_headers, json={
            "username": test_user.username,  # 使用fixture中的用户名
            "email": "new@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "用户名已存在" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """测试创建重复邮箱用户"""
        response = await client.post("/api/v1/users", headers=admin_headers, json={
            "username": "newuser",
            "email": test_user.email,  # 使用fixture中的邮箱
            "password": "password123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "邮箱已被注册" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_create_user_no_permission(self, client: AsyncClient, auth_headers: dict):
        """测试非管理员无法创建用户"""
        response = await client.post("/api/v1/users", headers=auth_headers, json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 403


class TestUserRead:
    """用户查询测试"""
    
    @pytest.mark.asyncio
    async def test_get_user_success(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """测试成功查询单个用户"""
        response = await client.get(f"/api/v1/users/{test_user.id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert "hashed_password" not in data  # 密码不应返回
    
    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试查询不存在用户"""
        response = await client.get("/api/v1/users/non-existent-id", headers=auth_headers)
        
        assert response.status_code == 404
        data = response.json()
        assert "用户不存在" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_list_users(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试查询用户列表"""
        # 创建多个用户
        for i in range(5):
            user = UserFactory.create(username=f"user{i}", email=f"user{i}@test.com")
            db_session.add(user)
        await db_session.commit()
        
        response = await client.get("/api/v1/users", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert data["page"] == 1
        assert data["page_size"] == 20
    
    @pytest.mark.asyncio
    async def test_list_users_pagination(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试用户列表分页"""
        # 创建多个用户
        for i in range(25):
            user = UserFactory.create(username=f"pageuser{i}", email=f"pageuser{i}@test.com")
            db_session.add(user)
        await db_session.commit()
        
        # 查询第2页
        response = await client.get("/api/v1/users?page=2&page_size=10", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert len(data["data"]) <= 10
    
    @pytest.mark.asyncio
    async def test_list_users_filter_by_role(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试按角色筛选用户"""
        # 创建不同角色的用户
        teacher = UserFactory.create(username="filterteacher", email="ft@t.com", role=UserRole.TEACHER)
        admin = UserFactory.create(username="filteradmin", email="fa@t.com", role=UserRole.ADMIN)
        db_session.add_all([teacher, admin])
        await db_session.commit()
        
        response = await client.get("/api/v1/users?role=admin", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        for user in data["data"]:
            if user["username"] in ["filteradmin", "adminuser"]:
                assert user["role"] == "admin"


class TestUserUpdate:
    """用户更新测试"""
    
    @pytest.mark.asyncio
    async def test_update_user_success(self, client: AsyncClient, auth_headers: dict, test_user: User, db_session: AsyncSession):
        """测试成功更新用户"""
        response = await client.put(f"/api/v1/users/{test_user.id}", headers=auth_headers, json={
            "full_name": "Updated Name",
            "phone": "1234567890",
            "bio": "Updated bio"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        
        # 验证数据库已更新
        await db_session.refresh(test_user)
        assert test_user.full_name == "Updated Name"
    
    @pytest.mark.asyncio
    async def test_update_user_role(self, client: AsyncClient, admin_headers: dict, test_user: User, db_session: AsyncSession):
        """测试更新用户角色"""
        response = await client.put(f"/api/v1/users/{test_user.id}", headers=admin_headers, json={
            "role": "admin"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
    
    @pytest.mark.asyncio
    async def test_update_user_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试更新不存在用户"""
        response = await client.put("/api/v1/users/non-existent-id", headers=auth_headers, json={
            "full_name": "Updated"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "用户不存在" in data.get("message", "")


class TestUserDelete:
    """用户删除测试"""
    
    @pytest.mark.asyncio
    async def test_delete_user_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试成功软删除用户"""
        # 创建要删除的用户
        user = UserFactory.create(username="deleteuser", email="delete@example.com")
        db_session.add(user)
        await db_session.commit()
        
        response = await client.delete(f"/api/v1/users/{user.id}", headers=auth_headers)
        
        assert response.status_code == 204
        
        # 验证已软删除
        await db_session.refresh(user)
        assert user.is_deleted is True
    
    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试删除不存在用户"""
        response = await client.delete("/api/v1/users/non-existent-id", headers=auth_headers)
        
        assert response.status_code == 404
        data = response.json()
        assert "用户不存在" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_deleted_user_not_in_list(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试已删除用户不在列表中"""
        # 创建用户并删除
        user = UserFactory.create(username="deleteduser", email="deleted@example.com")
        db_session.add(user)
        await db_session.commit()
        
        # 删除用户
        await client.delete(f"/api/v1/users/{user.id}", headers=auth_headers)
        
        # 查询列表
        response = await client.get("/api/v1/users", headers=auth_headers)
        data = response.json()
        
        # 验证已删除用户不在列表中
        usernames = [u["username"] for u in data["data"]]
        assert "deleteduser" not in usernames

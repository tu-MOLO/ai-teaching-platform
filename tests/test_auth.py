"""
认证模块测试
测试用户注册、登录、令牌管理等功能
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserStatus, UserRole
from app.core.security import verify_password


class TestAuthRegister:
    """用户注册测试"""
    
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient, db_session: AsyncSession):
        """测试成功注册"""
        response = await client.post("/api/v1/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "password123",
            "full_name": "New User"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "注册成功，请检查邮箱完成验证"
        assert data["code"] == "success"
        
        # 验证用户已创建
        stmt = select(User).where(User.username == "newuser")
        result = await db_session.execute(stmt)
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.email == "newuser@example.com"
        assert user.status == UserStatus.PENDING
        assert verify_password("password123", user.hashed_password)
    
    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client: AsyncClient, test_user: User):
        """测试重复用户名注册"""
        # 先注册一个用户
        await client.post("/api/v1/auth/register", json={
            "username": "testduplicate",
            "email": "testdup@example.com",
            "password": "password123",
            "full_name": "Test User"
        })
        
        # 再次使用相同用户名注册
        response = await client.post("/api/v1/auth/register", json={
            "username": "testduplicate",
            "email": "another@example.com",
            "password": "password123",
            "full_name": "Another User"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "用户名已存在" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """测试重复邮箱注册"""
        # 先注册一个用户
        await client.post("/api/v1/auth/register", json={
            "username": "emailtest1",
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "Test User"
        })
        
        # 再次使用相同邮箱注册
        response = await client.post("/api/v1/auth/register", json={
            "username": "emailtest2",
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "Another User"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "邮箱已被注册" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """测试无效邮箱格式"""
        response = await client.post("/api/v1/auth/register", json={
            "username": "testuser",
            "email": "invalid-email",
            "password": "password123",
            "full_name": "Test User"
        })
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_register_missing_required_fields(self, client: AsyncClient):
        """测试缺少必填字段"""
        response = await client.post("/api/v1/auth/register", json={
            "username": "testuser"
            # 缺少 email, password
        })
        
        assert response.status_code == 422


class TestAuthLogin:
    """用户登录测试"""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """测试成功登录"""
        response = await client.post("/api/v1/auth/login", json={
            "username": test_user.username,
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "access_token" in data["token"]
        assert "refresh_token" in data["token"]
        assert data["token"]["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == test_user.username
    
    @pytest.mark.asyncio
    async def test_login_with_email(self, client: AsyncClient, test_user: User):
        """测试使用邮箱登录"""
        response = await client.post("/api/v1/auth/login", json={
            "username": test_user.email,
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """测试错误密码"""
        response = await client.post("/api/v1/auth/login", json={
            "username": test_user.username,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "用户名或密码错误" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """测试不存在用户登录"""
        response = await client.post("/api/v1/auth/login", json={
            "username": "nonexistent",
            "password": "password123"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "用户名或密码错误" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_login_disabled_user(self, client: AsyncClient, db_session: AsyncSession):
        """测试已禁用账户登录"""
        # 创建一个禁用的用户
        from app.core.security import get_password_hash
        unique_id = str(id(self))[:8]
        disabled_user = User(
            username=f"disableduser_{unique_id}",
            email=f"disabled_{unique_id}@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Disabled User",
            role=UserRole.TEACHER,
            status=UserStatus.SUSPENDED,
            is_active=False
        )
        db_session.add(disabled_user)
        await db_session.commit()
        
        response = await client.post("/api/v1/auth/login", json={
            "username": disabled_user.username,
            "password": "password123"
        })
        
        assert response.status_code == 403
        data = response.json()
        assert "账户已被禁用" in data.get("message", "")


class TestAuthToken:
    """令牌管理测试"""
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, test_user: User):
        """测试成功刷新令牌"""
        # 先登录获取刷新令牌
        login_response = await client.post("/api/v1/auth/login", json={
            "username": test_user.username,
            "password": "testpassword123"
        })
        login_data = login_response.json()
        refresh_token = login_data["token"]["refresh_token"]
        
        # 使用刷新令牌获取新令牌
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """测试无效刷新令牌"""
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid_token"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "无效的刷新令牌" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_get_current_user(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """测试获取当前用户信息"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
    
    @pytest.mark.asyncio
    async def test_get_current_user_no_auth(self, client: AsyncClient):
        """测试未认证获取用户信息"""
        response = await client.get("/api/v1/auth/me")
        
        # 应该返回401或403
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_logout(self, client: AsyncClient, auth_headers: dict, test_user: User, db_session: AsyncSession):
        """测试登出"""
        response = await client.post("/api/v1/auth/logout", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "登出成功" in data.get("message", "")

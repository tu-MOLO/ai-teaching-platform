import pytest
import pytest_asyncio
import bcrypt

from app.models.user import User, UserRole
from app.models.permission import Permission, Role, RolePermission
from app.services.permission import PermissionService, DEFAULT_TEACHER_PERMISSIONS


@pytest_asyncio.fixture
async def teacher_user(db_session):
    user = User(
        email="perm_teacher@example.com",
        username="perm_teacher",
        hashed_password=bcrypt.hashpw(
            "Pass123!".encode(), bcrypt.gensalt()
        ).decode(),
        role=UserRole.TEACHER,
        is_active=True,
        security_question="q?",
        hashed_security_answer=bcrypt.hashpw(
            "a".encode(), bcrypt.gensalt()
        ).decode(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user_perm(db_session):
    user = User(
        email="perm_admin@example.com",
        username="perm_admin",
        hashed_password=bcrypt.hashpw(
            "Pass123!".encode(), bcrypt.gensalt()
        ).decode(),
        role=UserRole.ADMIN,
        is_active=True,
        security_question="q?",
        hashed_security_answer=bcrypt.hashpw(
            "a".encode(), bcrypt.gensalt()
        ).decode(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
def perm_service(db_session):
    return PermissionService(db_session)


class TestGetPermissionsByRoleCode:
    @pytest.mark.asyncio
    async def test_teacher_role_returns_permissions(self, perm_service):
        result = await perm_service.get_permissions_by_role_code("teacher")
        assert isinstance(result, list)
        assert len(result) > 0
        for perm in DEFAULT_TEACHER_PERMISSIONS:
            assert perm in result

    @pytest.mark.asyncio
    async def test_unknown_role_returns_empty(self, perm_service):
        result = await perm_service.get_permissions_by_role_code("admin")
        assert result == []

    @pytest.mark.asyncio
    async def test_nonexistent_role_code_returns_empty(self, perm_service):
        result = await perm_service.get_permissions_by_role_code("superadmin")
        assert result == []


class TestGetPermissionsByLegacyRole:
    @pytest.mark.asyncio
    async def test_teacher_returns_permissions(self, perm_service):
        result = await perm_service.get_permissions_by_legacy_role(UserRole.TEACHER)
        assert isinstance(result, list)
        assert len(result) > 0
        assert "course:read" in result

    @pytest.mark.asyncio
    async def test_admin_returns_empty(self, perm_service):
        result = await perm_service.get_permissions_by_legacy_role(UserRole.ADMIN)
        assert result == []


class TestGetPermissionsByUserId:
    @pytest.mark.asyncio
    async def test_existing_teacher_returns_permissions(
        self, perm_service, teacher_user
    ):
        result = await perm_service.get_permissions_by_user_id(teacher_user.id)
        assert isinstance(result, list)
        assert len(result) > 0
        assert "course:read" in result

    @pytest.mark.asyncio
    async def test_existing_admin_returns_empty(
        self, perm_service, admin_user_perm
    ):
        result = await perm_service.get_permissions_by_user_id(admin_user_perm.id)
        assert result == []

    @pytest.mark.asyncio
    async def test_nonexistent_user_returns_empty(self, perm_service):
        result = await perm_service.get_permissions_by_user_id("nonexistent-id")
        assert result == []


class TestHasPermission:
    @pytest.mark.asyncio
    async def test_user_with_permission(self, perm_service, teacher_user):
        result = await perm_service.has_permission(teacher_user.id, "course:read")
        assert result is True

    @pytest.mark.asyncio
    async def test_user_without_permission(self, perm_service, teacher_user):
        result = await perm_service.has_permission(
            teacher_user.id, "nonexistent:permission"
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_nonexistent_user_returns_false(self, perm_service):
        result = await perm_service.has_permission(
            "nonexistent-id", "course:read"
        )
        assert result is False


class TestHasAnyPermission:
    @pytest.mark.asyncio
    async def test_user_has_one_of_permissions(self, perm_service, teacher_user):
        result = await perm_service.has_any_permission(
            teacher_user.id,
            ["nonexistent:perm", "course:read"],
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_user_has_none_of_permissions(self, perm_service, teacher_user):
        result = await perm_service.has_any_permission(
            teacher_user.id,
            ["nonexistent1:a", "nonexistent2:b"],
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_empty_permission_list(self, perm_service, teacher_user):
        result = await perm_service.has_any_permission(teacher_user.id, [])
        assert result is False


class TestHasAllPermissions:
    @pytest.mark.asyncio
    async def test_user_has_all_permissions(self, perm_service, teacher_user):
        result = await perm_service.has_all_permissions(
            teacher_user.id,
            ["course:read", "course:create"],
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_user_missing_some_permissions(self, perm_service, teacher_user):
        result = await perm_service.has_all_permissions(
            teacher_user.id,
            ["course:read", "nonexistent:perm"],
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_empty_permission_list_returns_true(
        self, perm_service, teacher_user
    ):
        result = await perm_service.has_all_permissions(teacher_user.id, [])
        assert result is True


class TestInitializeDefaultPermissions:
    @pytest.mark.asyncio
    async def test_creates_permissions_and_roles(self, perm_service, db_session):
        await perm_service.initialize_default_permissions()

        from sqlalchemy import select

        perm_result = await db_session.execute(select(Permission))
        permissions = perm_result.scalars().all()
        assert len(permissions) == len(DEFAULT_TEACHER_PERMISSIONS)

        role_result = await db_session.execute(
            select(Role).where(Role.code == "teacher")
        )
        role = role_result.scalar_one_or_none()
        assert role is not None
        assert role.name == "教师"

        rp_result = await db_session.execute(
            select(RolePermission).where(RolePermission.role_id == role.id)
        )
        role_perms = rp_result.scalars().all()
        assert len(role_perms) == len(DEFAULT_TEACHER_PERMISSIONS)

    @pytest.mark.asyncio
    async def test_idempotent(self, perm_service, db_session):
        await perm_service.initialize_default_permissions()
        await perm_service.initialize_default_permissions()

        from sqlalchemy import select

        perm_result = await db_session.execute(select(Permission))
        permissions = perm_result.scalars().all()
        perm_codes = {p.code for p in permissions}
        assert len(perm_codes) == len(DEFAULT_TEACHER_PERMISSIONS)

    @pytest.mark.asyncio
    async def test_after_init_role_code_returns_db_permissions(
        self, perm_service, db_session
    ):
        await perm_service.initialize_default_permissions()
        result = await perm_service.get_permissions_by_role_code("teacher")
        assert set(result) == set(DEFAULT_TEACHER_PERMISSIONS)

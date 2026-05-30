import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.core.permissions import (
    PermissionChecker,
    AnyPermissionChecker,
    require_permissions,
    require_any_permission,
    check_permission,
    check_any_permission,
)


class TestPermissionCheckerIntegration:
    @pytest.mark.asyncio
    async def test_permission_checker_raises_when_missing_permission(self, db_session, test_user):
        checker = PermissionChecker("admin:manage")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user_id=test_user.id, db=db_session)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_permission_checker_succeeds_with_permission(self, db_session, test_user):
        from app.services.permission import PermissionService

        perm_service = PermissionService(db_session)
        await perm_service.initialize_default_permissions()

        checker = PermissionChecker("course:create")
        result = await checker(user_id=test_user.id, db=db_session)
        assert result is True

    @pytest.mark.asyncio
    async def test_permission_checker_with_multiple_permissions(self, db_session, test_user):
        from app.services.permission import PermissionService

        perm_service = PermissionService(db_session)
        await perm_service.initialize_default_permissions()

        checker = PermissionChecker("course:create", "course:read")
        result = await checker(user_id=test_user.id, db=db_session)
        assert result is True

    @pytest.mark.asyncio
    async def test_permission_checker_fails_if_any_missing(self, db_session, test_user):
        checker = PermissionChecker("course:create", "nonexistent:permission")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user_id=test_user.id, db=db_session)
        assert exc_info.value.status_code == 403


class TestAnyPermissionCheckerIntegration:
    @pytest.mark.asyncio
    async def test_any_permission_checker_succeeds_with_one(self, db_session, test_user):
        from app.services.permission import PermissionService

        perm_service = PermissionService(db_session)
        await perm_service.initialize_default_permissions()

        checker = AnyPermissionChecker("course:create", "nonexistent:permission")
        result = await checker(user_id=test_user.id, db=db_session)
        assert result is True

    @pytest.mark.asyncio
    async def test_any_permission_checker_fails_with_none(self, db_session, test_user):
        checker = AnyPermissionChecker("nonexistent:perm1", "nonexistent:perm2")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user_id=test_user.id, db=db_session)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_any_permission_checker_succeeds_with_all(self, db_session, test_user):
        from app.services.permission import PermissionService

        perm_service = PermissionService(db_session)
        await perm_service.initialize_default_permissions()

        checker = AnyPermissionChecker("course:create", "course:read")
        result = await checker(user_id=test_user.id, db=db_session)
        assert result is True


class TestRequirePermissionsHelpers:
    def test_require_permissions_returns_checker(self):
        checker = require_permissions("course:create")
        assert isinstance(checker, PermissionChecker)

    def test_require_any_permission_returns_checker(self):
        checker = require_any_permission("course:create", "course:read")
        assert isinstance(checker, AnyPermissionChecker)


class TestCheckPermissionHelpers:
    @pytest.mark.asyncio
    async def test_check_permission_with_real_db(self, db_session, test_user):
        from app.services.permission import PermissionService

        perm_service = PermissionService(db_session)
        await perm_service.initialize_default_permissions()

        result = await check_permission(test_user.id, db_session, "course:create")
        assert result is True

    @pytest.mark.asyncio
    async def test_check_permission_fails_for_nonexistent(self, db_session, test_user):
        result = await check_permission(test_user.id, db_session, "nonexistent:permission")
        assert result is False

    @pytest.mark.asyncio
    async def test_check_any_permission_with_real_db(self, db_session, test_user):
        from app.services.permission import PermissionService

        perm_service = PermissionService(db_session)
        await perm_service.initialize_default_permissions()

        result = await check_any_permission(
            test_user.id, db_session, ["course:create", "nonexistent:perm"]
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_check_any_permission_fails_for_none(self, db_session, test_user):
        result = await check_any_permission(
            test_user.id, db_session, ["nonexistent:perm1", "nonexistent:perm2"]
        )
        assert result is False

from fastapi import status

from app.core.exceptions import (
    AlreadyExistsException,
    AuthenticationException,
    AuthorizationException,
    BadRequestException,
    BusinessException,
    ConflictException,
    DatabaseException,
    ErrorCode,
    InternalException,
    NotFoundException,
    OptimisticLockException,
    RateLimitException,
    ServiceUnavailableException,
    ValidationException,
    get_error_message,
)


class TestErrorCode:
    def test_error_code_is_string_enum(self):
        assert isinstance(ErrorCode.UNKNOWN_ERROR, str)

    def test_error_code_values_are_numeric_strings(self):
        for code in ErrorCode:
            assert code.value.isdigit()

    def test_known_error_codes_exist(self):
        assert ErrorCode.UNKNOWN_ERROR == "1000"
        assert ErrorCode.INVALID_PARAMETER == "1001"
        assert ErrorCode.RESOURCE_NOT_FOUND == "1003"
        assert ErrorCode.RESOURCE_ALREADY_EXISTS == "1004"
        assert ErrorCode.VERSION_CONFLICT == "1006"
        assert ErrorCode.UNAUTHORIZED == "2000"
        assert ErrorCode.TOKEN_EXPIRED == "2001"
        assert ErrorCode.TOKEN_INVALID == "2002"
        assert ErrorCode.TOKEN_REVOKED == "2003"
        assert ErrorCode.FORBIDDEN == "2004"
        assert ErrorCode.PERMISSION_DENIED == "2005"
        assert ErrorCode.ACCOUNT_LOCKED == "2006"
        assert ErrorCode.ACCOUNT_DISABLED == "2007"
        assert ErrorCode.USER_NOT_FOUND == "3000"
        assert ErrorCode.USER_ALREADY_EXISTS == "3001"
        assert ErrorCode.INVALID_CREDENTIALS == "3002"
        assert ErrorCode.PASSWORD_TOO_WEAK == "3003"
        assert ErrorCode.PASSWORD_INCORRECT == "3004"
        assert ErrorCode.DATA_VALIDATION_ERROR == "4000"
        assert ErrorCode.DATA_INTEGRITY_ERROR == "4001"
        assert ErrorCode.DATABASE_ERROR == "4002"
        assert ErrorCode.FILE_NOT_FOUND == "5000"
        assert ErrorCode.FILE_TOO_LARGE == "5001"
        assert ErrorCode.INVALID_FILE_TYPE == "5002"
        assert ErrorCode.FILE_UPLOAD_ERROR == "5003"
        assert ErrorCode.RATE_LIMIT_EXCEEDED == "6000"
        assert ErrorCode.INTERNAL_ERROR == "7001"
        assert ErrorCode.SERVICE_UNAVAILABLE == "7002"


class TestBusinessException:
    def test_base_class_attributes(self):
        exc = BusinessException(
            error_code=ErrorCode.UNKNOWN_ERROR,
            message="test error",
            status_code=400,
        )
        assert exc.error_code == ErrorCode.UNKNOWN_ERROR
        assert exc.detail == "test error"
        assert exc.status_code == 400
        assert exc.details == {}

    def test_base_class_with_details(self):
        exc = BusinessException(
            error_code=ErrorCode.UNKNOWN_ERROR,
            message="test",
            status_code=400,
            details={"field": "value"},
        )
        assert exc.details == {"field": "value"}

    def test_is_http_exception(self):
        exc = BusinessException(
            error_code=ErrorCode.UNKNOWN_ERROR,
            message="test",
        )
        assert hasattr(exc, "status_code")
        assert hasattr(exc, "detail")


class TestNotFoundException:
    def test_default_message(self):
        exc = NotFoundException()
        assert exc.detail == "资源不存在"
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert exc.error_code == ErrorCode.RESOURCE_NOT_FOUND

    def test_custom_resource_name(self):
        exc = NotFoundException(resource_name="用户")
        assert exc.detail == "用户不存在"

    def test_with_resource_id(self):
        exc = NotFoundException(resource_name="用户", resource_id="123")
        assert exc.detail == "用户不存在: 123"


class TestAlreadyExistsException:
    def test_default_message(self):
        exc = AlreadyExistsException()
        assert exc.detail == "资源已存在"
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert exc.error_code == ErrorCode.RESOURCE_ALREADY_EXISTS

    def test_custom_resource_name(self):
        exc = AlreadyExistsException(resource_name="用户")
        assert exc.detail == "用户已存在"

    def test_with_field(self):
        exc = AlreadyExistsException(field="邮箱")
        assert exc.detail == "该邮箱已被使用"


class TestValidationException:
    def test_default_message(self):
        exc = ValidationException()
        assert exc.detail == "数据验证失败"
        assert exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert exc.error_code == ErrorCode.DATA_VALIDATION_ERROR

    def test_custom_message(self):
        exc = ValidationException(message="字段不能为空")
        assert exc.detail == "字段不能为空"

    def test_with_details(self):
        exc = ValidationException(details={"field": "email", "reason": "invalid"})
        assert exc.details == {"field": "email", "reason": "invalid"}


class TestAuthenticationException:
    def test_default_message(self):
        exc = AuthenticationException()
        assert exc.detail == "认证失败"
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == ErrorCode.UNAUTHORIZED

    def test_custom_message(self):
        exc = AuthenticationException(message="Token已过期")
        assert exc.detail == "Token已过期"

    def test_custom_error_code(self):
        exc = AuthenticationException(error_code=ErrorCode.TOKEN_EXPIRED)
        assert exc.error_code == ErrorCode.TOKEN_EXPIRED


class TestAuthorizationException:
    def test_default_message(self):
        exc = AuthorizationException()
        assert exc.detail == "权限不足"
        assert exc.status_code == status.HTTP_403_FORBIDDEN
        assert exc.error_code == ErrorCode.PERMISSION_DENIED

    def test_custom_message(self):
        exc = AuthorizationException(message="无权访问此资源")
        assert exc.detail == "无权访问此资源"


class TestRateLimitException:
    def test_default_retry_after(self):
        exc = RateLimitException()
        assert "60" in exc.detail
        assert exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert exc.error_code == ErrorCode.RATE_LIMIT_EXCEEDED
        assert exc.details["retry_after"] == 60

    def test_custom_retry_after(self):
        exc = RateLimitException(retry_after=120)
        assert "120" in exc.detail
        assert exc.details["retry_after"] == 120


class TestOptimisticLockException:
    def test_default_message(self):
        exc = OptimisticLockException()
        assert exc.detail == "数据已被其他用户修改，请刷新后重试"
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert exc.error_code == ErrorCode.VERSION_CONFLICT

    def test_with_versions(self):
        exc = OptimisticLockException(expected_version=3, actual_version=5)
        assert exc.details["expected_version"] == 3
        assert exc.details["actual_version"] == 5

    def test_without_versions(self):
        exc = OptimisticLockException()
        assert exc.details == {}


class TestDatabaseException:
    def test_default_message(self):
        exc = DatabaseException()
        assert exc.detail == "数据库操作失败"
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.error_code == ErrorCode.DATABASE_ERROR

    def test_custom_message(self):
        exc = DatabaseException(message="连接超时")
        assert exc.detail == "连接超时"


class TestBadRequestException:
    def test_default_message(self):
        exc = BadRequestException()
        assert exc.detail == "请求参数错误"
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == ErrorCode.INVALID_PARAMETER

    def test_custom_message(self):
        exc = BadRequestException(message="ID格式不正确")
        assert exc.detail == "ID格式不正确"

    def test_with_details(self):
        exc = BadRequestException(details={"param": "id"})
        assert exc.details == {"param": "id"}


class TestConflictException:
    def test_default_reason(self):
        exc = ConflictException(resource_name="用户")
        assert "用户" in exc.detail
        assert "已存在或发生冲突" in exc.detail
        assert exc.status_code == status.HTTP_409_CONFLICT

    def test_custom_reason(self):
        exc = ConflictException(resource_name="订单", reason="状态不允许此操作")
        assert "订单" in exc.detail
        assert "状态不允许此操作" in exc.detail


class TestInternalException:
    def test_default_message(self):
        exc = InternalException()
        assert exc.detail == "服务器内部错误"
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.error_code == ErrorCode.INTERNAL_ERROR

    def test_custom_message(self):
        exc = InternalException(message="缓存服务异常")
        assert exc.detail == "缓存服务异常"

    def test_with_details(self):
        exc = InternalException(details={"trace_id": "abc123"})
        assert exc.details == {"trace_id": "abc123"}


class TestServiceUnavailableException:
    def test_default_values(self):
        exc = ServiceUnavailableException()
        assert "服务" in exc.detail
        assert "30" in exc.detail
        assert exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert exc.error_code == ErrorCode.SERVICE_UNAVAILABLE
        assert exc.details["retry_after"] == 30

    def test_custom_service_name(self):
        exc = ServiceUnavailableException(service_name="Redis")
        assert "Redis" in exc.detail

    def test_custom_retry_after(self):
        exc = ServiceUnavailableException(retry_after=60)
        assert "60" in exc.detail
        assert exc.details["retry_after"] == 60


class TestGetErrorMessage:
    def test_known_error_code(self):
        msg = get_error_message(ErrorCode.UNKNOWN_ERROR)
        assert msg == "未知错误"

    def test_resource_not_found(self):
        msg = get_error_message(ErrorCode.RESOURCE_NOT_FOUND)
        assert msg == "资源不存在"

    def test_unauthorized(self):
        msg = get_error_message(ErrorCode.UNAUTHORIZED)
        assert msg == "未授权"

    def test_rate_limit_exceeded(self):
        msg = get_error_message(ErrorCode.RATE_LIMIT_EXCEEDED)
        assert msg == "请求过于频繁"

    def test_internal_error(self):
        msg = get_error_message(ErrorCode.INTERNAL_ERROR)
        assert msg == "服务器内部错误"

    def test_all_error_codes_have_messages(self):
        for code in ErrorCode:
            msg = get_error_message(code)
            assert msg != "未知错误" or code == ErrorCode.UNKNOWN_ERROR

    def test_returns_string(self):
        msg = get_error_message(ErrorCode.UNKNOWN_ERROR)
        assert isinstance(msg, str)

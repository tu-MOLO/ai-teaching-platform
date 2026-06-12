"""
业务异常模块
定义统一的错误码和异常类
"""
from enum import Enum
from typing import Optional, Any, Dict

from fastapi import HTTPException, status


class ErrorCode(str, Enum):
    """业务错误码枚举"""

    # 通用错误 (1000-1999)
    UNKNOWN_ERROR = "1000"
    INVALID_PARAMETER = "1001"
    MISSING_PARAMETER = "1002"
    RESOURCE_NOT_FOUND = "1003"
    RESOURCE_ALREADY_EXISTS = "1004"
    OPERATION_NOT_ALLOWED = "1005"
    VERSION_CONFLICT = "1006"  # 乐观锁冲突

    # 认证授权错误 (2000-2999)
    UNAUTHORIZED = "2000"
    TOKEN_EXPIRED = "2001"
    TOKEN_INVALID = "2002"
    TOKEN_REVOKED = "2003"  # Token 已被撤销
    FORBIDDEN = "2004"
    PERMISSION_DENIED = "2005"
    ACCOUNT_LOCKED = "2006"
    ACCOUNT_DISABLED = "2007"

    # 用户相关错误 (3000-3999)
    USER_NOT_FOUND = "3000"
    USER_ALREADY_EXISTS = "3001"
    INVALID_CREDENTIALS = "3002"
    PASSWORD_TOO_WEAK = "3003"
    PASSWORD_INCORRECT = "3004"

    # 数据相关错误 (4000-4999)
    DATA_VALIDATION_ERROR = "4000"
    DATA_INTEGRITY_ERROR = "4001"
    DATABASE_ERROR = "4002"

    # 文件相关错误 (5000-5999)
    FILE_NOT_FOUND = "5000"
    FILE_TOO_LARGE = "5001"
    INVALID_FILE_TYPE = "5002"
    FILE_UPLOAD_ERROR = "5003"

    # 限流错误 (6000-6999)
    RATE_LIMIT_EXCEEDED = "6000"

    # 服务器错误 (7000-7999)
    INTERNAL_ERROR = "7001"
    SERVICE_UNAVAILABLE = "7002"


class BusinessException(HTTPException):
    """
    业务异常基类

    Attributes:
        error_code: 业务错误码
        message: 错误消息
        details: 错误详情
        status_code: HTTP 状态码
    """

    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.details = details or {}
        super().__init__(status_code=status_code, detail=message)


class NotFoundException(BusinessException):
    """资源不存在异常"""

    def __init__(self, resource_name: str = "资源", resource_id: Optional[str] = None):
        message = f"{resource_name}不存在"
        if resource_id:
            message = f"{resource_name}不存在: {resource_id}"
        super().__init__(
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            message=message,
            status_code=status.HTTP_404_NOT_FOUND
        )


class AlreadyExistsException(BusinessException):
    """资源已存在异常"""

    def __init__(self, resource_name: str = "资源", field: Optional[str] = None):
        message = f"{resource_name}已存在"
        if field:
            message = f"该{field}已被使用"
        super().__init__(
            error_code=ErrorCode.RESOURCE_ALREADY_EXISTS,
            message=message,
            status_code=status.HTTP_409_CONFLICT
        )


class ValidationException(BusinessException):
    """数据验证异常"""

    def __init__(self, message: str = "数据验证失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=ErrorCode.DATA_VALIDATION_ERROR,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class AuthenticationException(BusinessException):
    """认证异常"""

    def __init__(
        self,
        message: str = "认证失败",
        error_code: ErrorCode = ErrorCode.UNAUTHORIZED
    ):
        super().__init__(
            error_code=error_code,
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthorizationException(BusinessException):
    """授权异常"""

    def __init__(self, message: str = "权限不足"):
        super().__init__(
            error_code=ErrorCode.PERMISSION_DENIED,
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )


class RateLimitException(BusinessException):
    """请求频率限制异常"""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            message=f"请求过于频繁，请 {retry_after} 秒后重试",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"retry_after": retry_after}
        )


class OptimisticLockException(BusinessException):
    """乐观锁冲突异常"""

    def __init__(
        self,
        message: str = "数据已被其他用户修改，请刷新后重试",
        expected_version: Optional[int] = None,
        actual_version: Optional[int] = None
    ):
        details = {}
        if expected_version is not None:
            details["expected_version"] = expected_version
        if actual_version is not None:
            details["actual_version"] = actual_version

        super().__init__(
            error_code=ErrorCode.VERSION_CONFLICT,
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details
        )


class DatabaseException(BusinessException):
    """数据库操作异常"""

    def __init__(self, message: str = "数据库操作失败"):
        super().__init__(
            error_code=ErrorCode.DATABASE_ERROR,
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class BadRequestException(BusinessException):
    """请求参数错误异常 (400)"""

    def __init__(self, message: str = "请求参数错误", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=ErrorCode.INVALID_PARAMETER,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class ConflictException(BusinessException):
    """资源冲突异常 (409) - 通用版本，适用于各种冲突场景"""

    def __init__(self, resource_name: str, reason: str = "已存在或发生冲突"):
        super().__init__(
            error_code=ErrorCode.RESOURCE_ALREADY_EXISTS,
            message=f"{resource_name}{reason}",
            status_code=status.HTTP_409_CONFLICT
        )


class InternalException(BusinessException):
    """服务器内部错误异常 (500)"""

    def __init__(self, message: str = "服务器内部错误", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=ErrorCode.INTERNAL_ERROR,
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class ServiceUnavailableException(BusinessException):
    """服务不可用异常 (503)"""

    def __init__(self, service_name: str = "服务", retry_after: int = 30):
        super().__init__(
            error_code=ErrorCode.SERVICE_UNAVAILABLE,
            message=f"{service_name}暂时不可用，请 {retry_after} 秒后重试",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"retry_after": retry_after}
        )


def get_error_message(error_code: ErrorCode) -> str:
    """
    获取错误码对应的默认错误消息

    Args:
        error_code: 错误码

    Returns:
        错误消息
    """
    messages = {
        ErrorCode.UNKNOWN_ERROR: "未知错误",
        ErrorCode.INVALID_PARAMETER: "参数无效",
        ErrorCode.MISSING_PARAMETER: "缺少必要参数",
        ErrorCode.RESOURCE_NOT_FOUND: "资源不存在",
        ErrorCode.RESOURCE_ALREADY_EXISTS: "资源已存在",
        ErrorCode.OPERATION_NOT_ALLOWED: "操作不允许",
        ErrorCode.VERSION_CONFLICT: "数据版本冲突",
        ErrorCode.UNAUTHORIZED: "未授权",
        ErrorCode.TOKEN_EXPIRED: "令牌已过期",
        ErrorCode.TOKEN_INVALID: "令牌无效",
        ErrorCode.TOKEN_REVOKED: "令牌已被撤销",
        ErrorCode.FORBIDDEN: "禁止访问",
        ErrorCode.PERMISSION_DENIED: "权限不足",
        ErrorCode.ACCOUNT_LOCKED: "账户已被锁定",
        ErrorCode.ACCOUNT_DISABLED: "账户已被禁用",
        ErrorCode.USER_NOT_FOUND: "用户不存在",
        ErrorCode.USER_ALREADY_EXISTS: "用户已存在",
        ErrorCode.INVALID_CREDENTIALS: "用户名或密码错误",
        ErrorCode.PASSWORD_TOO_WEAK: "密码强度不足",
        ErrorCode.PASSWORD_INCORRECT: "密码错误",
        ErrorCode.DATA_VALIDATION_ERROR: "数据验证失败",
        ErrorCode.DATA_INTEGRITY_ERROR: "数据完整性错误",
        ErrorCode.DATABASE_ERROR: "数据库错误",
        ErrorCode.FILE_NOT_FOUND: "文件不存在",
        ErrorCode.FILE_TOO_LARGE: "文件过大",
        ErrorCode.INVALID_FILE_TYPE: "不支持的文件类型",
        ErrorCode.FILE_UPLOAD_ERROR: "文件上传失败",
        ErrorCode.RATE_LIMIT_EXCEEDED: "请求过于频繁",
        ErrorCode.INTERNAL_ERROR: "服务器内部错误",
        ErrorCode.SERVICE_UNAVAILABLE: "服务不可用",
    }
    return messages.get(error_code, "未知错误")

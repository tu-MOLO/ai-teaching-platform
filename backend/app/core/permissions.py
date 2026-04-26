"""
权限检查模块
提供权限相关的依赖注入和装饰器功能
"""
from typing import Callable, List
from functools import wraps

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user_id
from app.services.permission import PermissionService


class PermissionChecker:
    """权限检查器
    
    用于FastAPI依赖注入系统的权限检查类。
    """
    
    def __init__(self, *required_permissions: str):
        """
        初始化权限检查器
        
        Args:
            *required_permissions: 需要的权限代码列表
        """
        self.required_permissions = required_permissions
    
    async def __call__(
        self,
        user_id: str = Depends(get_current_user_id),
        db: AsyncSession = Depends(get_async_session)
    ) -> bool:
        """
        执行权限检查
        
        Args:
            user_id: 当前用户ID
            db: 数据库会话
            
        Returns:
            True 如果用户拥有所有需要的权限
            
        Raises:
            HTTPException: 如果缺少权限则抛出403错误
        """
        permission_service = PermissionService(db)
        
        for perm_code in self.required_permissions:
            has_perm = await permission_service.has_permission(user_id, perm_code)
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"缺少权限: {perm_code}"
                )
        
        return True


class AnyPermissionChecker:
    """任意权限检查器
    
    检查用户是否具有任一指定权限。
    """
    
    def __init__(self, *required_permissions: str):
        """
        初始化权限检查器
        
        Args:
            *required_permissions: 需要的权限代码列表（满足任一即可）
        """
        self.required_permissions = required_permissions
    
    async def __call__(
        self,
        user_id: str = Depends(get_current_user_id),
        db: AsyncSession = Depends(get_async_session)
    ) -> bool:
        """
        执行权限检查
        
        Args:
            user_id: 当前用户ID
            db: 数据库会话
            
        Returns:
            True 如果用户拥有任一需要的权限
            
        Raises:
            HTTPException: 如果缺少所有权限则抛出403错误
        """
        permission_service = PermissionService(db)
        
        has_any = await permission_service.has_any_permission(
            user_id,
            list(self.required_permissions)
        )
        
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"缺少权限，需要以下任一权限: {', '.join(self.required_permissions)}"
            )
        
        return True


def require_permissions(*permission_codes: str):
    """
    创建权限检查依赖
    
    在FastAPI路由中使用此函数来要求特定的权限。
    
    Args:
        *permission_codes: 需要的权限代码
        
    Returns:
        PermissionChecker实例
        
    Usage:
        @router.post("/courses")
        async def create_course(
            ...,
            _: bool = Depends(require_permissions("course:create"))
        ):
            ...
    """
    return PermissionChecker(*permission_codes)


def require_any_permission(*permission_codes: str):
    """
    创建任意权限检查依赖
    
    在FastAPI路由中使用此函数来要求满足任一权限。
    
    Args:
        *permission_codes: 需要的权限代码列表（满足任一即可）
        
    Returns:
        AnyPermissionChecker实例
        
    Usage:
        @router.get("/courses/{course_id}")
        async def get_course(
            ...,
            _: bool = Depends(require_any_permission("course:read", "course:update"))
        ):
            ...
    """
    return AnyPermissionChecker(*permission_codes)


async def check_permission(
    user_id: str,
    db: AsyncSession,
    permission_code: str
) -> bool:
    """
    检查用户是否具有指定权限
    
    用于在业务逻辑中进行权限检查。
    
    Args:
        user_id: 用户ID
        db: 数据库会话
        permission_code: 权限代码
        
    Returns:
        是否具有权限
    """
    permission_service = PermissionService(db)
    return await permission_service.has_permission(user_id, permission_code)


async def check_any_permission(
    user_id: str,
    db: AsyncSession,
    permission_codes: List[str]
) -> bool:
    """
    检查用户是否具有任一指定权限
    
    Args:
        user_id: 用户ID
        db: 数据库会话
        permission_codes: 权限代码列表
        
    Returns:
        是否具有任一权限
    """
    permission_service = PermissionService(db)
    return await permission_service.has_any_permission(user_id, permission_codes)

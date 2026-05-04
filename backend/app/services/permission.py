"""
权限服务模块
提供权限相关的业务逻辑处理
"""
from typing import List
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permission import Permission, Role, RolePermission
from app.models.user import User, UserRole

DEFAULT_TEACHER_PERMISSIONS = [
    "user:read",
    "user:update",
    "course:create",
    "course:read",
    "course:update",
    "course:delete",
    "assignment:create",
    "assignment:read",
    "assignment:update",
    "assignment:delete",
    "quiz:create",
    "quiz:read",
    "quiz:update",
    "quiz:delete",
    "grade:create",
    "grade:read",
    "grade:update",
    "enrollment:read",
    "enrollment:update",
]


class PermissionService:
    """权限服务类
    
    封装权限相关的业务逻辑，包括：
    - 根据角色获取权限列表
    - 权限检查
    - 默认权限初始化
    """
    
    def __init__(self, db: AsyncSession):
        """初始化权限服务
        
        Args:
            db: 异步数据库会话
        """
        self.db = db
    
    async def get_permissions_by_role_code(self, role_code: str) -> List[str]:
        """
        根据角色代码获取权限列表
        
        Args:
            role_code: 角色代码（当前仅支持 teacher）
            
        Returns:
            权限代码列表，如果角色不存在则返回空列表
        """
        # 查询角色
        stmt = select(Role).where(
            and_(
                Role.code == role_code,
                Role.is_active == True
            )
        )
        result = await self.db.execute(stmt)
        role = result.scalar_one_or_none()
        
        if role_code != "teacher":
            return []
        if not role:
            return DEFAULT_TEACHER_PERMISSIONS.copy()
        
        # 查询角色的权限
        stmt = select(Permission.code).join(
            RolePermission,
            Permission.id == RolePermission.permission_id
        ).where(
            and_(
                RolePermission.role_id == role.id,
                Permission.is_active == True
            )
        )
        result = await self.db.execute(stmt)
        permissions = [row[0] for row in result.all()]
        return permissions or DEFAULT_TEACHER_PERMISSIONS.copy()
    
    async def get_permissions_by_legacy_role(self, role: UserRole) -> List[str]:
        """
        根据传统枚举角色获取权限列表（向后兼容）
        
        Args:
            role: 用户角色枚举
            
        Returns:
            权限列表，如果数据库没有配置则返回空列表（调用方应回退到硬编码逻辑）
        """
        if role != UserRole.TEACHER:
            return []

        return await self.get_permissions_by_role_code("teacher")
    
    async def get_permissions_by_user_id(self, user_id: str) -> List[str]:
        """
        根据用户ID获取权限列表
        
        Args:
            user_id: 用户ID
            
        Returns:
            权限代码列表
        """
        # 查询用户
        stmt = select(User).where(
            and_(
                User.id == user_id,
                User.is_deleted == False
            )
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return []
        
        return await self.get_permissions_by_legacy_role(user.role)
    
    async def has_permission(
        self,
        user_id: str,
        permission_code: str
    ) -> bool:
        """
        检查用户是否具有指定权限
        
        Args:
            user_id: 用户ID
            permission_code: 权限代码
            
        Returns:
            是否具有权限
        """
        # 查询用户
        stmt = select(User).where(
            and_(
                User.id == user_id,
                User.is_deleted == False
            )
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        permissions = await self.get_permissions_by_user_id(user_id)
        return permission_code in permissions
    
    async def has_any_permission(
        self,
        user_id: str,
        permission_codes: List[str]
    ) -> bool:
        """
        检查用户是否具有任一指定权限
        
        Args:
            user_id: 用户ID
            permission_codes: 权限代码列表
            
        Returns:
            是否具有任一权限
        """
        for perm_code in permission_codes:
            if await self.has_permission(user_id, perm_code):
                return True
        return False
    
    async def has_all_permissions(
        self,
        user_id: str,
        permission_codes: List[str]
    ) -> bool:
        """
        检查用户是否具有所有指定权限
        
        Args:
            user_id: 用户ID
            permission_codes: 权限代码列表
            
        Returns:
            是否具有所有权限
        """
        for perm_code in permission_codes:
            if not await self.has_permission(user_id, perm_code):
                return False
        return True
    
    async def initialize_default_permissions(self) -> None:
        """
        初始化默认权限和角色
        
        创建系统默认的权限项和角色，并建立关联关系。
        如果已存在则跳过，不会覆盖现有配置。
        """
        # 创建默认权限
        default_permissions = [
            {"code": "user:read", "name": "查看用户", "resource": "user", "action": "read"},
            {"code": "user:update", "name": "更新用户", "resource": "user", "action": "update"},
            {"code": "course:create", "name": "创建课程", "resource": "course", "action": "create"},
            {"code": "course:read", "name": "查看课程", "resource": "course", "action": "read"},
            {"code": "course:update", "name": "更新课程", "resource": "course", "action": "update"},
            {"code": "course:delete", "name": "删除课程", "resource": "course", "action": "delete"},
            {"code": "assignment:create", "name": "创建作业", "resource": "assignment", "action": "create"},
            {"code": "assignment:read", "name": "查看作业", "resource": "assignment", "action": "read"},
            {"code": "assignment:update", "name": "更新作业", "resource": "assignment", "action": "update"},
            {"code": "assignment:delete", "name": "删除作业", "resource": "assignment", "action": "delete"},
            {"code": "quiz:create", "name": "创建测验", "resource": "quiz", "action": "create"},
            {"code": "quiz:read", "name": "查看测验", "resource": "quiz", "action": "read"},
            {"code": "quiz:update", "name": "更新测验", "resource": "quiz", "action": "update"},
            {"code": "quiz:delete", "name": "删除测验", "resource": "quiz", "action": "delete"},
            {"code": "grade:create", "name": "创建成绩", "resource": "grade", "action": "create"},
            {"code": "grade:read", "name": "查看成绩", "resource": "grade", "action": "read"},
            {"code": "grade:update", "name": "更新成绩", "resource": "grade", "action": "update"},
            {"code": "enrollment:read", "name": "查看选课", "resource": "enrollment", "action": "read"},
            {"code": "enrollment:update", "name": "更新选课", "resource": "enrollment", "action": "update"},
        ]
        
        # 创建权限
        created_permissions = {}
        for perm_data in default_permissions:
            existing = await self.db.execute(
                select(Permission).where(Permission.code == perm_data["code"])
            )
            permission = existing.scalar_one_or_none()
            
            if not permission:
                permission = Permission(**perm_data)
                self.db.add(permission)
                await self.db.flush()
            
            created_permissions[perm_data["code"]] = permission
        
        # 创建默认角色
        default_roles = [
            {
                "code": "teacher",
                "name": "教师",
                "description": "教师角色，可以管理课程、作业、测验和成绩",
                "is_system": True,
            }
        ]
        
        for role_data in default_roles:
            existing = await self.db.execute(
                select(Role).where(Role.code == role_data["code"])
            )
            role = existing.scalar_one_or_none()
            
            if not role:
                role = Role(**role_data)
                self.db.add(role)
                await self.db.flush()
            
            await self.db.execute(
                delete(RolePermission).where(RolePermission.role_id == role.id)
            )

            for perm_code in DEFAULT_TEACHER_PERMISSIONS:
                permission = created_permissions.get(perm_code)
                if permission:
                    role_permission = RolePermission(
                        role_id=role.id,
                        permission_id=permission.id
                    )
                    self.db.add(role_permission)
        
        await self.db.commit()
    
    async def get_all_permissions(self) -> List[Permission]:
        """
        获取所有权限
        
        Returns:
            权限列表
        """
        stmt = select(Permission).where(Permission.is_active == True)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    

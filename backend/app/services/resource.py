"""
资源服务模块
提供资源的CRUD操作、文件上传下载、搜索筛选等功能
"""
import mimetypes
from pathlib import Path
from typing import List, Optional, Tuple, BinaryIO
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthorizationException
from app.models.resource import Resource
from app.models.tag import Tag
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceSearchParams
from app.services.storage import get_storage, generate_object_name, MinIOStorage
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ResourceService:
    """
    资源服务类
    """
    
    @staticmethod
    async def create_resource(
        db: AsyncSession,
        resource_data: ResourceCreate,
        file_data: BinaryIO,
        file_name: str,
        user_id: str
    ) -> Resource:
        """
        创建资源
        
        Args:
            db: 数据库会话
            resource_data: 资源创建数据
            file_data: 文件数据
            file_name: 文件名
            user_id: 用户ID
            
        Returns:
            创建的资源对象
        """
        try:
            # 生成文件存储路径
            object_name = generate_object_name(user_id, file_name, folder="resources")
            
            # 检测文件类型
            content_type, _ = mimetypes.guess_type(file_name)
            content_type = content_type or "application/octet-stream"
            
            # 获取文件大小
            file_data.seek(0, 2)
            file_size = file_data.tell()
            file_data.seek(0)
            
            await get_storage().upload_file_async(
                file_data=file_data,
                object_name=object_name,
                content_type=content_type
            )
            
            # 创建资源对象
            db_resource = Resource(
                name=resource_data.name,
                description=resource_data.description,
                file_path=object_name,
                file_name=file_name,
                file_size=file_size,
                file_type=content_type,
                user_id=user_id
            )
            
            # 添加标签
            if resource_data.tag_ids:
                tags = await ResourceService._get_tags_by_ids(db, resource_data.tag_ids)
                db_resource.tags = tags
            
            db.add(db_resource)
            await db.commit()
            await db.refresh(db_resource)
            logger.info(f"Created resource: {db_resource.name}")
            return db_resource
        except Exception as e:
            logger.error(f"Failed to create resource: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def get_resources(
        db: AsyncSession,
        params: ResourceSearchParams
    ) -> Tuple[List[Resource], int]:
        """
        获取资源列表（支持搜索和筛选）
        
        Args:
            db: 数据库会话
            params: 搜索参数
            
        Returns:
            资源列表和总记录数
        """
        try:
            query = select(Resource).where(Resource.is_deleted == False)
            query = await ResourceService._build_resource_filters(query, params)

            count_query = select(func.count()).select_from(Resource).where(Resource.is_deleted == False)
            count_query = await ResourceService._build_resource_filters(count_query, params)

            if params.tag_ids:
                count_result = await db.execute(select(func.count()).select_from(count_query.subquery()))
                total = count_result.scalar() or 0
            else:
                count_result = await db.execute(count_query)
                total = count_result.scalar() or 0

            query = query.offset(params.offset).limit(params.page_size)
            query = query.options(selectinload(Resource.tags))

            result = await db.execute(query)
            resources = result.scalars().all()

            return resources, total
        except Exception as e:
            logger.error(f"Failed to get resources: {e}")
            raise

    @staticmethod
    async def _build_resource_filters(query, params: ResourceSearchParams):
        """
        构建资源查询的筛选条件

        Args:
            query: 基础查询对象
            params: 搜索参数

        Returns:
            应用了筛选条件的查询对象
        """
        if params.keyword:
            safe_keyword = params.keyword.replace("%", "\\%").replace("_", "\\_")
            keyword_filter = or_(
                Resource.name.ilike(f"%{safe_keyword}%", escape="\\"),
                Resource.description.ilike(f"%{safe_keyword}%", escape="\\")
            )
            query = query.where(keyword_filter)

        if params.tag_ids:
            from app.models.resource import resource_tag_association
            query = query.join(
                resource_tag_association
            ).where(
                resource_tag_association.c.tag_id.in_(params.tag_ids)
            ).group_by(Resource.id)

        if params.file_type:
            query = query.where(Resource.file_type.ilike(f"%{params.file_type}%"))

        if params.user_id:
            query = query.where(Resource.user_id == params.user_id)

        return query
    
    @staticmethod
    async def get_resource_by_id(
        db: AsyncSession,
        resource_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Resource]:
        """
        根据ID获取资源
        
        Args:
            db: 数据库会话
            resource_id: 资源ID
            
        Returns:
            资源对象，如果不存在则返回None
        """
        try:
            query = select(Resource).where(
                Resource.id == resource_id,
                Resource.is_deleted == False
            )
            if user_id:
                query = query.where(Resource.user_id == user_id)
            query = query.options(selectinload(Resource.tags))
            result = await db.execute(query)
            resource = result.scalar_one_or_none()
            return resource
        except Exception as e:
            logger.error(f"Failed to get resource by id: {e}")
            raise
    
    @staticmethod
    async def update_resource(
        db: AsyncSession,
        resource_id: str,
        resource_data: ResourceUpdate,
        user_id: str
    ) -> Optional[Resource]:
        try:
            db_resource = await ResourceService.get_resource_by_id(db, resource_id)
            if not db_resource:
                return None
            
            if db_resource.user_id != user_id:
                raise AuthorizationException("无权操作此资源")
            
            # 更新基本信息
            update_data = resource_data.model_dump(exclude_unset=True)
            
            # 处理标签更新
            if "tag_ids" in update_data:
                tag_ids = update_data.pop("tag_ids")
                tags = await ResourceService._get_tags_by_ids(db, tag_ids)
                db_resource.tags = tags
            
            # 更新其他字段
            for field, value in update_data.items():
                setattr(db_resource, field, value)
            
            await db.commit()
            await db.refresh(db_resource)
            logger.info(f"Updated resource: {db_resource.name}")
            return db_resource
        except Exception as e:
            logger.error(f"Failed to update resource: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def delete_resource(db: AsyncSession, resource_id: str, user_id: str) -> bool:
        try:
            db_resource = await ResourceService.get_resource_by_id(db, resource_id)
            if not db_resource:
                return False
            
            if db_resource.user_id != user_id:
                raise AuthorizationException("无权操作此资源")
            
            # 删除MinIO中的文件
            try:
                await get_storage().delete_file_async(db_resource.file_path)
            except Exception as e:
                logger.warning(f"Failed to delete file from storage: {e}")
            
            # 软删除资源
            db_resource.soft_delete()
            await db.commit()
            logger.info(f"Deleted resource: {db_resource.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete resource: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def get_resource_file_url(resource: Resource, expires: timedelta = timedelta(hours=1)) -> str:
        """
        获取资源文件的预签名URL或API路径

        Args:
            resource: 资源对象
            expires: URL有效期

        Returns:
            预签名URL（MinIO）或API路径（LocalFileStorage）
        """
        storage = get_storage()
        if isinstance(storage, MinIOStorage):
            return storage.get_file_url(resource.file_path, expires)
        return f"{settings.API_V1_STR}/resources/{resource.id}/file"
    
    @staticmethod
    async def download_resource(db: AsyncSession, resource_id: str, file_path: str) -> str:
        """
        下载资源文件
        
        Args:
            db: 数据库会话
            resource_id: 资源ID
            file_path: 本地保存路径
            
        Returns:
            保存的文件路径
        """
        try:
            resource = await ResourceService.get_resource_by_id(db, resource_id)
            if not resource:
                raise ValueError("Resource not found")
            
            await get_storage().download_file_async(resource.file_path, file_path)
            logger.info(f"Downloaded resource: {resource.name} to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to download resource: {e}")
            raise

    @staticmethod
    async def get_resource_file_content(
        db: AsyncSession,
        resource_id: str,
        user_id: str
    ) -> tuple[Resource, bytes, str]:
        """
        读取当前用户拥有的资源文件内容

        Args:
            db: 数据库会话
            resource_id: 资源ID
            user_id: 当前用户ID

        Returns:
            资源对象、文件内容、建议下载文件名
        """
        if not user_id:
            raise AuthorizationException("需要用户认证")

        resource = await ResourceService.get_resource_by_id(db, resource_id, user_id=user_id)
        if not resource:
            raise ValueError("Resource not found")

        file_bytes = await get_storage().download_file_async(resource.file_path)
        filename = resource.file_name or Path(resource.file_path).name
        return resource, file_bytes, filename
    
    @staticmethod
    async def _get_tags_by_ids(db: AsyncSession, tag_ids: List[str]) -> List[Tag]:
        """
        根据ID列表获取标签
        
        Args:
            db: 数据库会话
            tag_ids: 标签ID列表
            
        Returns:
            标签列表
        """
        from app.services.tag import TagService
        return await TagService.get_tags_by_ids(db, tag_ids)


# 全局资源服务实例
resource_service = ResourceService()


def get_resource_service() -> ResourceService:
    """
    获取资源服务实例
    
    Returns:
        ResourceService实例
    """
    return resource_service

"""
资源服务模块
提供资源的CRUD操作、文件上传下载、搜索筛选等功能
"""
import mimetypes
from typing import List, Optional, Tuple, BinaryIO
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.models.resource import Resource
from app.models.tag import Tag
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceSearchParams
from app.services.storage import get_storage, generate_object_name
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
            
            # 上传文件到MinIO
            get_storage().upload_file(
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
            # 构建查询
            query = select(Resource).where(Resource.is_deleted == False)
            
            # 应用筛选条件
            if params.keyword:
                keyword_filter = or_(
                    Resource.name.ilike(f"%{params.keyword}%"),
                    Resource.description.ilike(f"%{params.keyword}%")
                )
                query = query.where(keyword_filter)
            
            if params.tag_ids:
                # 标签筛选
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
            
            # 计算总记录数
            from sqlalchemy import func
            count_query = select(func.count()).select_from(Resource).where(Resource.is_deleted == False)
            
            # 重新应用筛选条件到count_query
            if params.keyword:
                keyword_filter = or_(
                    Resource.name.ilike(f"%{params.keyword}%"),
                    Resource.description.ilike(f"%{params.keyword}%")
                )
                count_query = count_query.where(keyword_filter)
            
            if params.tag_ids:
                from app.models.resource import resource_tag_association
                count_query = count_query.join(
                    resource_tag_association
                ).where(
                    resource_tag_association.c.tag_id.in_(params.tag_ids)
                )
            
            if params.file_type:
                count_query = count_query.where(Resource.file_type.ilike(f"%{params.file_type}%"))
            
            if params.user_id:
                count_query = count_query.where(Resource.user_id == params.user_id)
            
            count_result = await db.execute(count_query)
            total = count_result.scalar() or 0
            
            # 应用分页
            query = query.offset(params.offset).limit(params.page_size)
            
            # 预加载标签
            query = query.options(selectinload(Resource.tags))
            
            # 执行查询
            result = await db.execute(query)
            resources = result.scalars().all()
            
            return resources, total
        except Exception as e:
            logger.error(f"Failed to get resources: {e}")
            raise
    
    @staticmethod
    async def get_resource_by_id(db: AsyncSession, resource_id: str) -> Optional[Resource]:
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
            ).options(selectinload(Resource.tags))
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
        resource_data: ResourceUpdate
    ) -> Optional[Resource]:
        """
        更新资源
        
        Args:
            db: 数据库会话
            resource_id: 资源ID
            resource_data: 资源更新数据
            
        Returns:
            更新后的资源对象，如果不存在则返回None
        """
        try:
            db_resource = await ResourceService.get_resource_by_id(db, resource_id)
            if not db_resource:
                return None
            
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
    async def delete_resource(db: AsyncSession, resource_id: str) -> bool:
        """
        删除资源（软删除）
        
        Args:
            db: 数据库会话
            resource_id: 资源ID
            
        Returns:
            是否删除成功
        """
        try:
            db_resource = await ResourceService.get_resource_by_id(db, resource_id)
            if not db_resource:
                return False
            
            # 删除MinIO中的文件
            try:
                get_storage().delete_file(db_resource.file_path)
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
        获取资源文件的预签名URL
        
        Args:
            resource: 资源对象
            expires: URL有效期
            
        Returns:
            预签名URL
        """
        try:
            url = get_storage().get_file_url(resource.file_path, expires=expires)
            return url
        except Exception as e:
            logger.error(f"Failed to get resource file url: {e}")
            raise
    
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
            
            get_storage().download_file(resource.file_path, file_path)
            logger.info(f"Downloaded resource: {resource.name} to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to download resource: {e}")
            raise
    
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

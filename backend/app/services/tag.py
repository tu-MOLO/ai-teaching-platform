"""
标签服务模块
提供标签的CRUD操作
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate
from app.core.logging import get_logger

logger = get_logger(__name__)


class TagService:
    """
    标签服务类
    """
    
    @staticmethod
    async def create_tag(db: AsyncSession, tag_data: TagCreate) -> Tag:
        """
        创建标签
        
        Args:
            db: 数据库会话
            tag_data: 标签创建数据
            
        Returns:
            创建的标签对象
        """
        try:
            db_tag = Tag(**tag_data.model_dump())
            db.add(db_tag)
            await db.commit()
            await db.refresh(db_tag)
            logger.info(f"Created tag: {db_tag.name}")
            return db_tag
        except Exception as e:
            logger.error(f"Failed to create tag: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def get_tags(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Tag]:
        """
        获取标签列表
        
        Args:
            db: 数据库会话
            skip: 跳过的记录数
            limit: 返回的最大记录数
            
        Returns:
            标签列表
        """
        try:
            query = select(Tag).where(Tag.is_deleted == False).offset(skip).limit(limit)
            result = await db.execute(query)
            tags = result.scalars().all()
            return tags
        except Exception as e:
            logger.error(f"Failed to get tags: {e}")
            raise

    @staticmethod
    async def count_tags(db: AsyncSession) -> int:
        """统计未删除标签总数"""
        try:
            query = select(func.count(Tag.id)).where(Tag.is_deleted == False)
            result = await db.execute(query)
            return result.scalar() or 0
        except Exception as e:
            logger.error(f"Failed to count tags: {e}")
            raise
    
    @staticmethod
    async def get_tag_by_id(db: AsyncSession, tag_id: str) -> Optional[Tag]:
        """
        根据ID获取标签
        
        Args:
            db: 数据库会话
            tag_id: 标签ID
            
        Returns:
            标签对象，如果不存在则返回None
        """
        try:
            query = select(Tag).where(Tag.id == tag_id, Tag.is_deleted == False)
            result = await db.execute(query)
            tag = result.scalar_one_or_none()
            return tag
        except Exception as e:
            logger.error(f"Failed to get tag by id: {e}")
            raise
    
    @staticmethod
    async def get_tag_by_name(db: AsyncSession, name: str) -> Optional[Tag]:
        """
        根据名称获取标签
        
        Args:
            db: 数据库会话
            name: 标签名称
            
        Returns:
            标签对象，如果不存在则返回None
        """
        try:
            query = select(Tag).where(Tag.name == name, Tag.is_deleted == False)
            result = await db.execute(query)
            tag = result.scalar_one_or_none()
            return tag
        except Exception as e:
            logger.error(f"Failed to get tag by name: {e}")
            raise
    
    @staticmethod
    async def update_tag(db: AsyncSession, tag_id: str, tag_data: TagUpdate) -> Optional[Tag]:
        """
        更新标签
        
        Args:
            db: 数据库会话
            tag_id: 标签ID
            tag_data: 标签更新数据
            
        Returns:
            更新后的标签对象，如果不存在则返回None
        """
        try:
            db_tag = await TagService.get_tag_by_id(db, tag_id)
            if not db_tag:
                return None
            
            update_data = tag_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_tag, field, value)
            
            await db.commit()
            await db.refresh(db_tag)
            logger.info(f"Updated tag: {db_tag.name}")
            return db_tag
        except Exception as e:
            logger.error(f"Failed to update tag: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def delete_tag(db: AsyncSession, tag_id: str) -> bool:
        """
        删除标签（软删除）
        
        Args:
            db: 数据库会话
            tag_id: 标签ID
            
        Returns:
            是否删除成功
        """
        try:
            db_tag = await TagService.get_tag_by_id(db, tag_id)
            if not db_tag:
                return False
            
            db_tag.soft_delete()
            await db.commit()
            logger.info(f"Deleted tag: {db_tag.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete tag: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def get_tags_by_ids(db: AsyncSession, tag_ids: List[str]) -> List[Tag]:
        """
        根据ID列表获取标签
        
        Args:
            db: 数据库会话
            tag_ids: 标签ID列表
            
        Returns:
            标签列表
        """
        try:
            query = select(Tag).where(Tag.id.in_(tag_ids), Tag.is_deleted == False)
            result = await db.execute(query)
            tags = result.scalars().all()
            return tags
        except Exception as e:
            logger.error(f"Failed to get tags by ids: {e}")
            raise


# 全局标签服务实例
tag_service = TagService()


def get_tag_service() -> TagService:
    """
    获取标签服务实例
    
    Returns:
        TagService实例
    """
    return tag_service

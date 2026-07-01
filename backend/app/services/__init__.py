"""
服务模块包
"""

from app.services.portfolios import PortfolioService
from app.services.resources import ResourceService, get_resource_service
from app.services.storage import MinIOStorage, generate_object_name, get_storage, is_allowed_file
from app.services.students import StudentService
from app.services.tags import TagService, get_tag_service

__all__ = [
    "MinIOStorage",
    "get_storage",
    "generate_object_name",
    "is_allowed_file",
    "TagService",
    "get_tag_service",
    "ResourceService",
    "get_resource_service",
    "StudentService",
    "PortfolioService",
]

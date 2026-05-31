"""
服务模块包
"""
from app.services.storage import (
    MinIOStorage,
    get_storage,
    generate_object_name,
    is_allowed_file
)
from app.services.tag import TagService, get_tag_service
from app.services.resource import ResourceService, get_resource_service
from app.services.student import StudentService
from app.services.portfolio import PortfolioService

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
    "PortfolioService"
]

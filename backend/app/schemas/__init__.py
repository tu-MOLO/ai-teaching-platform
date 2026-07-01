"""
Pydantic Schemas包
"""

from app.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse, TokenData
from app.schemas.base import (
    BaseSchema,
    DataResponse,
    ErrorResponse,
    ListResponse,
    MessageResponse,
    PaginationParams,
    SortParams,
)
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from app.schemas.lesson_plan import LessonPlanCreate, LessonPlanResponse, LessonPlanUpdate
from app.schemas.notification import (
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
)
from app.schemas.portfolio import Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioWithStudent
from app.schemas.resource import (
    ResourceCreate,
    ResourceListResponse,
    ResourceResponse,
    ResourceSearchParams,
    ResourceUpdate,
)
from app.schemas.student import Student, StudentCreate, StudentUpdate
from app.schemas.tag import TagCreate, TagListResponse, TagResponse, TagUpdate
from app.schemas.user import (
    UserCreate,
    UserInDB,
    UserResponse,
    UserUpdate,
)

__all__ = [
    # Base schemas
    "BaseSchema",
    "DataResponse",
    "ListResponse",
    "MessageResponse",
    "ErrorResponse",
    "PaginationParams",
    "SortParams",
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    # Auth schemas
    "LoginRequest",
    "LoginResponse",
    "TokenData",
    "CurrentUserResponse",
    # Tag schemas
    "TagCreate",
    "TagUpdate",
    "TagResponse",
    "TagListResponse",
    # Resource schemas
    "ResourceCreate",
    "ResourceUpdate",
    "ResourceResponse",
    "ResourceListResponse",
    "ResourceSearchParams",
    # Student schemas
    "StudentCreate",
    "StudentUpdate",
    "Student",
    # Portfolio schemas
    "PortfolioCreate",
    "PortfolioUpdate",
    "Portfolio",
    "PortfolioWithStudent",
    # Course schemas
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    # LessonPlan schemas
    "LessonPlanCreate",
    "LessonPlanUpdate",
    "LessonPlanResponse",
    # Notification schemas
    "NotificationCreate",
    "NotificationResponse",
    "NotificationListResponse",
]

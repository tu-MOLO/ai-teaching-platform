"""
Pydantic Schemas包
"""
from app.schemas.base import (
    BaseSchema,
    DataResponse,
    ListResponse,
    MessageResponse,
    ErrorResponse,
    PaginationParams,
    SortParams
)
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TokenData,
    CurrentUserResponse
)
from app.schemas.tag import (
    TagCreate,
    TagUpdate,
    TagResponse,
    TagListResponse
)
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    ResourceListResponse,
    ResourceSearchParams
)
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    Student
)
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioUpdate,
    Portfolio,
    PortfolioWithStudent
)
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse
)
from app.schemas.lesson_plan import (
    LessonPlanCreate,
    LessonPlanUpdate,
    LessonPlanResponse
)
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse
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

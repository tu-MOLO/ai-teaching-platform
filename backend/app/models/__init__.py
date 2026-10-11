"""数据模型包"""

from app.models.ai import AIConversation, AIMessage
from app.models.ai_config import AIConfig
from app.models.base import Base
from app.models.course import Course, course_student
from app.models.dropdown_option import DropdownOption
from app.models.iep import (
    AssessmentDomain,
    AssessmentItem,
    AssessmentTemplate,
    GoalStatus,
    IEPAssessmentSnapshotItem,
    IEPDomainAssessment,
    IEPGenerationLog,
    IEPLongTermGoal,
    IEPPlan,
    IEPShortTermGoal,
    IEPStatus,
)
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.lesson_template import LessonTemplate
from app.models.notification import Notification, NotificationType
from app.models.portfolio import Portfolio
from app.models.resource import Resource, resource_tag_association
from app.models.student import Gender, Student
from app.models.tag import Tag
from app.models.user import User, UserRole, UserStatus
from app.models.verification_code import VerificationCode, VerificationCodeType

__all__ = [
    "Base",
    "User",
    "UserRole",
    "UserStatus",
    "VerificationCode",
    "VerificationCodeType",
    "Tag",
    "Resource",
    "resource_tag_association",
    "Student",
    "Gender",
    "Portfolio",
    "Course",
    "course_student",
    "Notification",
    "NotificationType",
    "LessonPlan",
    "LessonPlanStatus",
    "LessonTemplate",
    "DropdownOption",
    "AIConversation",
    "AIMessage",
    "AIConfig",
    "AssessmentTemplate",
    "AssessmentDomain",
    "AssessmentItem",
    "IEPPlan",
    "IEPStatus",
    "IEPDomainAssessment",
    "IEPAssessmentSnapshotItem",
    "IEPLongTermGoal",
    "IEPShortTermGoal",
    "GoalStatus",
    "IEPGenerationLog",
]

"""数据模型包
"""
from app.models.base import Base
from app.models.user import User, UserRole, UserStatus
from app.models.tag import Tag
from app.models.resource import Resource, resource_tag_association
from app.models.student import Student, Gender
from app.models.portfolio import Portfolio
from app.models.course import Course, course_student
from app.models.notification import Notification, NotificationType
from app.models.audit_log import AuditLog, AuditAction, AuditLogBuilder, log_audit_action
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.lesson_template import LessonTemplate
from app.models.dropdown_option import DropdownOption
from app.models.ai import AIConversation, AIMessage
from app.models.ai_config import AIConfig

__all__ = [
    "Base", "User", "UserRole", "UserStatus",
    "Tag", "Resource", "resource_tag_association",
    "Student", "Gender", "Portfolio", "Course", "course_student",
    "Notification", "NotificationType",
    "AuditLog", "AuditAction", "AuditLogBuilder", "log_audit_action",
    "LessonPlan", "LessonPlanStatus",
    "LessonTemplate",
    "DropdownOption",
    "AIConversation", "AIMessage",
    "AIConfig",
]

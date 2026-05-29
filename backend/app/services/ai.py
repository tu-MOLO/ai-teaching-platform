import json
from typing import AsyncGenerator, Optional

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai import AIConversation, AIMessage
from app.schemas.ai import ChatRequest, ChatResponse, ConversationSchema, MessageSchema, MessageListSchema

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "create_course",
            "description": "创建新课程",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "课程名称"},
                    "subject": {"type": "string", "description": "学科"},
                    "grade": {"type": "string", "description": "年级"},
                    "description": {"type": "string", "description": "课程描述"},
                    "schedule": {"type": "string", "description": "课程安排"},
                    "status": {"type": "string", "description": "课程状态，默认draft", "default": "draft"},
                },
                "required": ["name", "subject", "grade"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_courses",
            "description": "查询课程列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "搜索关键词"},
                    "subject": {"type": "string", "description": "学科筛选"},
                    "grade": {"type": "string", "description": "年级筛选"},
                    "status": {"type": "string", "description": "状态筛选"},
                    "page": {"type": "integer", "description": "页码，默认1", "default": 1},
                    "page_size": {"type": "integer", "description": "每页数量，默认10", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_course",
            "description": "获取课程详情",
            "parameters": {
                "type": "object",
                "properties": {
                    "course_id": {"type": "string", "description": "课程ID"},
                },
                "required": ["course_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_course",
            "description": "更新课程信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "course_id": {"type": "string", "description": "课程ID"},
                    "name": {"type": "string", "description": "课程名称"},
                    "subject": {"type": "string", "description": "学科"},
                    "grade": {"type": "string", "description": "年级"},
                    "description": {"type": "string", "description": "课程描述"},
                    "schedule": {"type": "string", "description": "课程安排"},
                    "status": {"type": "string", "description": "课程状态"},
                },
                "required": ["course_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_course",
            "description": "删除课程",
            "parameters": {
                "type": "object",
                "properties": {
                    "course_id": {"type": "string", "description": "课程ID"},
                },
                "required": ["course_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_student",
            "description": "添加学生",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "学生姓名"},
                    "gender": {"type": "string", "description": "性别: male/female/other"},
                    "birth_date": {"type": "string", "description": "出生日期，格式YYYY-MM-DD"},
                    "grade": {"type": "string", "description": "年级"},
                    "class_name": {"type": "string", "description": "班级"},
                    "parent_contact": {"type": "string", "description": "家长联系方式"},
                },
                "required": ["name", "gender", "birth_date", "grade", "class_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_students",
            "description": "查询学生列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "搜索关键词"},
                    "grade": {"type": "string", "description": "年级筛选"},
                    "class_name": {"type": "string", "description": "班级筛选"},
                    "page": {"type": "integer", "description": "页码，默认1", "default": 1},
                    "page_size": {"type": "integer", "description": "每页数量，默认10", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_student",
            "description": "获取学生详情",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "string", "description": "学生ID"},
                },
                "required": ["student_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_student",
            "description": "更新学生信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "string", "description": "学生ID"},
                    "name": {"type": "string", "description": "学生姓名"},
                    "gender": {"type": "string", "description": "性别"},
                    "birth_date": {"type": "string", "description": "出生日期，格式YYYY-MM-DD"},
                    "grade": {"type": "string", "description": "年级"},
                    "class_name": {"type": "string", "description": "班级"},
                    "parent_contact": {"type": "string", "description": "家长联系方式"},
                },
                "required": ["student_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_student",
            "description": "删除学生",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_id": {"type": "string", "description": "学生ID"},
                },
                "required": ["student_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_stats",
            "description": "获取仪表盘统计数据",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_course_statistics",
            "description": "获取课程统计信息",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_statistics",
            "description": "获取学生统计信息",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_monthly_trends",
            "description": "获取月度趋势数据",
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {"type": "integer", "description": "查询月数，默认6", "default": 6},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_lesson_plan",
            "description": "创建教案",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "教案标题"},
                    "subject": {"type": "string", "description": "学科"},
                    "grade": {"type": "string", "description": "年级"},
                    "duration": {"type": "integer", "description": "课时时长（分钟）"},
                    "teaching_objectives": {"type": "string", "description": "教学目标"},
                    "teaching_content": {"type": "string", "description": "教学内容"},
                    "teaching_methods": {"type": "string", "description": "教学方法"},
                    "teaching_process": {"type": "string", "description": "教学过程"},
                    "teaching_resources": {"type": "string", "description": "教学资源"},
                    "notes": {"type": "string", "description": "备注"},
                    "status": {"type": "string", "description": "教案状态，默认draft", "default": "draft"},
                },
                "required": ["title", "subject", "grade", "duration"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_lesson_plans",
            "description": "查询教案列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "搜索关键词"},
                    "status": {"type": "string", "description": "状态筛选"},
                    "page": {"type": "integer", "description": "页码，默认1", "default": 1},
                    "page_size": {"type": "integer", "description": "每页数量，默认10", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_lesson_plan",
            "description": "获取教案详情",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_id": {"type": "string", "description": "教案ID"},
                },
                "required": ["plan_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_lesson_plan",
            "description": "更新教案",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_id": {"type": "string", "description": "教案ID"},
                    "title": {"type": "string", "description": "教案标题"},
                    "subject": {"type": "string", "description": "学科"},
                    "grade": {"type": "string", "description": "年级"},
                    "duration": {"type": "integer", "description": "课时时长（分钟）"},
                    "teaching_objectives": {"type": "string", "description": "教学目标"},
                    "teaching_content": {"type": "string", "description": "教学内容"},
                    "teaching_methods": {"type": "string", "description": "教学方法"},
                    "teaching_process": {"type": "string", "description": "教学过程"},
                    "teaching_resources": {"type": "string", "description": "教学资源"},
                    "notes": {"type": "string", "description": "备注"},
                    "status": {"type": "string", "description": "教案状态"},
                },
                "required": ["plan_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "publish_lesson_plan",
            "description": "发布教案",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_id": {"type": "string", "description": "教案ID"},
                },
                "required": ["plan_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_lesson_plan",
            "description": "删除教案",
            "parameters": {
                "type": "object",
                "properties": {
                    "plan_id": {"type": "string", "description": "教案ID"},
                },
                "required": ["plan_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_resources",
            "description": "查询资源列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "搜索关键词"},
                    "file_type": {"type": "string", "description": "文件类型筛选"},
                    "page": {"type": "integer", "description": "页码，默认1", "default": 1},
                    "page_size": {"type": "integer", "description": "每页数量，默认10", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_resource",
            "description": "获取资源详情",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_id": {"type": "string", "description": "资源ID"},
                },
                "required": ["resource_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_resource",
            "description": "更新资源信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_id": {"type": "string", "description": "资源ID"},
                    "name": {"type": "string", "description": "资源名称"},
                    "description": {"type": "string", "description": "资源描述"},
                },
                "required": ["resource_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_resource",
            "description": "删除资源",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_id": {"type": "string", "description": "资源ID"},
                },
                "required": ["resource_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_notifications",
            "description": "查询通知列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "description": "通知类型筛选"},
                    "read": {"type": "string", "description": "已读状态筛选: true/false"},
                    "page": {"type": "integer", "description": "页码，默认1", "default": 1},
                    "page_size": {"type": "integer", "description": "每页数量，默认10", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_notification",
            "description": "获取通知详情",
            "parameters": {
                "type": "object",
                "properties": {
                    "notification_id": {"type": "string", "description": "通知ID"},
                },
                "required": ["notification_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mark_notification_read",
            "description": "标记通知为已读",
            "parameters": {
                "type": "object",
                "properties": {
                    "notification_id": {"type": "string", "description": "通知ID"},
                },
                "required": ["notification_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mark_all_notifications_read",
            "description": "标记所有通知为已读",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_notification",
            "description": "删除通知",
            "parameters": {
                "type": "object",
                "properties": {
                    "notification_id": {"type": "string", "description": "通知ID"},
                },
                "required": ["notification_id"],
            },
        },
    },
]


async def _create_course(db: AsyncSession, user_id: str, **kwargs):
    from app.services.course import CourseService
    from app.schemas.course import CourseCreate
    from app.models.user import User

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    teacher_name = user.username if user else "未知"

    course = await CourseService.create(db, CourseCreate(**kwargs), user_id, teacher_name)
    await db.commit()
    return {"id": course.id, "name": course.name, "subject": course.subject, "grade": course.grade, "status": course.status}


async def _list_courses(db: AsyncSession, user_id: str, **kwargs):
    from app.services.course import CourseService

    page = kwargs.pop("page", 1)
    page_size = kwargs.pop("page_size", 10)
    skip = (page - 1) * page_size
    courses = await CourseService.get_list(db, user_id, skip=skip, limit=page_size, **kwargs)
    total = await CourseService.count(db, user_id, **kwargs)
    return {
        "items": [
            {"id": c.id, "name": c.name, "subject": c.subject, "grade": c.grade, "status": c.status, "teacher": c.teacher}
            for c in courses
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def _get_course(db: AsyncSession, user_id: str, **kwargs):
    from app.services.course import CourseService

    course = await CourseService.get_by_id(db, kwargs["course_id"], user_id)
    if not course:
        return {"error": "课程不存在"}
    return {
        "id": course.id,
        "name": course.name,
        "subject": course.subject,
        "grade": course.grade,
        "description": course.description,
        "schedule": course.schedule,
        "status": course.status,
        "teacher": course.teacher,
    }


async def _update_course(db: AsyncSession, user_id: str, **kwargs):
    from app.services.course import CourseService
    from app.schemas.course import CourseUpdate
    from app.models.user import User

    course_id = kwargs.pop("course_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    teacher_name = user.username if user else "未知"

    course = await CourseService.update(db, course_id, CourseUpdate(**kwargs), user_id, teacher_name)
    if not course:
        return {"error": "课程不存在或无权限"}
    await db.commit()
    return {"id": course.id, "name": course.name, "subject": course.subject, "grade": course.grade, "status": course.status}


async def _delete_course(db: AsyncSession, user_id: str, **kwargs):
    from app.services.course import CourseService

    success = await CourseService.delete(db, kwargs["course_id"], user_id)
    if success:
        await db.commit()
    return {"success": success}


async def _create_student(db: AsyncSession, user_id: str, **kwargs):
    from app.services.student import StudentService
    from app.schemas.student import StudentCreate

    student = await StudentService.create(db, StudentCreate(**kwargs), user_id)
    await db.commit()
    return {"id": student.id, "name": student.name, "grade": student.grade, "class_name": student.class_name}


async def _list_students(db: AsyncSession, user_id: str, **kwargs):
    from app.services.student import StudentService

    page = kwargs.pop("page", 1)
    page_size = kwargs.pop("page_size", 10)
    skip = (page - 1) * page_size
    students = await StudentService.get_list(db, user_id, skip=skip, limit=page_size, **kwargs)
    total = await StudentService.count(db, user_id, **kwargs)
    return {
        "items": [
            {"id": s.id, "name": s.name, "grade": s.grade, "class_name": s.class_name, "gender": str(s.gender)}
            for s in students
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def _get_student(db: AsyncSession, user_id: str, **kwargs):
    from app.services.student import StudentService

    student = await StudentService.get(db, kwargs["student_id"], user_id)
    if not student:
        return {"error": "学生不存在"}
    return {
        "id": student.id,
        "name": student.name,
        "gender": str(student.gender),
        "birth_date": str(student.birth_date),
        "grade": student.grade,
        "class_name": student.class_name,
        "parent_contact": student.parent_contact,
        "progress": student.progress,
    }


async def _update_student(db: AsyncSession, user_id: str, **kwargs):
    from app.services.student import StudentService
    from app.schemas.student import StudentUpdate

    student_id = kwargs.pop("student_id")
    student = await StudentService.update(db, student_id, StudentUpdate(**kwargs), user_id)
    if not student:
        return {"error": "学生不存在或无权限"}
    await db.commit()
    return {"id": student.id, "name": student.name, "grade": student.grade, "class_name": student.class_name}


async def _delete_student(db: AsyncSession, user_id: str, **kwargs):
    from app.services.student import StudentService

    success = await StudentService.delete(db, kwargs["student_id"], user_id)
    if success:
        await db.commit()
    return {"success": success}


async def _get_dashboard_stats(db: AsyncSession, user_id: str, **kwargs):
    from app.services.report import ReportService

    return await ReportService.get_dashboard_stats(db, user_id)


async def _get_course_statistics(db: AsyncSession, user_id: str, **kwargs):
    from app.services.report import ReportService

    return await ReportService.get_course_statistics(db, user_id)


async def _get_student_statistics(db: AsyncSession, user_id: str, **kwargs):
    from app.services.report import ReportService

    return await ReportService.get_student_statistics(db, user_id)


async def _get_monthly_trends(db: AsyncSession, user_id: str, **kwargs):
    from app.services.report import ReportService

    months = kwargs.get("months", 6)
    return await ReportService.get_monthly_trends(db, months, user_id)


async def _create_lesson_plan(db: AsyncSession, user_id: str, **kwargs):
    from app.services.lesson_plan import LessonPlanService
    from app.schemas.lesson_plan import LessonPlanCreate

    service = LessonPlanService(db)
    plan = await service.create(LessonPlanCreate(**kwargs), user_id)
    await db.commit()
    return {"id": plan.id, "title": plan.title, "subject": plan.subject, "grade": plan.grade, "status": plan.status}


async def _list_lesson_plans(db: AsyncSession, user_id: str, **kwargs):
    from app.services.lesson_plan import LessonPlanService

    page = kwargs.pop("page", 1)
    page_size = kwargs.pop("page_size", 10)
    skip = (page - 1) * page_size
    status_filter = kwargs.pop("status", None)
    search = kwargs.pop("search", None)

    service = LessonPlanService(db)
    plans = await service.get_list(user_id, skip=skip, limit=page_size, status_filter=status_filter, search=search)
    total = await service.count(user_id, status_filter=status_filter, search=search)
    return {
        "items": [
            {"id": p.id, "title": p.title, "subject": p.subject, "grade": p.grade, "status": p.status}
            for p in plans
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def _get_lesson_plan(db: AsyncSession, user_id: str, **kwargs):
    from app.services.lesson_plan import LessonPlanService

    service = LessonPlanService(db)
    plan = await service.get_by_id(kwargs["plan_id"], user_id)
    if not plan:
        return {"error": "教案不存在"}
    return {
        "id": plan.id,
        "title": plan.title,
        "subject": plan.subject,
        "grade": plan.grade,
        "duration": plan.duration,
        "teaching_objectives": plan.teaching_objectives,
        "teaching_content": plan.teaching_content,
        "teaching_methods": plan.teaching_methods,
        "teaching_process": plan.teaching_process,
        "teaching_resources": plan.teaching_resources,
        "notes": plan.notes,
        "status": plan.status,
    }


async def _update_lesson_plan(db: AsyncSession, user_id: str, **kwargs):
    from app.services.lesson_plan import LessonPlanService
    from app.schemas.lesson_plan import LessonPlanUpdate

    plan_id = kwargs.pop("plan_id")
    service = LessonPlanService(db)
    plan = await service.update(plan_id, user_id, LessonPlanUpdate(**kwargs))
    if not plan:
        return {"error": "教案不存在或无权限"}
    await db.commit()
    return {"id": plan.id, "title": plan.title, "subject": plan.subject, "grade": plan.grade, "status": plan.status}


async def _publish_lesson_plan(db: AsyncSession, user_id: str, **kwargs):
    from app.services.lesson_plan import LessonPlanService

    service = LessonPlanService(db)
    plan = await service.publish(kwargs["plan_id"], user_id)
    if not plan:
        return {"error": "教案不存在或无权限"}
    await db.commit()
    return {"id": plan.id, "title": plan.title, "status": plan.status}


async def _delete_lesson_plan(db: AsyncSession, user_id: str, **kwargs):
    from app.services.lesson_plan import LessonPlanService

    service = LessonPlanService(db)
    success = await service.delete(kwargs["plan_id"], user_id)
    if success:
        await db.commit()
    return {"success": success}


async def _list_resources(db: AsyncSession, user_id: str, **kwargs):
    from app.services.resource import ResourceService
    from app.schemas.resource import ResourceSearchParams

    page = kwargs.pop("page", 1)
    page_size = kwargs.pop("page_size", 10)
    params = ResourceSearchParams(
        keyword=kwargs.get("keyword"),
        file_type=kwargs.get("file_type"),
        user_id=user_id,
        page=page,
        page_size=page_size,
    )
    resources, total = await ResourceService.get_resources(db, params)
    return {
        "items": [
            {"id": r.id, "name": r.name, "file_type": r.file_type, "file_size": r.file_size, "description": r.description}
            for r in resources
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def _get_resource(db: AsyncSession, user_id: str, **kwargs):
    from app.services.resource import ResourceService

    resource = await ResourceService.get_resource_by_id(db, kwargs["resource_id"], user_id)
    if not resource:
        return {"error": "资源不存在"}
    return {
        "id": resource.id,
        "name": resource.name,
        "description": resource.description,
        "file_name": resource.file_name,
        "file_size": resource.file_size,
        "file_type": resource.file_type,
    }


async def _update_resource(db: AsyncSession, user_id: str, **kwargs):
    from app.services.resource import ResourceService
    from app.schemas.resource import ResourceUpdate

    resource_id = kwargs.pop("resource_id")
    resource = await ResourceService.update_resource(db, resource_id, ResourceUpdate(**kwargs), user_id)
    if not resource:
        return {"error": "资源不存在或无权限"}
    return {"id": resource.id, "name": resource.name, "description": resource.description}


async def _delete_resource(db: AsyncSession, user_id: str, **kwargs):
    from app.services.resource import ResourceService

    success = await ResourceService.delete_resource(db, kwargs["resource_id"], user_id)
    return {"success": success}


async def _list_notifications(db: AsyncSession, user_id: str, **kwargs):
    from app.services.notification import NotificationService
    from app.models.notification import NotificationType

    page = kwargs.pop("page", 1)
    page_size = kwargs.pop("page_size", 10)
    skip = (page - 1) * page_size
    notification_type = None
    if kwargs.get("type"):
        try:
            notification_type = NotificationType(kwargs["type"])
        except ValueError:
            pass
    read = None
    if kwargs.get("read"):
        read = kwargs["read"].lower() == "true"

    notifications = await NotificationService.get_list(db, user_id, skip=skip, limit=page_size, notification_type=notification_type, read=read)
    total = await NotificationService.count(db, user_id, notification_type=notification_type, read=read)
    return {
        "items": [
            {"id": n.id, "title": n.title, "content": n.content, "type": str(n.type), "read": n.read}
            for n in notifications
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def _get_notification(db: AsyncSession, user_id: str, **kwargs):
    from app.services.notification import NotificationService

    notification = await NotificationService.get(db, kwargs["notification_id"], user_id)
    if not notification:
        return {"error": "通知不存在"}
    return {
        "id": notification.id,
        "title": notification.title,
        "content": notification.content,
        "type": str(notification.type),
        "read": notification.read,
    }


async def _mark_notification_read(db: AsyncSession, user_id: str, **kwargs):
    from app.services.notification import NotificationService

    notification = await NotificationService.mark_as_read(db, kwargs["notification_id"], user_id)
    if not notification:
        return {"error": "通知不存在"}
    return {"id": notification.id, "read": notification.read}


async def _mark_all_notifications_read(db: AsyncSession, user_id: str, **kwargs):
    from app.services.notification import NotificationService

    count = await NotificationService.mark_all_as_read(db, user_id)
    return {"marked_count": count}


async def _delete_notification(db: AsyncSession, user_id: str, **kwargs):
    from app.services.notification import NotificationService

    success = await NotificationService.delete(db, kwargs["notification_id"], user_id)
    return {"success": success}


TOOL_EXECUTOR = {
    "create_course": _create_course,
    "list_courses": _list_courses,
    "get_course": _get_course,
    "update_course": _update_course,
    "delete_course": _delete_course,
    "create_student": _create_student,
    "list_students": _list_students,
    "get_student": _get_student,
    "update_student": _update_student,
    "delete_student": _delete_student,
    "get_dashboard_stats": _get_dashboard_stats,
    "get_course_statistics": _get_course_statistics,
    "get_student_statistics": _get_student_statistics,
    "get_monthly_trends": _get_monthly_trends,
    "create_lesson_plan": _create_lesson_plan,
    "list_lesson_plans": _list_lesson_plans,
    "get_lesson_plan": _get_lesson_plan,
    "update_lesson_plan": _update_lesson_plan,
    "publish_lesson_plan": _publish_lesson_plan,
    "delete_lesson_plan": _delete_lesson_plan,
    "list_resources": _list_resources,
    "get_resource": _get_resource,
    "update_resource": _update_resource,
    "delete_resource": _delete_resource,
    "list_notifications": _list_notifications,
    "get_notification": _get_notification,
    "mark_notification_read": _mark_notification_read,
    "mark_all_notifications_read": _mark_all_notifications_read,
    "delete_notification": _delete_notification,
}

SYSTEM_PROMPT = """你是 AI 教学平台的智能助手，帮助教师高效管理教学事务。你可以通过工具函数直接操作平台数据。

## 你的能力
- 课程创建与管理：创建、查询、更新、删除课程
- 学生管理：添加、查询、更新、删除学生信息
- 数据查看：查看仪表盘统计、课程统计、学生统计、月度趋势
- 教案管理：创建、查询、更新、发布、删除教案
- 资源管理：查询、更新、删除资源
- 通知管理：查询、标记已读、删除通知

## 工作原则
- 执行创建/更新/删除操作前，确认用户提供的信息是否完整，不完整时主动询问
- 查询结果较多时，摘要展示关键信息
- 始终使用中文回复
- 回复简洁专业，避免冗余"""

MODULE_GUIDES = {
    "course": "用户当前关注课程创建与管理。优先使用课程相关工具。",
    "student": "用户当前关注学生管理。优先使用学生相关工具。",
    "data": "用户当前关注数据查看与分析。优先使用报告和统计工具。",
    "lesson_plan": "用户当前关注教案管理。优先使用教案相关工具。",
    "resource": "用户当前关注资源管理。优先使用资源相关工具。",
    "notification": "用户当前关注通知管理。优先使用通知相关工具。",
}


class AIService:

    @staticmethod
    async def chat(db: AsyncSession, user_id: str, request: ChatRequest, stream: bool = True):
        from app.services.ai_config import AIConfigService

        effective_config = await AIConfigService.get_effective_config(db, user_id)
        if not effective_config:
            raise ValueError("NO_API_KEY")

        conversation = await AIService._get_or_create_conversation(db, user_id, request.conversation_id, request.message)

        await AIService._save_message(db, conversation.id, "user", request.message, module_tag=request.module)

        messages = await AIService._build_messages(db, conversation.id, request.module)

        if stream:
            return AIService._stream_chat(db, user_id, conversation, messages, effective_config)
        else:
            return await AIService._non_stream_chat(db, user_id, conversation, messages, effective_config)

    @staticmethod
    async def _get_next_session_number(db: AsyncSession, user_id: str) -> int:
        result = await db.execute(
            select(AIConversation.id)
            .where(AIConversation.user_id == user_id, AIConversation.is_deleted == False)
        )
        existing_ids = result.scalars().all()
        max_num = 0
        for eid in existing_ids:
            pass
        result2 = await db.execute(
            select(AIConversation.title)
            .where(AIConversation.user_id == user_id, AIConversation.is_deleted == False)
        )
        existing_titles = result2.scalars().all()
        for title in existing_titles:
            if title.startswith("新会话"):
                try:
                    num_str = title[len("新会话"):].split(" ")[0]
                    num = int(num_str)
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    pass
        return max_num + 1

    @staticmethod
    async def _get_or_create_conversation(db: AsyncSession, user_id: str, conversation_id: Optional[str], message: str) -> AIConversation:
        if conversation_id:
            result = await db.execute(
                select(AIConversation).where(
                    AIConversation.id == conversation_id,
                    AIConversation.user_id == user_id,
                    AIConversation.is_deleted == False,
                )
            )
            conv = result.scalar_one_or_none()
            if conv:
                return conv

        next_num = await AIService._get_next_session_number(db, user_id)
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        title = f"新会话{next_num} [{timestamp}]"
        conv = AIConversation(user_id=user_id, title=title)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    @staticmethod
    async def _save_message(
        db: AsyncSession,
        conversation_id: str,
        role: str,
        content: str,
        tool_calls: Optional[str] = None,
        tool_call_id: Optional[str] = None,
        module_tag: Optional[str] = None,
    ) -> AIMessage:
        msg = AIMessage(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            tool_call_id=tool_call_id,
            module_tag=module_tag,
        )
        db.add(msg)
        await db.flush()
        await db.refresh(msg)
        return msg

    @staticmethod
    async def _build_messages(db: AsyncSession, conversation_id: str, module: Optional[str] = None) -> list:
        result = await db.execute(
            select(AIMessage)
            .where(
                AIMessage.conversation_id == conversation_id,
            )
            .order_by(AIMessage.created_at.asc())
            .limit(settings.AI_MAX_CONTEXT_MESSAGES)
        )
        db_messages = result.scalars().all()

        system_content = SYSTEM_PROMPT
        if module and module in MODULE_GUIDES:
            system_content += "\n\n" + MODULE_GUIDES[module]

        messages = [{"role": "system", "content": system_content}]

        for msg in db_messages:
            if msg.role == "user":
                messages.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant":
                entry = {"role": "assistant", "content": msg.content}
                if msg.tool_calls:
                    try:
                        entry["tool_calls"] = json.loads(msg.tool_calls)
                    except json.JSONDecodeError:
                        pass
                messages.append(entry)
            elif msg.role == "tool":
                messages.append({"role": "tool", "content": msg.content, "tool_call_id": msg.tool_call_id})

        return messages

    @staticmethod
    def _get_module_tag(tool_name: str) -> str:
        if tool_name in ("create_course", "list_courses", "get_course", "update_course", "delete_course"):
            return "course"
        if tool_name in ("create_student", "list_students", "get_student", "update_student", "delete_student"):
            return "student"
        if tool_name in ("get_dashboard_stats", "get_course_statistics", "get_student_statistics", "get_monthly_trends"):
            return "data"
        if tool_name in ("create_lesson_plan", "list_lesson_plans", "get_lesson_plan", "update_lesson_plan", "publish_lesson_plan", "delete_lesson_plan"):
            return "lesson_plan"
        if tool_name in ("list_resources", "get_resource", "update_resource", "delete_resource"):
            return "resource"
        if tool_name in ("list_notifications", "get_notification", "mark_notification_read", "mark_all_notifications_read", "delete_notification"):
            return "notification"
        return ""

    @staticmethod
    async def _stream_chat(db: AsyncSession, user_id: str, conversation: AIConversation, messages: list, effective_config: dict) -> AsyncGenerator:
        max_iterations = 5
        current_messages = messages.copy()

        for iteration in range(max_iterations):
            response_content = ""
            tool_calls_list = []

            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{effective_config['api_base']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {effective_config['api_key']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": effective_config["model"],
                        "messages": current_messages,
                        "tools": TOOL_DEFINITIONS,
                        "stream": True,
                    },
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield f"data: {json.dumps({'type': 'error', 'content': 'AI服务调用失败'}, ensure_ascii=False)}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})

                            if delta.get("content"):
                                response_content += delta["content"]
                                yield f"data: {json.dumps({'type': 'content', 'content': delta['content'], 'conversation_id': conversation.id}, ensure_ascii=False)}\n\n"

                            if delta.get("tool_calls"):
                                for tc in delta["tool_calls"]:
                                    idx = tc.get("index", 0)
                                    while len(tool_calls_list) <= idx:
                                        tool_calls_list.append({"id": "", "function": {"name": "", "arguments": ""}, "type": "function"})
                                    if tc.get("id"):
                                        tool_calls_list[idx]["id"] = tc["id"]
                                    if tc.get("function", {}).get("name"):
                                        tool_calls_list[idx]["function"]["name"] += tc["function"]["name"]
                                    if tc.get("function", {}).get("arguments"):
                                        tool_calls_list[idx]["function"]["arguments"] += tc["function"]["arguments"]
                        except json.JSONDecodeError:
                            continue

            if response_content:
                await AIService._save_message(
                    db, conversation.id, "assistant", response_content,
                    tool_calls=json.dumps(tool_calls_list) if tool_calls_list else None,
                )

            if not tool_calls_list:
                yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation.id}, ensure_ascii=False)}\n\n"
                return

            current_messages.append({"role": "assistant", "content": response_content, "tool_calls": tool_calls_list})

            for tc in tool_calls_list:
                tool_name = tc["function"]["name"]
                yield f"data: {json.dumps({'type': 'tool_call', 'tool_name': tool_name}, ensure_ascii=False)}\n\n"

                module_tag = AIService._get_module_tag(tool_name)

                try:
                    args = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    args = {}

                executor = TOOL_EXECUTOR.get(tool_name)
                if executor:
                    try:
                        result = await executor(db, user_id, **args)
                        result_str = json.dumps(result, ensure_ascii=False, default=str)
                    except Exception as e:
                        result_str = json.dumps({"error": str(e)}, ensure_ascii=False)
                else:
                    result_str = json.dumps({"error": f"未知工具: {tool_name}"}, ensure_ascii=False)

                current_messages.append({"role": "tool", "content": result_str, "tool_call_id": tc["id"]})
                await AIService._save_message(db, conversation.id, "tool", result_str, tool_call_id=tc["id"], module_tag=module_tag)

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation.id}, ensure_ascii=False)}\n\n"

    @staticmethod
    async def _non_stream_chat(db: AsyncSession, user_id: str, conversation: AIConversation, messages: list, effective_config: dict) -> ChatResponse:
        max_iterations = 5
        current_messages = messages.copy()
        module_tag = None

        for iteration in range(max_iterations):
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{effective_config['api_base']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {effective_config['api_key']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": effective_config["model"],
                        "messages": current_messages,
                        "tools": TOOL_DEFINITIONS,
                        "stream": False,
                    },
                )

                if response.status_code != 200:
                    raise ValueError("AI服务调用失败")

            data = response.json()
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {})
            response_content = message.get("content", "") or ""
            tool_calls = message.get("tool_calls")

            if response_content:
                await AIService._save_message(
                    db, conversation.id, "assistant", response_content,
                    tool_calls=json.dumps([tc for tc in tool_calls]) if tool_calls else None,
                )

            if not tool_calls:
                return ChatResponse(
                    conversation_id=conversation.id,
                    message=response_content,
                    module_tag=module_tag,
                )

            current_messages.append({"role": "assistant", "content": response_content, "tool_calls": [tc for tc in tool_calls]})

            for tc in tool_calls:
                tool_name = tc["function"]["name"]
                module_tag = AIService._get_module_tag(tool_name)

                try:
                    args = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    args = {}

                executor = TOOL_EXECUTOR.get(tool_name)
                if executor:
                    try:
                        result = await executor(db, user_id, **args)
                        result_str = json.dumps(result, ensure_ascii=False, default=str)
                    except Exception as e:
                        result_str = json.dumps({"error": str(e)}, ensure_ascii=False)
                else:
                    result_str = json.dumps({"error": f"未知工具: {tool_name}"}, ensure_ascii=False)

                current_messages.append({"role": "tool", "content": result_str, "tool_call_id": tc["id"]})
                await AIService._save_message(db, conversation.id, "tool", result_str, tool_call_id=tc["id"], module_tag=module_tag)

        return ChatResponse(
            conversation_id=conversation.id,
            message=response_content,
            module_tag=module_tag,
        )

    @staticmethod
    async def get_conversations(db: AsyncSession, user_id: str):
        result = await db.execute(
            select(AIConversation)
            .where(AIConversation.user_id == user_id, AIConversation.is_deleted == False)
            .order_by(AIConversation.updated_at.desc())
        )
        conversations = result.scalars().all()
        return [
            ConversationSchema(
                id=c.id,
                title=c.title,
                module=c.module,
                created_at=c.created_at.isoformat(),
                updated_at=c.updated_at.isoformat(),
            )
            for c in conversations
        ]

    @staticmethod
    async def get_conversation_messages(db: AsyncSession, conversation_id: str, user_id: str):
        result = await db.execute(
            select(AIConversation).where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
                AIConversation.is_deleted == False,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            return MessageListSchema(data=[])

        result = await db.execute(
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
        )
        messages = result.scalars().all()
        return MessageListSchema(
            data=[
                MessageSchema(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    role=m.role,
                    content=m.content,
                    tool_calls=m.tool_calls,
                    tool_call_id=m.tool_call_id,
                    module_tag=m.module_tag,
                    created_at=m.created_at.isoformat(),
                )
                for m in messages
            ]
        )

    @staticmethod
    async def delete_conversation(db: AsyncSession, conversation_id: str, user_id: str) -> bool:
        result = await db.execute(
            select(AIConversation).where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
                AIConversation.is_deleted == False,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            return False
        conv.soft_delete()
        await db.commit()
        return True

    @staticmethod
    async def rename_conversation(db: AsyncSession, conversation_id: str, user_id: str, new_title: str) -> bool:
        result = await db.execute(
            select(AIConversation).where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
                AIConversation.is_deleted == False,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            return False
        conv.title = new_title[:100]
        await db.commit()
        return True

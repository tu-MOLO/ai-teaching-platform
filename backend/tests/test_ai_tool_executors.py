import pytest
from datetime import date
from unittest.mock import AsyncMock, patch

from app.services.ai import (
    _create_course,
    _list_courses,
    _get_course,
    _update_course,
    _delete_course,
    _create_student,
    _list_students,
    _get_student,
    _update_student,
    _delete_student,
    _get_dashboard_stats,
    _get_course_statistics,
    _get_student_statistics,
    _get_monthly_trends,
    _create_lesson_plan,
    _list_lesson_plans,
    _get_lesson_plan,
    _update_lesson_plan,
    _publish_lesson_plan,
    _delete_lesson_plan,
    _list_resources,
    _get_resource,
    _list_notifications,
    _get_notification,
    _mark_notification_read,
    _mark_all_notifications_read,
    _delete_notification,
)
from app.models.resource import Resource
from app.models.notification import Notification, NotificationType


class TestCourseToolExecutors:
    @pytest.mark.asyncio
    async def test_create_course(self, db_session, test_user):
        result = await _create_course(
            db_session,
            test_user.id,
            name="数学基础",
            subject="数学",
            grade="三年级",
            teacher="testuser",
            description="数学基础课程",
        )
        assert "id" in result
        assert result["name"] == "数学基础"
        assert result["subject"] == "数学"
        assert result["grade"] == "三年级"
        assert result["status"] == "draft"

    @pytest.mark.asyncio
    async def test_list_courses(self, db_session, test_user):
        await _create_course(
            db_session,
            test_user.id,
            name="语文阅读",
            subject="语文",
            grade="二年级",
            teacher="testuser",
        )
        result = await _list_courses(db_session, test_user.id)
        assert "items" in result
        assert "total" in result
        assert "page" in result
        assert "page_size" in result
        assert result["total"] >= 1
        assert len(result["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_courses_with_pagination(self, db_session, test_user):
        await _create_course(
            db_session,
            test_user.id,
            name="课程A",
            subject="数学",
            grade="一年级",
            teacher="testuser",
        )
        result = await _list_courses(db_session, test_user.id, page=1, page_size=5)
        assert result["page"] == 1
        assert result["page_size"] == 5

    @pytest.mark.asyncio
    async def test_get_course(self, db_session, test_user):
        created = await _create_course(
            db_session,
            test_user.id,
            name="英语口语",
            subject="英语",
            grade="四年级",
            teacher="testuser",
        )
        result = await _get_course(db_session, test_user.id, course_id=created["id"])
        assert result["id"] == created["id"]
        assert result["name"] == "英语口语"
        assert result["subject"] == "英语"
        assert "description" in result
        assert "schedule" in result
        assert "teacher" in result

    @pytest.mark.asyncio
    async def test_get_course_not_found(self, db_session, test_user):
        result = await _get_course(db_session, test_user.id, course_id="nonexistent-id")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_update_course(self, db_session, test_user):
        created = await _create_course(
            db_session,
            test_user.id,
            name="物理实验",
            subject="物理",
            grade="五年级",
            teacher="testuser",
        )
        result = await _update_course(
            db_session,
            test_user.id,
            course_id=created["id"],
            name="物理实验进阶",
        )
        assert result["id"] == created["id"]
        assert result["name"] == "物理实验进阶"

    @pytest.mark.asyncio
    async def test_update_course_not_found(self, db_session, test_user):
        result = await _update_course(
            db_session,
            test_user.id,
            course_id="nonexistent-id",
            name="不存在",
        )
        assert "error" in result

    @pytest.mark.asyncio
    async def test_delete_course(self, db_session, test_user):
        created = await _create_course(
            db_session,
            test_user.id,
            name="化学入门",
            subject="化学",
            grade="六年级",
            teacher="testuser",
        )
        result = await _delete_course(db_session, test_user.id, course_id=created["id"])
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_delete_course_not_found(self, db_session, test_user):
        result = await _delete_course(db_session, test_user.id, course_id="nonexistent-id")
        assert result["success"] is False


class TestStudentToolExecutors:
    @pytest.mark.asyncio
    async def test_create_student(self, db_session, test_user):
        result = await _create_student(
            db_session,
            test_user.id,
            name="张三",
            gender="male",
            birth_date="2015-03-15",
            grade="三年级",
            class_name="1班",
        )
        assert "id" in result
        assert result["name"] == "张三"
        assert result["grade"] == "三年级"
        assert result["class_name"] == "1班"

    @pytest.mark.asyncio
    async def test_list_students(self, db_session, test_user):
        await _create_student(
            db_session,
            test_user.id,
            name="李四",
            gender="female",
            birth_date="2014-06-20",
            grade="四年级",
            class_name="2班",
        )
        result = await _list_students(db_session, test_user.id)
        assert "items" in result
        assert "total" in result
        assert "page" in result
        assert "page_size" in result
        assert result["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_students_with_pagination(self, db_session, test_user):
        await _create_student(
            db_session,
            test_user.id,
            name="王五",
            gender="male",
            birth_date="2016-01-10",
            grade="二年级",
            class_name="3班",
        )
        result = await _list_students(db_session, test_user.id, page=1, page_size=5)
        assert result["page"] == 1
        assert result["page_size"] == 5

    @pytest.mark.asyncio
    async def test_get_student(self, db_session, test_user):
        created = await _create_student(
            db_session,
            test_user.id,
            name="赵六",
            gender="male",
            birth_date="2015-09-01",
            grade="三年级",
            class_name="1班",
            parent_contact="13800138000",
        )
        result = await _get_student(db_session, test_user.id, student_id=created["id"])
        assert result["id"] == created["id"]
        assert result["name"] == "赵六"
        assert "gender" in result
        assert "birth_date" in result
        assert "grade" in result
        assert "class_name" in result
        assert "parent_contact" in result
        assert "progress" in result

    @pytest.mark.asyncio
    async def test_get_student_not_found(self, db_session, test_user):
        result = await _get_student(db_session, test_user.id, student_id="nonexistent-id")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_update_student(self, db_session, test_user):
        created = await _create_student(
            db_session,
            test_user.id,
            name="孙七",
            gender="female",
            birth_date="2014-12-25",
            grade="四年级",
            class_name="2班",
        )
        result = await _update_student(
            db_session,
            test_user.id,
            student_id=created["id"],
            name="孙七七",
        )
        assert result["id"] == created["id"]
        assert result["name"] == "孙七七"

    @pytest.mark.asyncio
    async def test_update_student_not_found(self, db_session, test_user):
        result = await _update_student(
            db_session,
            test_user.id,
            student_id="nonexistent-id",
            name="不存在",
        )
        assert "error" in result

    @pytest.mark.asyncio
    async def test_delete_student(self, db_session, test_user):
        created = await _create_student(
            db_session,
            test_user.id,
            name="周八",
            gender="male",
            birth_date="2013-05-30",
            grade="五年级",
            class_name="1班",
        )
        result = await _delete_student(db_session, test_user.id, student_id=created["id"])
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_delete_student_not_found(self, db_session, test_user):
        result = await _delete_student(db_session, test_user.id, student_id="nonexistent-id")
        assert result["success"] is False


class TestReportToolExecutors:
    @pytest.mark.asyncio
    async def test_get_dashboard_stats(self, db_session, test_user):
        await _create_course(
            db_session,
            test_user.id,
            name="统计课程",
            subject="数学",
            grade="三年级",
            teacher="testuser",
        )
        result = await _get_dashboard_stats(db_session, test_user.id)
        assert "totalCourses" in result
        assert "totalStudents" in result
        assert "activeCourses" in result
        assert "averageProgress" in result
        assert "recentActivities" in result

    @pytest.mark.asyncio
    async def test_get_course_statistics(self, db_session, test_user):
        await _create_course(
            db_session,
            test_user.id,
            name="统计课程A",
            subject="语文",
            grade="二年级",
            teacher="testuser",
        )
        result = await _get_course_statistics(db_session, test_user.id)
        assert "categoryStats" in result
        assert "hotCourses" in result
        assert "statusDistribution" in result

    @pytest.mark.asyncio
    async def test_get_student_statistics(self, db_session, test_user):
        await _create_student(
            db_session,
            test_user.id,
            name="统计学生",
            gender="male",
            birth_date="2015-01-01",
            grade="三年级",
            class_name="1班",
        )
        result = await _get_student_statistics(db_session, test_user.id)
        assert "gradeDistribution" in result
        assert "genderDistribution" in result
        assert "progressDistribution" in result

    @pytest.mark.asyncio
    async def test_get_monthly_trends(self, db_session, test_user):
        await _create_course(
            db_session,
            test_user.id,
            name="趋势课程",
            subject="英语",
            grade="四年级",
            teacher="testuser",
        )
        result = await _get_monthly_trends(db_session, test_user.id, months=3)
        assert isinstance(result, list)
        assert len(result) == 3
        for item in result:
            assert "month" in item
            assert "newCourses" in item
            assert "newStudents" in item
            assert "newLessonPlans" in item


class TestLessonPlanToolExecutors:
    @pytest.mark.asyncio
    async def test_create_lesson_plan(self, db_session, test_user):
        result = await _create_lesson_plan(
            db_session,
            test_user.id,
            title="数学教案一",
            subject="数学",
            grade="三年级",
            duration=45,
            teaching_objectives="掌握基础运算",
        )
        assert "id" in result
        assert result["title"] == "数学教案一"
        assert result["subject"] == "数学"
        assert result["grade"] == "三年级"
        assert result["status"] == "draft"

    @pytest.mark.asyncio
    async def test_list_lesson_plans(self, db_session, test_user):
        await _create_lesson_plan(
            db_session,
            test_user.id,
            title="语文教案一",
            subject="语文",
            grade="二年级",
            duration=40,
        )
        result = await _list_lesson_plans(db_session, test_user.id)
        assert "items" in result
        assert "total" in result
        assert "page" in result
        assert "page_size" in result
        assert result["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_lesson_plans_with_pagination(self, db_session, test_user):
        await _create_lesson_plan(
            db_session,
            test_user.id,
            title="英语教案一",
            subject="英语",
            grade="四年级",
            duration=50,
        )
        result = await _list_lesson_plans(db_session, test_user.id, page=1, page_size=5)
        assert result["page"] == 1
        assert result["page_size"] == 5

    @pytest.mark.asyncio
    async def test_get_lesson_plan(self, db_session, test_user):
        created = await _create_lesson_plan(
            db_session,
            test_user.id,
            title="物理教案一",
            subject="物理",
            grade="五年级",
            duration=45,
            teaching_content="力学基础",
        )
        result = await _get_lesson_plan(db_session, test_user.id, plan_id=created["id"])
        assert result["id"] == created["id"]
        assert result["title"] == "物理教案一"
        assert "duration" in result
        assert "teaching_objectives" in result
        assert "teaching_content" in result
        assert "teaching_methods" in result
        assert "teaching_process" in result
        assert "teaching_resources" in result
        assert "notes" in result
        assert "status" in result

    @pytest.mark.asyncio
    async def test_get_lesson_plan_not_found(self, db_session, test_user):
        result = await _get_lesson_plan(db_session, test_user.id, plan_id="nonexistent-id")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_update_lesson_plan(self, db_session, test_user):
        created = await _create_lesson_plan(
            db_session,
            test_user.id,
            title="化学教案一",
            subject="化学",
            grade="六年级",
            duration=45,
        )
        result = await _update_lesson_plan(
            db_session,
            test_user.id,
            plan_id=created["id"],
            title="化学教案一（修订版）",
        )
        assert result["id"] == created["id"]
        assert result["title"] == "化学教案一（修订版）"

    @pytest.mark.asyncio
    async def test_update_lesson_plan_not_found(self, db_session, test_user):
        result = await _update_lesson_plan(
            db_session,
            test_user.id,
            plan_id="nonexistent-id",
            title="不存在",
        )
        assert "error" in result

    @pytest.mark.asyncio
    async def test_publish_lesson_plan(self, db_session, test_user):
        created = await _create_lesson_plan(
            db_session,
            test_user.id,
            title="生物教案一",
            subject="生物",
            grade="七年级",
            duration=45,
        )
        result = await _publish_lesson_plan(db_session, test_user.id, plan_id=created["id"])
        assert result["id"] == created["id"]
        assert result["status"] == "published"

    @pytest.mark.asyncio
    async def test_publish_lesson_plan_not_found(self, db_session, test_user):
        result = await _publish_lesson_plan(db_session, test_user.id, plan_id="nonexistent-id")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_delete_lesson_plan(self, db_session, test_user):
        created = await _create_lesson_plan(
            db_session,
            test_user.id,
            title="历史教案一",
            subject="历史",
            grade="八年级",
            duration=40,
        )
        result = await _delete_lesson_plan(db_session, test_user.id, plan_id=created["id"])
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_delete_lesson_plan_not_found(self, db_session, test_user):
        result = await _delete_lesson_plan(db_session, test_user.id, plan_id="nonexistent-id")
        assert result["success"] is False


class TestResourceToolExecutors:
    @pytest.mark.asyncio
    @patch("app.services.resource.get_storage")
    async def test_list_resources(self, mock_get_storage, db_session, test_user):
        mock_storage = AsyncMock()
        mock_get_storage.return_value = mock_storage

        resource = Resource(
            name="测试资源",
            description="测试描述",
            file_path="test/path.pdf",
            file_name="test.pdf",
            file_size=1024,
            file_type="application/pdf",
            user_id=test_user.id,
        )
        db_session.add(resource)
        await db_session.commit()
        await db_session.refresh(resource)

        result = await _list_resources(db_session, test_user.id)
        assert "items" in result
        assert "total" in result
        assert "page" in result
        assert "page_size" in result
        assert result["total"] >= 1
        assert len(result["items"]) >= 1
        item = result["items"][0]
        assert "id" in item
        assert "name" in item
        assert "file_type" in item
        assert "file_size" in item
        assert "description" in item

    @pytest.mark.asyncio
    @patch("app.services.resource.get_storage")
    async def test_list_resources_with_pagination(self, mock_get_storage, db_session, test_user):
        mock_storage = AsyncMock()
        mock_get_storage.return_value = mock_storage

        resource = Resource(
            name="分页资源",
            description="分页测试",
            file_path="test/page.pdf",
            file_name="page.pdf",
            file_size=2048,
            file_type="application/pdf",
            user_id=test_user.id,
        )
        db_session.add(resource)
        await db_session.commit()

        result = await _list_resources(db_session, test_user.id, page=1, page_size=5)
        assert result["page"] == 1
        assert result["page_size"] == 5

    @pytest.mark.asyncio
    @patch("app.services.resource.get_storage")
    async def test_get_resource(self, mock_get_storage, db_session, test_user):
        mock_storage = AsyncMock()
        mock_get_storage.return_value = mock_storage

        resource = Resource(
            name="获取资源",
            description="获取测试",
            file_path="test/get.pdf",
            file_name="get.pdf",
            file_size=512,
            file_type="application/pdf",
            user_id=test_user.id,
        )
        db_session.add(resource)
        await db_session.commit()
        await db_session.refresh(resource)

        result = await _get_resource(db_session, test_user.id, resource_id=resource.id)
        assert result["id"] == resource.id
        assert result["name"] == "获取资源"
        assert "description" in result
        assert "file_name" in result
        assert "file_size" in result
        assert "file_type" in result

    @pytest.mark.asyncio
    @patch("app.services.resource.get_storage")
    async def test_get_resource_not_found(self, mock_get_storage, db_session, test_user):
        mock_storage = AsyncMock()
        mock_get_storage.return_value = mock_storage

        result = await _get_resource(db_session, test_user.id, resource_id="nonexistent-id")
        assert "error" in result


class TestNotificationToolExecutors:
    @pytest.mark.asyncio
    async def test_list_notifications(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="测试通知",
            content="测试内容",
            type=NotificationType.SYSTEM,
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        result = await _list_notifications(db_session, test_user.id)
        assert "items" in result
        assert "total" in result
        assert "page" in result
        assert "page_size" in result
        assert result["total"] >= 1
        assert len(result["items"]) >= 1
        item = result["items"][0]
        assert "id" in item
        assert "title" in item
        assert "content" in item
        assert "type" in item
        assert "read" in item

    @pytest.mark.asyncio
    async def test_list_notifications_with_pagination(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="分页通知",
            content="分页内容",
            type=NotificationType.COURSE,
        )
        db_session.add(notification)
        await db_session.commit()

        result = await _list_notifications(db_session, test_user.id, page=1, page_size=5)
        assert result["page"] == 1
        assert result["page_size"] == 5

    @pytest.mark.asyncio
    async def test_list_notifications_with_type_filter(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="课程通知",
            content="课程内容",
            type=NotificationType.COURSE,
        )
        db_session.add(notification)
        await db_session.commit()

        result = await _list_notifications(db_session, test_user.id, type="course")
        assert result["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_notifications_with_read_filter(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="未读通知",
            content="未读内容",
            type=NotificationType.SYSTEM,
            read=False,
        )
        db_session.add(notification)
        await db_session.commit()

        result = await _list_notifications(db_session, test_user.id, read="false")
        assert result["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_notification(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="获取通知",
            content="获取内容",
            type=NotificationType.HOMEWORK,
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        result = await _get_notification(db_session, test_user.id, notification_id=notification.id)
        assert result["id"] == notification.id
        assert result["title"] == "获取通知"
        assert result["content"] == "获取内容"
        assert "type" in result
        assert "read" in result

    @pytest.mark.asyncio
    async def test_get_notification_not_found(self, db_session, test_user):
        result = await _get_notification(db_session, test_user.id, notification_id="nonexistent-id")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_mark_notification_read(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="标记通知",
            content="标记内容",
            type=NotificationType.SYSTEM,
            read=False,
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        result = await _mark_notification_read(db_session, test_user.id, notification_id=notification.id)
        assert result["id"] == notification.id
        assert result["read"] is True

    @pytest.mark.asyncio
    async def test_mark_notification_read_not_found(self, db_session, test_user):
        result = await _mark_notification_read(db_session, test_user.id, notification_id="nonexistent-id")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_mark_all_notifications_read(self, db_session, test_user):
        for i in range(3):
            notification = Notification(
                user_id=test_user.id,
                title=f"批量通知{i}",
                content=f"批量内容{i}",
                type=NotificationType.SYSTEM,
                read=False,
            )
            db_session.add(notification)
        await db_session.commit()

        result = await _mark_all_notifications_read(db_session, test_user.id)
        assert "marked_count" in result
        assert result["marked_count"] >= 3

    @pytest.mark.asyncio
    async def test_delete_notification(self, db_session, test_user):
        notification = Notification(
            user_id=test_user.id,
            title="删除通知",
            content="删除内容",
            type=NotificationType.SYSTEM,
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        result = await _delete_notification(db_session, test_user.id, notification_id=notification.id)
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_delete_notification_not_found(self, db_session, test_user):
        result = await _delete_notification(db_session, test_user.id, notification_id="nonexistent-id")
        assert result["success"] is False

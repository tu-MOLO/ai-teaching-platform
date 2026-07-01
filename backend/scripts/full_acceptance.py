from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy import func, select

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.notification import NotificationType  # noqa: E402
from app.schemas.notification import NotificationCreate  # noqa: E402
from app.services.notifications import NotificationService  # noqa: E402


class AcceptanceRunner:
    def __init__(self) -> None:
        self.transport = httpx.ASGITransport(app=app)
        self.client = httpx.AsyncClient(
            transport=self.transport,
            base_url="http://testserver",
            follow_redirects=True,
            timeout=30.0,
        )
        self.token: str | None = None
        self.refresh_token: str | None = None
        self.user_id: str | None = None
        self.username = f"accept_{uuid4().hex[:10]}"
        self.email = f"{self.username}@example.com"
        self.password = "Acceptance123"
        self.new_password = "Acceptance456"
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.results: list[tuple[str, str]] = []

        self.course_id: str | None = None
        self.student_id: str | None = None
        self.resource_id: str | None = None
        self.portfolio_id: str | None = None
        self.lesson_plan_id: str | None = None
        self.dropdown_option_id: str | None = None
        self.tag_id: str | None = None
        self.template_id: str | None = None
        self.notification_ids: list[str] = []

    async def close(self) -> None:
        await self.client.aclose()

    def _headers(self) -> dict[str, str]:
        if not self.token:
            return {}
        return {"Authorization": f"Bearer {self.token}"}

    async def _request(self, method: str, url: str, expected: int, **kwargs: Any) -> Any:
        headers = kwargs.pop("headers", {})
        merged_headers = {**self._headers(), **headers}
        response = await self.client.request(method, url, headers=merged_headers, **kwargs)
        if response.status_code != expected:
            raise AssertionError(
                f"{method} {url} expected {expected}, got "
                f"{response.status_code}, body={response.text}"
            )
        if expected == 204:
            return None
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            payload = response.json()
            if isinstance(payload, dict) and set(payload.keys()) == {"data"}:
                return payload["data"]
            return payload
        return response

    def _record(self, name: str, detail: str = "PASS") -> None:
        self.results.append((name, detail))

    async def run(self) -> Path:
        try:
            await self.test_auth_flow()
            await self.test_user_profile()
            await self.test_dropdown_options()
            await self.test_tags_and_templates()
            await self.test_courses()
            await self.test_students()
            await self.test_resources()
            await self.test_portfolios()
            await self.test_lesson_plans()
            await self.test_notifications()
            await self.test_reports()
            await self.test_database_assertions()
            report_path = await self.write_report()
            return report_path
        finally:
            await self.close()

    async def test_auth_flow(self) -> None:
        register_payload = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "full_name": "验收教师",
            "security_question": "您的母校名称是什么？",
            "security_answer": "验收第一中学",
        }
        await self._request("POST", "/api/v1/auth/register", 201, json=register_payload)
        self._record("auth.register")

        login_payload = {
            "username": self.username,
            "password": self.password,
            "remember_me": True,
        }
        login_data = await self._request("POST", "/api/v1/auth/login", 200, json=login_payload)
        self.token = login_data["token"]["access_token"]
        self.refresh_token = login_data["token"]["refresh_token"]
        self.user_id = login_data["user"]["id"]
        self._record("auth.login")

        me_data = await self._request("GET", "/api/v1/auth/me", 200)
        assert me_data["id"] == self.user_id
        self._record("auth.me")

        refresh_data = await self._request(
            "POST",
            "/api/v1/auth/refresh",
            200,
            json={"refresh_token": self.refresh_token},
        )
        self.token = refresh_data["access_token"]
        self.refresh_token = refresh_data["refresh_token"]
        self._record("auth.refresh")

        await self._request(
            "POST",
            "/api/v1/auth/password/change",
            200,
            json={"current_password": self.password, "new_password": self.new_password},
        )
        self._record("auth.change_password")

        relogin_data = await self._request(
            "POST",
            "/api/v1/auth/login",
            200,
            json={"username": self.username, "password": self.new_password},
        )
        self.token = relogin_data["token"]["access_token"]
        self.refresh_token = relogin_data["token"]["refresh_token"]
        self._record("auth.relogin_new_password")

        await self._request(
            "POST",
            "/api/v1/auth/password/reset",
            200,
            json={
                "username": self.username,
                "new_password": self.password,
                "security_answer": "验收第一中学",
            },
        )
        self._record("auth.reset_password")

        reset_login = await self._request(
            "POST",
            "/api/v1/auth/login",
            200,
            json={"username": self.username, "password": self.password},
        )
        self.token = reset_login["token"]["access_token"]
        self.refresh_token = reset_login["token"]["refresh_token"]
        self.user_id = reset_login["user"]["id"]
        self._record("auth.relogin_reset_password")

    async def test_user_profile(self) -> None:
        user = await self._request("GET", f"/api/v1/users/{self.user_id}", 200)
        assert user["id"] == self.user_id
        updated = await self._request(
            "PUT",
            f"/api/v1/users/{self.user_id}",
            200,
            json={"full_name": "验收教师已更新"},
        )
        assert updated["full_name"] == "验收教师已更新"
        self._record("users.profile_get_update")

    async def test_dropdown_options(self) -> None:
        payload = {
            "group_key": "course_subject",
            "label": f"验收学科{self.timestamp}",
            "value": f"subject-{self.timestamp}",
            "description": "验收创建",
            "sort_order": 999,
            "is_active": True,
        }
        created = await self._request("POST", "/api/v1/dropdown-options", 201, json=payload)
        self.dropdown_option_id = created["id"]
        listed = await self._request(
            "GET", "/api/v1/dropdown-options?group_key=course_subject&active_only=false", 200
        )
        assert any(item["id"] == self.dropdown_option_id for item in listed["data"])
        updated = await self._request(
            "PUT",
            f"/api/v1/dropdown-options/{self.dropdown_option_id}",
            200,
            json={"label": f"验收学科已更新{self.timestamp}"},
        )
        assert updated["label"].startswith("验收学科已更新")
        await self._request("DELETE", f"/api/v1/dropdown-options/{self.dropdown_option_id}", 200)
        self._record("dropdown_options.crud")

    async def test_tags_and_templates(self) -> None:
        tags_before = await self._request("GET", "/api/v1/tags?page=1&page_size=100", 200)
        created = await self._request(
            "POST",
            "/api/v1/tags/",
            201,
            json={"name": f"验收标签{self.timestamp}", "description": "验收标签"},
        )
        self.tag_id = created["id"]
        tags_after = await self._request("GET", "/api/v1/tags?page=1&page_size=100", 200)
        assert tags_after["total"] >= tags_before["total"]
        tag_detail = await self._request("GET", f"/api/v1/tags/{self.tag_id}", 200)
        assert tag_detail["id"] == self.tag_id
        updated = await self._request(
            "PUT",
            f"/api/v1/tags/{self.tag_id}",
            200,
            json={"description": "验收标签已更新"},
        )
        assert updated["description"] == "验收标签已更新"
        self._record("tags.crud")

        templates = await self._request("GET", "/api/v1/lesson-templates?page=1&page_size=20", 200)
        assert templates["total"] >= 1
        self.template_id = templates["data"][0]["id"]
        template = await self._request("GET", f"/api/v1/lesson-templates/{self.template_id}", 200)
        assert template["id"] == self.template_id
        self._record("lesson_templates.list_detail")

    async def test_courses(self) -> None:
        payload = {
            "name": f"验收课程{self.timestamp}",
            "subject": "语文",
            "grade": "一年级",
            "teacher": "验收教师",
            "schedule": "周一第一节",
            "description": "课程验收",
            "status": "draft",
        }
        created = await self._request("POST", "/api/v1/courses", 201, json=payload)
        self.course_id = created["id"]
        listed = await self._request("GET", "/api/v1/courses?page=1&page_size=20", 200)
        assert any(item["id"] == self.course_id for item in listed["data"])
        detail = await self._request("GET", f"/api/v1/courses/{self.course_id}", 200)
        assert detail["id"] == self.course_id
        updated = await self._request(
            "PUT",
            f"/api/v1/courses/{self.course_id}",
            200,
            json={"status": "active", "description": "课程验收已更新"},
        )
        assert updated["status"] == "active"
        self._record("courses.crud")

    async def test_students(self) -> None:
        payload = {
            "name": f"验收学生{self.timestamp}",
            "gender": "male",
            "birth_date": "2016-05-01",
            "grade": "一年级",
            "class_name": "一班",
            "parent_contact": "13800000000",
            "is_active": True,
            "enrollment_date": "2024-09-01",
        }
        created = await self._request("POST", "/api/v1/students", 201, json=payload)
        self.student_id = created["id"]
        listed = await self._request("GET", "/api/v1/students?page=1&page_size=20", 200)
        assert any(item["id"] == self.student_id for item in listed["data"])
        detail = await self._request("GET", f"/api/v1/students/{self.student_id}", 200)
        assert detail["id"] == self.student_id
        updated = await self._request(
            "PUT",
            f"/api/v1/students/{self.student_id}",
            200,
            json={"class_name": "二班", "grade": "二年级"},
        )
        assert updated["class_name"] == "二班"
        exported = await self._request("GET", f"/api/v1/students/{self.student_id}/export", 200)
        assert exported.headers["content-type"].startswith("application/pdf")
        self._record("students.crud_export")

    async def test_resources(self) -> None:
        if not self.tag_id:
            raise AssertionError("tag_id missing")
        files = {
            "file": ("acceptance.txt", b"acceptance resource content", "text/plain"),
        }
        data = {
            "name": f"验收资源{self.timestamp}",
            "description": "资源描述验收",
            "tag_ids": [self.tag_id],
        }
        created = await self._request("POST", "/api/v1/resources/", 201, files=files, data=data)
        self.resource_id = created["id"]
        assert created["file_url"].endswith(f"/api/v1/resources/{self.resource_id}/file")
        listed = await self._request("GET", "/api/v1/resources/?page=1&page_size=20", 200)
        created_row = next(item for item in listed["data"] if item["id"] == self.resource_id)
        assert created_row["description"] == "资源描述验收"
        assert any(tag["id"] == self.tag_id for tag in created_row["tags"])
        detail = await self._request("GET", f"/api/v1/resources/{self.resource_id}", 200)
        assert detail["id"] == self.resource_id
        assert any(tag["id"] == self.tag_id for tag in detail["tags"])
        file_response = await self._request(
            "GET",
            f"/api/v1/resources/{self.resource_id}/file?access_token={self.token}",
            200,
        )
        assert file_response.content == b"acceptance resource content"
        updated = await self._request(
            "PUT",
            f"/api/v1/resources/{self.resource_id}",
            200,
            json={"description": "资源描述已更新", "tag_ids": [self.tag_id]},
        )
        assert updated["description"] == "资源描述已更新"
        self._record("resources.upload_list_detail_file_update")

    async def test_portfolios(self) -> None:
        if not self.student_id:
            raise AssertionError("student_id missing")
        attachment_url = f"/api/v1/resources/{self.resource_id}/file"
        payload = {
            "student_id": self.student_id,
            "type": "evaluation",
            "title": f"验收成长记录{self.timestamp}",
            "content": "成长档案验收",
            "attachments": f'["{attachment_url}"]',
            "cognitive_score": 80,
            "skill_score": 60,
            "creativity_score": 100,
            "cooperation_score": 40,
            "attention_score": 20,
        }
        created = await self._request("POST", "/api/v1/portfolios", 201, json=payload)
        self.portfolio_id = created["id"]
        listed = await self._request(
            "GET", f"/api/v1/portfolios?page=1&page_size=20&student_id={self.student_id}", 200
        )
        assert any(item["id"] == self.portfolio_id for item in listed["data"])
        detail = await self._request("GET", f"/api/v1/portfolios/{self.portfolio_id}", 200)
        assert detail["cognitive_score"] == 80
        updated = await self._request(
            "PUT",
            f"/api/v1/portfolios/{self.portfolio_id}",
            200,
            json={"title": f"验收成长记录已更新{self.timestamp}", "attention_score": 40},
        )
        assert updated["attention_score"] == 40
        self._record("portfolios.crud")

    async def test_lesson_plans(self) -> None:
        payload = {
            "title": f"验收教案{self.timestamp}",
            "subject": "数学",
            "grade": "二年级",
            "duration": 40,
            "teaching_objectives": "目标",
            "teaching_content": "内容",
            "teaching_methods": "方法",
            "teaching_process": "过程",
            "teaching_resources": "资源",
            "notes": "备注",
            "status": "draft",
        }
        created = await self._request("POST", "/api/v1/lesson-plans", 201, json=payload)
        self.lesson_plan_id = created["id"]
        listed = await self._request("GET", "/api/v1/lesson-plans?page=1&page_size=20", 200)
        assert any(item["id"] == self.lesson_plan_id for item in listed["data"])
        detail = await self._request("GET", f"/api/v1/lesson-plans/{self.lesson_plan_id}", 200)
        assert detail["id"] == self.lesson_plan_id
        updated = await self._request(
            "PUT",
            f"/api/v1/lesson-plans/{self.lesson_plan_id}",
            200,
            json={"notes": "备注已更新"},
        )
        assert updated["notes"] == "备注已更新"
        published = await self._request(
            "POST", f"/api/v1/lesson-plans/{self.lesson_plan_id}/publish", 200
        )
        assert published["status"] == "published"
        unpublished = await self._request(
            "POST", f"/api/v1/lesson-plans/{self.lesson_plan_id}/unpublish", 200
        )
        assert unpublished["status"] == "draft"
        archived = await self._request(
            "POST", f"/api/v1/lesson-plans/{self.lesson_plan_id}/archive", 200
        )
        assert archived["status"] == "archived"
        restored = await self._request(
            "POST", f"/api/v1/lesson-plans/{self.lesson_plan_id}/restore", 200
        )
        assert restored["status"] == "draft"
        stats = await self._request("GET", "/api/v1/lesson-plans/stats/monthly", 200)
        assert "monthly_count" in stats
        self._record("lesson_plans.crud_status_stats")

    async def test_notifications(self) -> None:
        if not self.user_id:
            raise AssertionError("user_id missing")
        async with AsyncSessionLocal() as db:
            for index, notification_type in enumerate(
                [NotificationType.SYSTEM, NotificationType.COURSE, NotificationType.REMINDER],
                start=1,
            ):
                created = await NotificationService.create(
                    db,
                    NotificationCreate(
                        user_id=self.user_id,
                        title=f"验收通知{index}",
                        content=f"通知内容{index}",
                        type=notification_type,
                    ),
                )
                self.notification_ids.append(created.id)

        listed = await self._request("GET", "/api/v1/notifications?page=1&page_size=20", 200)
        assert listed["total"] >= 3
        filtered = await self._request(
            "GET", "/api/v1/notifications?type=system&page=1&page_size=20", 200
        )
        assert all(item["type"] == "system" for item in filtered["data"])
        stats = await self._request("GET", "/api/v1/notifications/stats", 200)
        assert "system" in stats["by_type"]
        unread = await self._request("GET", "/api/v1/notifications/unread-count", 200)
        assert unread["unread_count"] >= 3
        detail = await self._request(
            "GET", f"/api/v1/notifications/{self.notification_ids[0]}", 200
        )
        assert detail["id"] == self.notification_ids[0]
        marked = await self._request(
            "PUT", f"/api/v1/notifications/{self.notification_ids[0]}/read", 200
        )
        assert marked["read"] is True
        await self._request(
            "PUT", "/api/v1/notifications/read-batch", 200, json={"ids": self.notification_ids[1:]}
        )
        await self._request("PUT", "/api/v1/notifications/read-all", 200)
        await self._request("DELETE", f"/api/v1/notifications/{self.notification_ids[0]}", 200)
        await self._request("DELETE", "/api/v1/notifications/read/all", 200)
        self._record("notifications.list_filter_stats_read_delete")

    async def test_reports(self) -> None:
        dashboard = await self._request("GET", "/api/v1/reports/dashboard", 200)
        assert "totalCourses" in dashboard
        course_report = await self._request("GET", "/api/v1/reports/courses", 200)
        assert "categoryStats" in course_report
        student_report = await self._request("GET", "/api/v1/reports/students", 200)
        assert "gradeDistribution" in student_report
        trends = await self._request("GET", "/api/v1/reports/trends?months=6", 200)
        assert isinstance(trends, list) and len(trends) == 6
        self._record("reports.dashboard_courses_students_trends")

    async def test_database_assertions(self) -> None:
        from app.models.course import Course
        from app.models.lesson_plan import LessonPlan
        from app.models.portfolio import Portfolio
        from app.models.resource import Resource
        from app.models.student import Student
        from app.models.tag import Tag
        from app.models.user import User

        async with AsyncSessionLocal() as db:
            user_count = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
            course_count = (
                await db.execute(
                    select(func.count()).select_from(Course).where(Course.id == self.course_id)
                )
            ).scalar() or 0
            student_count = (
                await db.execute(
                    select(func.count()).select_from(Student).where(Student.id == self.student_id)
                )
            ).scalar() or 0
            resource_count = (
                await db.execute(
                    select(func.count())
                    .select_from(Resource)
                    .where(Resource.id == self.resource_id)
                )
            ).scalar() or 0
            portfolio_count = (
                await db.execute(
                    select(func.count())
                    .select_from(Portfolio)
                    .where(Portfolio.id == self.portfolio_id)
                )
            ).scalar() or 0
            lesson_plan_count = (
                await db.execute(
                    select(func.count())
                    .select_from(LessonPlan)
                    .where(LessonPlan.id == self.lesson_plan_id)
                )
            ).scalar() or 0
            tag_count = (
                await db.execute(select(func.count()).select_from(Tag).where(Tag.id == self.tag_id))
            ).scalar() or 0
            assert user_count >= 1
            assert course_count == 1
            assert student_count == 1
            assert resource_count == 1
            assert portfolio_count == 1
            assert lesson_plan_count == 1
            assert tag_count == 1
        self._record("database.assertions")

    async def write_report(self) -> Path:
        report_path = ROOT.parent / f"FULL_ACCEPTANCE_REPORT_{self.timestamp}.md"
        lines = [
            "# 全量功能验收报告",
            "",
            f"- 验收时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "- 验收方式: FastAPI ASGI 直连自动化接口验收",
            "- 验收范围: 当前项目现存全部教师侧功能模块",
            "",
            "## 验收结果",
            "",
        ]
        for name, detail in self.results:
            lines.append(f"- `{name}`: {detail}")
        lines.extend(
            [
                "",
                "## 覆盖模块",
                "",
                "- 认证: 注册、登录、刷新令牌、获取当前用户、修改密码、重置密码、重新登录",
                "- 用户: 获取个人资料、更新个人资料",
                "- 下拉选项: 创建、列表、更新、删除",
                "- 标签: 创建、列表、详情、更新",
                "- 教案模板: 列表、详情",
                "- 课程: 创建、列表、详情、更新",
                "- 学生: 创建、列表、详情、更新、导出成长报告",
                "- 资源: 上传、列表、详情、文件访问、更新",
                "- 成长档案: 创建、列表、详情、更新",
                "- 教案: 创建、列表、详情、更新、发布、取消发布、归档、恢复、月统计",
                "- 通知: 列表、类型筛选、统计、未读数、详情、已读、批量已读、全部已读、删除",
                "- 报表: 仪表盘、课程报表、学生报表、趋势报表",
                "- 数据库: 核心实体创建落库断言",
                "",
                "## 结论",
                "",
                "- 本次自动化验收通过的前提下，当前教师侧既有核心功能链路已完成可用性验证。",
                "- 若后续还要做浏览器级逐页点测，可在此基础上补 UI 交互验收，但当前这份报告已覆盖前后端接口与数据库联动的交付主链路。",
            ]
        )
        report_path.write_text("\n".join(lines), encoding="utf-8")
        return report_path


async def main() -> None:
    runner = AcceptanceRunner()
    report_path = await runner.run()
    print(f"ACCEPTANCE_REPORT={report_path}")


if __name__ == "__main__":
    asyncio.run(main())

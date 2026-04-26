"""
课程模块CRUD测试
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.user import User
from tests.factories import CourseFactory, UserFactory


class TestCourseCreate:
    """课程创建测试"""
    
    @pytest.mark.asyncio
    async def test_create_course_success(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """测试成功创建课程"""
        response = await client.post("/api/v1/courses", headers=auth_headers, json={
            "name": "数学基础",
            "subject": "数学",
            "grade": "一年级",
            "teacher": "张老师"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "数学基础"
        assert data["data"]["subject"] == "数学"
        assert data["data"]["user_id"] == test_user.id
    
    @pytest.mark.asyncio
    async def test_create_course_missing_fields(self, client: AsyncClient, auth_headers: dict):
        """测试缺少必填字段"""
        response = await client.post("/api/v1/courses", headers=auth_headers, json={
            "name": "数学基础"
            # 缺少 subject, grade, teacher
        })
        
        assert response.status_code == 422


class TestCourseRead:
    """课程查询测试"""
    
    @pytest.mark.asyncio
    async def test_get_course_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功查询单个课程"""
        # 创建课程
        course = CourseFactory.create(user_id=test_user.id)
        db_session.add(course)
        await db_session.commit()
        
        response = await client.get(f"/api/v1/courses/{course.id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == course.id
        assert data["data"]["name"] == course.name
    
    @pytest.mark.asyncio
    async def test_get_course_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试查询不存在课程"""
        response = await client.get("/api/v1/courses/non-existent-id", headers=auth_headers)
        
        assert response.status_code == 404
        data = response.json()
        assert "课程不存在" in data.get("message", "")
    
    @pytest.mark.asyncio
    async def test_get_course_other_user(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试查询其他用户的课程"""
        # 创建另一个用户
        other_user = UserFactory.create(username="otheruser", email="other@test.com")
        db_session.add(other_user)
        await db_session.commit()
        
        # 创建属于其他用户的课程
        course = CourseFactory.create(user_id=other_user.id)
        db_session.add(course)
        await db_session.commit()
        
        response = await client.get(f"/api/v1/courses/{course.id}", headers=auth_headers)
        
        # 根据业务逻辑，可能返回404或403
        assert response.status_code in [404, 403]
    
    @pytest.mark.asyncio
    async def test_list_courses(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试查询课程列表"""
        # 创建多个课程
        for i in range(5):
            course = CourseFactory.create(user_id=test_user.id, name=f"课程{i}")
            db_session.add(course)
        await db_session.commit()
        
        response = await client.get("/api/v1/courses", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert data["page"] == 1
    
    @pytest.mark.asyncio
    async def test_list_courses_filter_by_subject(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试按学科筛选课程"""
        # 创建不同学科的课程
        math_course = CourseFactory.create(user_id=test_user.id, subject="数学")
        english_course = CourseFactory.create(user_id=test_user.id, subject="英语")
        db_session.add_all([math_course, english_course])
        await db_session.commit()
        
        response = await client.get("/api/v1/courses?subject=数学", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        for course in data["data"]:
            assert course["subject"] == "数学"
    
    @pytest.mark.asyncio
    async def test_list_courses_filter_by_grade(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试按年级筛选课程"""
        # 创建不同年级的课程
        grade1_course = CourseFactory.create(user_id=test_user.id, grade="一年级")
        grade2_course = CourseFactory.create(user_id=test_user.id, grade="二年级")
        db_session.add_all([grade1_course, grade2_course])
        await db_session.commit()
        
        response = await client.get("/api/v1/courses?grade=一年级", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        for course in data["data"]:
            assert course["grade"] == "一年级"


class TestCourseUpdate:
    """课程更新测试"""
    
    @pytest.mark.asyncio
    async def test_update_course_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功更新课程"""
        # 创建课程
        course = CourseFactory.create(user_id=test_user.id)
        db_session.add(course)
        await db_session.commit()
        
        response = await client.put(f"/api/v1/courses/{course.id}", headers=auth_headers, json={
            "name": "更新后的课程名",
            "description": "更新后的描述"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "更新后的课程名"
    
    @pytest.mark.asyncio
    async def test_update_course_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试更新不存在课程"""
        response = await client.put("/api/v1/courses/non-existent-id", headers=auth_headers, json={
            "name": "更新"
        })
        
        assert response.status_code == 404
        data = response.json()
        assert "课程不存在" in data.get("message", "")


class TestCourseDelete:
    """课程删除测试"""
    
    @pytest.mark.asyncio
    async def test_delete_course_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功删除课程"""
        # 创建课程
        course = CourseFactory.create(user_id=test_user.id)
        db_session.add(course)
        await db_session.commit()
        
        response = await client.delete(f"/api/v1/courses/{course.id}", headers=auth_headers)
        
        assert response.status_code == 204
        
        # 验证已软删除
        await db_session.refresh(course)
        assert course.is_deleted is True
    
    @pytest.mark.asyncio
    async def test_delete_course_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试删除不存在课程"""
        response = await client.delete("/api/v1/courses/non-existent-id", headers=auth_headers)
        
        assert response.status_code == 404
        data = response.json()
        assert "课程不存在" in data.get("message", "")

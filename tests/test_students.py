"""
学生模块CRUD测试
"""
import pytest
from datetime import date
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student, Gender
from app.models.user import User
from tests.factories import StudentFactory


class TestStudentCreate:
    """学生创建测试"""

    @pytest.mark.asyncio
    async def test_create_student_success(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """测试成功创建学生"""
        response = await client.post("/api/v1/students", headers=auth_headers, json={
            "name": "张三",
            "gender": "male",
            "birth_date": "2015-01-01",
            "grade": "一年级",
            "class_name": "1班"
        })

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "张三"
        assert data["data"]["gender"] == "male"
        assert data["data"]["grade"] == "一年级"

    @pytest.mark.asyncio
    async def test_create_student_missing_fields(self, client: AsyncClient, auth_headers: dict):
        """测试缺少必填字段"""
        response = await client.post("/api/v1/students", headers=auth_headers, json={
            "name": "张三"
            # 缺少 gender, birth_date, grade, class_name
        })

        assert response.status_code == 422


class TestStudentRead:
    """学生查询测试"""

    @pytest.mark.asyncio
    async def test_get_student_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功查询单个学生"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        response = await client.get(f"/api/v1/students/{student.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == student.id
        assert data["data"]["name"] == student.name

    @pytest.mark.asyncio
    async def test_get_student_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试查询不存在学生"""
        response = await client.get("/api/v1/students/non-existent-id", headers=auth_headers)

        assert response.status_code == 404
        data = response.json()
        assert "学生不存在" in data.get("message", "")

    @pytest.mark.asyncio
    async def test_list_students(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试查询学生列表"""
        # 创建多个学生
        for i in range(5):
            student = StudentFactory.create(user_id=test_user.id, name=f"学生{i}")
            db_session.add(student)
        await db_session.commit()

        response = await client.get("/api/v1/students", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_students_filter_by_grade(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试按年级筛选学生"""
        # 创建不同年级的学生
        grade1_student = StudentFactory.create(user_id=test_user.id, grade="一年级")
        grade2_student = StudentFactory.create(user_id=test_user.id, grade="二年级")
        db_session.add_all([grade1_student, grade2_student])
        await db_session.commit()

        response = await client.get("/api/v1/students?grade=一年级", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        for student in data["data"]:
            assert student["grade"] == "一年级"

    @pytest.mark.asyncio
    async def test_list_students_filter_by_class(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试按班级筛选学生"""
        # 创建不同班级的学生
        class1_student = StudentFactory.create(user_id=test_user.id, class_name="1班")
        class2_student = StudentFactory.create(user_id=test_user.id, class_name="2班")
        db_session.add_all([class1_student, class2_student])
        await db_session.commit()

        response = await client.get("/api/v1/students?class_name=1班", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        for student in data["data"]:
            assert student["class_name"] == "1班"


class TestStudentUpdate:
    """学生更新测试"""

    @pytest.mark.asyncio
    async def test_update_student_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功更新学生"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        response = await client.put(f"/api/v1/students/{student.id}", headers=auth_headers, json={
            "name": "李四",
            "grade": "二年级"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "李四"
        assert data["data"]["grade"] == "二年级"

    @pytest.mark.asyncio
    async def test_update_student_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试更新不存在学生"""
        response = await client.put("/api/v1/students/non-existent-id", headers=auth_headers, json={
            "name": "李四"
        })

        assert response.status_code == 404


class TestStudentDelete:
    """学生删除测试"""

    @pytest.mark.asyncio
    async def test_delete_student_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功删除学生"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        response = await client.delete(f"/api/v1/students/{student.id}", headers=auth_headers)

        assert response.status_code == 204

        # 验证已软删除
        await db_session.refresh(student)
        assert student.is_deleted is True

    @pytest.mark.asyncio
    async def test_delete_student_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试删除不存在学生"""
        response = await client.delete("/api/v1/students/non-existent-id", headers=auth_headers)

        assert response.status_code == 404

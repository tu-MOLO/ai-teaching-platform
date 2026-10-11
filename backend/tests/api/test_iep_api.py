"""IEP 与评估模板 API 集成测试（端到端，含认证、状态机与修订版本）。"""

from datetime import date

import pytest_asyncio

from app.models.student import Gender, Student

BASE_TEMPLATES = "/api/v1/iep-templates"
BASE_IEPS = "/api/v1/ieps"


@pytest_asyncio.fixture
async def student_id(db_session, test_user):
    student = Student(
        user_id=test_user.id,
        name="测试学生",
        gender=Gender.MALE,
        birth_date=date(2018, 1, 1),
        grade="三年级",
        class_name="培智一班",
    )
    db_session.add(student)
    await db_session.commit()
    return student.id


def _full_iep_payload(sid):
    return {
        "student_id": sid,
        "term": "2026-2027第一学期",
        "student_profile": "教师提供的情况",
        "supports": {"teaching": ["视觉提示"], "rehab": [], "family": []},
        "domain_assessments": [
            {
                "domain_code": "perception",
                "domain_name": "感知",
                "overall_level": 2,
                "summary": "能注视并追随",
                "items": [{"item_name": "注视追踪", "level": 2}],
            }
        ],
        "long_term_goals": [
            {
                "domain_code": "perception",
                "domain_name": "感知",
                "goal": "提升视觉追踪能力",
                "short_term_goals": [
                    {
                        "condition": "在教师提示下",
                        "behavior": "目光追随移动玩具",
                        "criterion": "连续3次每次5秒",
                        "support_level": 2,
                        "teaching_methods": ["示范", "提示"],
                        "materials": ["发光玩具"],
                    }
                ],
            }
        ],
    }


# ---------------- 模板 ----------------


async def test_default_template_auto_initialized(client, auth_headers):
    resp = await client.get(f"{BASE_TEMPLATES}/default", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_default"] is True
    assert len(data["domains"]) == 6
    item_count = sum(len(d["items"]) for d in data["domains"])
    assert item_count == 18


async def test_list_templates(client, auth_headers):
    await client.get(f"{BASE_TEMPLATES}/default", headers=auth_headers)
    resp = await client.get(BASE_TEMPLATES, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


async def test_create_template_and_default_uniqueness(client, auth_headers):
    await client.get(f"{BASE_TEMPLATES}/default", headers=auth_headers)
    resp = await client.post(
        BASE_TEMPLATES,
        headers=auth_headers,
        json={
            "name": "我的自定义模板",
            "is_default": True,
            "domains": [{"code": "x", "name": "单一领域", "items": [{"name": "条目"}]}],
        },
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["is_default"] is True

    listing = (await client.get(BASE_TEMPLATES, headers=auth_headers)).json()["data"]
    defaults = [t for t in listing if t["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["name"] == "我的自定义模板"


async def test_reset_template_to_default(client, auth_headers):
    created = (
        await client.post(
            BASE_TEMPLATES,
            headers=auth_headers,
            json={"name": "待重置", "is_default": False, "domains": []},
        )
    ).json()["data"]
    assert created["domains"] == []

    resp = await client.post(f"{BASE_TEMPLATES}/{created['id']}/reset", headers=auth_headers)
    assert resp.status_code == 200
    domains = resp.json()["data"]["domains"]
    assert len(domains) == 6
    assert sum(len(d["items"]) for d in domains) == 18


async def test_template_not_found(client, auth_headers):
    resp = await client.get(f"{BASE_TEMPLATES}/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


async def test_update_and_delete_template(client, auth_headers):
    created = (
        await client.post(
            BASE_TEMPLATES,
            headers=auth_headers,
            json={"name": "临时", "domains": []},
        )
    ).json()["data"]
    tid = created["id"]

    updated = await client.put(
        f"{BASE_TEMPLATES}/{tid}",
        headers=auth_headers,
        json={"name": "改名后"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "改名后"

    deleted = await client.delete(f"{BASE_TEMPLATES}/{tid}", headers=auth_headers)
    assert deleted.status_code == 204
    assert (await client.get(f"{BASE_TEMPLATES}/{tid}", headers=auth_headers)).status_code == 404


# ---------------- IEP CRUD ----------------


async def test_create_iep(client, auth_headers, student_id):
    resp = await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["status"] == "draft"
    assert data["revision_no"] == 1
    assert data["student_name"] == "测试学生"
    assert data["domain_assessments"][0]["items"][0]["level"] == 2
    stg = data["long_term_goals"][0]["short_term_goals"][0]
    assert stg["support_level"] == 2
    assert stg["materials"] == ["发光玩具"]


async def test_create_iep_invalid_student(client, auth_headers):
    payload = _full_iep_payload("does-not-exist")
    resp = await client.post(BASE_IEPS, headers=auth_headers, json=payload)
    assert resp.status_code == 400


async def test_list_ieps_with_filters(client, auth_headers, student_id):
    await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    second = _full_iep_payload(student_id)
    second["term"] = "2027-2028第一学期"
    await client.post(BASE_IEPS, headers=auth_headers, json=second)

    resp = await client.get(BASE_IEPS, headers=auth_headers)
    assert resp.json()["total"] == 2

    filtered = await client.get(
        BASE_IEPS, headers=auth_headers, params={"term": "2027-2028第一学期"}
    )
    assert filtered.json()["total"] == 1
    assert filtered.json()["data"][0]["short_term_goal_count"] == 1


async def test_get_and_update_iep(client, auth_headers, student_id):
    created = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]
    iid = created["id"]

    got = await client.get(f"{BASE_IEPS}/{iid}", headers=auth_headers)
    assert got.status_code == 200

    updated = await client.put(
        f"{BASE_IEPS}/{iid}",
        headers=auth_headers,
        json={"student_profile": "更新后的情况"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["student_profile"] == "更新后的情况"


# ---------------- 状态机 ----------------


async def test_iep_full_review_flow(client, auth_headers, student_id):
    iid = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]["id"]

    submitted = await client.post(f"{BASE_IEPS}/{iid}/submit", headers=auth_headers)
    assert submitted.status_code == 200
    assert submitted.json()["data"]["status"] == "review"

    locked = await client.post(f"{BASE_IEPS}/{iid}/lock", headers=auth_headers)
    assert locked.status_code == 200
    locked_data = locked.json()["data"]
    assert locked_data["status"] == "locked"
    assert locked_data["reviewed_by"] is not None
    assert locked_data["reviewed_at"] is not None


async def test_invalid_transitions_rejected(client, auth_headers, student_id):
    iid = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]["id"]

    # draft 直接 lock → 400
    assert (await client.post(f"{BASE_IEPS}/{iid}/lock", headers=auth_headers)).status_code == 400

    await client.post(f"{BASE_IEPS}/{iid}/submit", headers=auth_headers)
    # review 再次 submit → 400
    assert (await client.post(f"{BASE_IEPS}/{iid}/submit", headers=auth_headers)).status_code == 400

    await client.post(f"{BASE_IEPS}/{iid}/lock", headers=auth_headers)
    # locked 不能编辑 → 400
    edited = await client.put(f"{BASE_IEPS}/{iid}", headers=auth_headers, json={"term": "改"})
    assert edited.status_code == 400


async def test_submit_empty_iep_rejected(client, auth_headers, student_id):
    iid = (
        await client.post(
            BASE_IEPS,
            headers=auth_headers,
            json={"student_id": student_id, "term": "空"},
        )
    ).json()["data"]["id"]
    resp = await client.post(f"{BASE_IEPS}/{iid}/submit", headers=auth_headers)
    assert resp.status_code == 400


async def test_back_to_draft(client, auth_headers, student_id):
    iid = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]["id"]
    await client.post(f"{BASE_IEPS}/{iid}/submit", headers=auth_headers)
    resp = await client.post(f"{BASE_IEPS}/{iid}/back-to-draft", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "draft"


async def test_revise_creates_new_version(client, auth_headers, student_id):
    original = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]
    iid = original["id"]
    await client.post(f"{BASE_IEPS}/{iid}/submit", headers=auth_headers)
    await client.post(f"{BASE_IEPS}/{iid}/lock", headers=auth_headers)

    revised = await client.post(f"{BASE_IEPS}/{iid}/revise", headers=auth_headers)
    assert revised.status_code == 200
    data = revised.json()["data"]
    assert data["status"] == "draft"
    assert data["parent_id"] == iid
    assert data["revision_no"] == 2
    # 短期目标状态在新一轮重置
    stg = data["long_term_goals"][0]["short_term_goals"][0]
    assert stg["status"] == "not_started"
    # 原 IEP 仍存在且保持 locked
    original_again = await client.get(f"{BASE_IEPS}/{iid}", headers=auth_headers)
    assert original_again.json()["data"]["status"] == "locked"


async def test_delete_iep(client, auth_headers, student_id):
    iid = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]["id"]
    resp = await client.delete(f"{BASE_IEPS}/{iid}", headers=auth_headers)
    assert resp.status_code == 204
    assert (await client.get(f"{BASE_IEPS}/{iid}", headers=auth_headers)).status_code == 404


async def test_iep_requires_auth(client):
    resp = await client.get(BASE_IEPS)
    assert resp.status_code == 401


async def test_export_iep_pdf(client, auth_headers, student_id):
    iid = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]["id"]
    resp = await client.get(f"{BASE_IEPS}/{iid}/export", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"
    assert len(resp.content) > 200


async def test_compare_iep_versions(client, auth_headers, student_id):
    # 第一学期：建 IEP → 提交 → 锁定
    first = (
        await client.post(BASE_IEPS, headers=auth_headers, json=_full_iep_payload(student_id))
    ).json()["data"]
    first_id = first["id"]
    await client.post(f"{BASE_IEPS}/{first_id}/submit", headers=auth_headers)
    await client.post(f"{BASE_IEPS}/{first_id}/lock", headers=auth_headers)

    # 修订生成新一轮草稿（parent 指向第一版）
    revised = (await client.post(f"{BASE_IEPS}/{first_id}/revise", headers=auth_headers)).json()[
        "data"
    ]

    resp = await client.get(f"{BASE_IEPS}/{revised['id']}/compare", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["previous_term"] == "2026-2027第一学期"
    assert len(data["previous"]) == 1
    assert data["previous"][0]["overall_level"] == 2
    assert len(data["current"]) == 1
    assert data["current"][0]["overall_level"] == 2

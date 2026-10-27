"""IEP AI 文书服务与端点测试（LLM 调用全部 mock）。"""

import json
from datetime import date

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.exceptions import BadRequestException
from app.models.iep import IEPGenerationLog
from app.models.student import Gender, Student
from app.schemas.iep import (
    DomainAssessmentCreate,
    IEPCreate,
    LongTermGoalCreate,
    ShortTermGoalCreate,
    SnapshotItemCreate,
)
from app.services.ai_config import AIConfigService
from app.services.iep import IEPService
from app.services.iep_ai import (
    IEP_DRAFT_GOALS_PROMPT,
    IEP_DRAFT_PROFILE_PROMPT,
    IEPAIService,
)

BASE_IEPS = "/api/v1/ieps"

_CFG = {
    "provider": "zhipu",
    "api_key": "test-key",
    "api_base": "https://example.com/v1",
    "model": "test-model",
}

_DRAFT_JSON = json.dumps(
    {
        "domain_summaries": [{"domain": "感知", "current_level": "需大量辅助", "priority": "high"}],
        "long_term_goals": [
            {
                "domain": "感知",
                "goal": "提升视觉追踪",
                "short_term_goals": [
                    {
                        "condition": "教师提示下",
                        "behavior": "追视移动玩具",
                        "criterion": "连续3次",
                        "support_level": 2,
                        "teaching_methods": ["示范"],
                        "materials": ["玩具"],
                    }
                ],
            }
        ],
        "supports": {"teaching": ["视觉提示"], "rehab": [], "family": []},
        "evaluation_plan": "每周观察记录",
        "missing_info": ["需补充家庭情况"],
        "ai_disclaimer": "AI 草稿",
    },
    ensure_ascii=False,
)

_REPORT_JSON = json.dumps(
    {
        "overview": "本学期学生在视觉追踪上有进步",
        "domain_progress": [
            {
                "domain": "感知",
                "start_level": 1,
                "end_level": 2,
                "description": "追视时间延长",
                "evidence_refs": ["stg-1"],
            }
        ],
        "goals_summary": {
            "achieved": ["stg-1"],
            "in_progress": [],
            "next_term_focus": ["继续支持精细动作"],
        },
        "highlights": ["能追视玩具5秒"],
        "family_suggestions": ["在家用发光玩具练习追视"],
        "needs_review": [],
        "ai_disclaimer": "AI 报告草稿",
    },
    ensure_ascii=False,
)


@pytest_asyncio.fixture
async def iep_with_content(db_session, test_user):
    student = Student(
        user_id=test_user.id,
        name="小明",
        gender=Gender.MALE,
        birth_date=date(2018, 1, 1),
        grade="三年级",
        class_name="一班",
    )
    db_session.add(student)
    await db_session.commit()

    iep = await IEPService(db_session).create(
        test_user.id,
        IEPCreate(
            student_id=student.id,
            term="2026第一学期",
            student_profile="基本情况",
            domain_assessments=[
                DomainAssessmentCreate(
                    domain_code="perception",
                    domain_name="感知",
                    overall_level=1,
                    items=[SnapshotItemCreate(item_name="注视", level=1)],
                )
            ],
            long_term_goals=[
                LongTermGoalCreate(
                    domain_code="perception",
                    domain_name="感知",
                    goal="提升追踪",
                    short_term_goals=[
                        ShortTermGoalCreate(behavior="追视", criterion="3次", support_level=2)
                    ],
                )
            ],
        ),
    )
    return iep


def _patch_cfg(monkeypatch, cfg):
    async def fake_cfg(db, user_id):
        return cfg

    monkeypatch.setattr(AIConfigService, "get_effective_config", staticmethod(fake_cfg))


def _patch_chat(monkeypatch, content, model="test-model"):
    async def fake_chat(self, cfg, system_prompt, user_content):
        return content, model

    monkeypatch.setattr(IEPAIService, "_chat", fake_chat)


# ---------------- service 层 ----------------


async def test_generate_draft_success(db_session, test_user, iep_with_content, monkeypatch):
    _patch_cfg(monkeypatch, _CFG)
    _patch_chat(monkeypatch, _DRAFT_JSON)

    parsed, log_id = await IEPAIService(db_session).generate_draft(
        iep_with_content.id, test_user.id
    )
    assert parsed["missing_info"] == ["需补充家庭情况"]
    assert len(parsed["long_term_goals"]) == 1

    result = await db_session.execute(
        select(IEPGenerationLog).where(IEPGenerationLog.iep_id == iep_with_content.id)
    )
    logs = result.scalars().all()
    assert len(logs) == 1
    assert logs[0].kind == "draft"
    assert logs[0].model == "test-model"
    assert logs[0].raw_output


async def test_generate_draft_no_config(db_session, test_user, iep_with_content, monkeypatch):
    _patch_cfg(monkeypatch, None)
    with pytest.raises(BadRequestException):
        await IEPAIService(db_session).generate_draft(iep_with_content.id, test_user.id)


async def test_generate_draft_locked_rejected(db_session, test_user, iep_with_content, monkeypatch):
    svc = IEPService(db_session)
    await svc.submit(iep_with_content.id, test_user.id)
    await svc.lock(iep_with_content.id, test_user.id)

    _patch_cfg(monkeypatch, _CFG)
    _patch_chat(monkeypatch, _DRAFT_JSON)
    with pytest.raises(BadRequestException):
        await IEPAIService(db_session).generate_draft(iep_with_content.id, test_user.id)


async def test_generate_draft_bad_json(db_session, test_user, iep_with_content, monkeypatch):
    _patch_cfg(monkeypatch, _CFG)
    _patch_chat(monkeypatch, "this is not json")
    with pytest.raises(BadRequestException):
        await IEPAIService(db_session).generate_draft(iep_with_content.id, test_user.id)


async def test_generate_draft_section_uses_matching_prompt(
    db_session, test_user, iep_with_content, monkeypatch
):
    """按页生成时应使用该页专属提示词，且只返回该页字段。"""
    _patch_cfg(monkeypatch, _CFG)
    prompts = []

    async def fake_chat(self, cfg, system_prompt, user_content):
        prompts.append(system_prompt)
        return (
            json.dumps(
                {
                    "student_profile": "喜欢拼图",
                    "domain_summaries": [{"domain": "感知", "current_level": "需少量辅助"}],
                    "missing_info": [],
                },
                ensure_ascii=False,
            ),
            "test-model",
        )

    monkeypatch.setattr(IEPAIService, "_chat", fake_chat)

    parsed, _ = await IEPAIService(db_session).generate_draft(
        iep_with_content.id, test_user.id, section="profile"
    )
    assert prompts == [IEP_DRAFT_PROFILE_PROMPT]
    assert "long_term_goals" in IEP_DRAFT_GOALS_PROMPT
    assert "long_term_goals" not in IEP_DRAFT_PROFILE_PROMPT
    assert parsed["student_profile"] == "喜欢拼图"
    assert parsed["domain_summaries"][0]["current_level"] == "需少量辅助"


async def test_generate_draft_invalid_section(db_session, test_user, iep_with_content, monkeypatch):
    _patch_cfg(monkeypatch, _CFG)
    with pytest.raises(BadRequestException):
        await IEPAIService(db_session).generate_draft(
            iep_with_content.id, test_user.id, section="unknown"
        )


async def test_generate_draft_normalizes_object_items(
    db_session, test_user, iep_with_content, monkeypatch
):
    """AI 把列表项写成对象时，服务层应压成字符串，避免前端渲染对象崩溃。"""
    _patch_cfg(monkeypatch, _CFG)
    _patch_chat(
        monkeypatch,
        json.dumps(
            {
                "long_term_goals": [
                    {
                        "domain": "感知",
                        "goal": {"description": "提升追踪", "evidence_refs": ["stg-1"]},
                        "short_term_goals": [
                            {
                                "behavior": "追视",
                                "teaching_methods": [{"description": "示范"}],
                                "materials": ["玩具"],
                            }
                        ],
                    }
                ],
                "missing_info": [{"description": "缺家庭情况"}],
            },
            ensure_ascii=False,
        ),
    )

    parsed, _ = await IEPAIService(db_session).generate_draft(iep_with_content.id, test_user.id)
    assert parsed["missing_info"] == ["缺家庭情况"]
    goal = parsed["long_term_goals"][0]
    assert goal["goal"] == "提升追踪 （依据：stg-1）"
    stg = goal["short_term_goals"][0]
    assert stg["teaching_methods"] == ["示范"]
    assert stg["materials"] == ["玩具"]


async def test_generate_report_normalizes_object_items(
    db_session, test_user, iep_with_content, monkeypatch
):
    """成长报告的列表字段混入 {description, evidence_refs} 对象时也应被压平。"""
    _patch_cfg(monkeypatch, _CFG)
    _patch_chat(
        monkeypatch,
        json.dumps(
            {
                "overview": "有进步",
                "domain_progress": [
                    {
                        "domain": "感知",
                        "start_level": 1,
                        "end_level": 2,
                        "description": "追视延长",
                        "evidence_refs": ["stg-1"],
                    }
                ],
                "goals_summary": {
                    "achieved": [{"description": "追视达成", "evidence_refs": ["stg-1"]}],
                    "in_progress": [],
                },
                "highlights": [{"description": "能追视5秒", "evidence_refs": ["obs-1"]}],
                "family_suggestions": [{"description": "家里练追视"}],
                "needs_review": [],
            },
            ensure_ascii=False,
        ),
    )

    parsed, _ = await IEPAIService(db_session).generate_report(iep_with_content.id, test_user.id)
    assert parsed["highlights"] == ["能追视5秒 （依据：obs-1）"]
    assert parsed["family_suggestions"] == ["家里练追视"]
    assert parsed["goals_summary"]["achieved"] == ["追视达成 （依据：stg-1）"]
    assert parsed["domain_progress"][0]["evidence_refs"] == ["stg-1"]


async def test_generate_report_success_even_when_locked(
    db_session, test_user, iep_with_content, monkeypatch
):
    svc = IEPService(db_session)
    await svc.submit(iep_with_content.id, test_user.id)
    await svc.lock(iep_with_content.id, test_user.id)

    _patch_cfg(monkeypatch, _CFG)
    _patch_chat(monkeypatch, _REPORT_JSON)

    parsed, log_id = await IEPAIService(db_session).generate_report(
        iep_with_content.id, test_user.id
    )
    assert parsed["domain_progress"][0]["evidence_refs"] == ["stg-1"]
    assert parsed["family_suggestions"]

    result = await db_session.execute(
        select(IEPGenerationLog).where(IEPGenerationLog.iep_id == iep_with_content.id)
    )
    kinds = [log.kind for log in result.scalars().all()]
    assert "report" in kinds


async def test_report_context_omits_technical_ids(db_session, iep_with_content):
    """喂给 AI 的报告上下文不应出现目标内部 ID 等技术标识。"""
    context = IEPAIService(db_session)._report_context(iep_with_content)
    assert "目标ID" not in context
    assert "stg-" not in context


# ---------------- API 端点 ----------------


async def test_generate_draft_endpoint(client, auth_headers, monkeypatch):
    sections = []

    async def fake_gen(self, iep_id, user_id, section="all"):
        sections.append(section)
        return {"long_term_goals": [], "missing_info": []}, "log1"

    monkeypatch.setattr(IEPAIService, "generate_draft", fake_gen)
    resp = await client.post(f"{BASE_IEPS}/any-id/generate-draft", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["generation_log_id"] == "log1"
    assert sections == ["all"]

    resp = await client.post(
        f"{BASE_IEPS}/any-id/generate-draft",
        headers=auth_headers,
        json={"section": "profile"},
    )
    assert resp.status_code == 200
    assert sections == ["all", "profile"]


async def test_generate_report_endpoint(client, auth_headers, monkeypatch):
    async def fake_report(self, iep_id, user_id):
        return {"overview": "概述", "needs_review": []}, "log2"

    monkeypatch.setattr(IEPAIService, "generate_report", fake_report)
    resp = await client.post(f"{BASE_IEPS}/any-id/generate-report", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["generation_log_id"] == "log2"

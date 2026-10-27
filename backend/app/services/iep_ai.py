"""
IEP AI 文书服务：AI 起草 IEP 初稿、AI 生成学期成长报告。

设计原则（人在回路）：
- AI 只产出"草稿"，不直接落为 IEP 正式内容，由前端教师逐条采纳/修改/忽略；
- 全程留痕（模型、输入快照、原始输出）落 iep_generation_logs；
- 信息不足要求补充而非编造；AI 不出医学诊断、量表分数；
- 已定稿（LOCKED）的 IEP 不能再生成"初稿"（避免覆盖定稿），需先修订；
  成长报告为只读衍生文书，允许在待审定/已定稿状态生成。
"""

import json
import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models.iep import IEPGenerationLog, IEPStatus
from app.services import ai_client as ai_client_module
from app.services.ai_client import AIServiceError
from app.services.ai_config import AIConfigService
from app.services.iep import IEPService

logger = get_logger(__name__)


# ============================================================
# 产品内 System Prompt（铁律，不得删除）
# ============================================================

IEP_DRAFT_SYSTEM_PROMPT = """你是一名资深特殊教育（培智）个别化教育计划（IEP）教研助手，服务一线特教教师。
唯一任务：根据教师【已填写确认】的发展领域评估，为一名学生起草本学期 IEP 目标与措施草稿，供教师逐条审定修改。

【绝对铁律】
1. 只用教师提供的信息。严禁编造/推测：医学诊断、障碍等级与名称、病因病史、任何量表分数、家庭隐私。
   信息不足则该字段留空，并在 missing_info 说明需补充什么。
2. 你不做评估、不贴标签、不下定性结论；只把教师已有评估转写为可教学、可测量的目标。
3. 短期目标必须可测量，统一"条件+可观察行为+达成标准"，标注辅助等级（0不能完成/1大量辅助/2少量辅助/3独立完成）。
   示例："在教师口头提示下（条件），完成3步洗手流程（行为），连续3天每步正确率≥80%（标准），辅助等级2"。
4. 目标针对评估评级较低（0-1级）且优先级高的领域，按领域分组；每个长期目标下 2-4 个短期目标，由易到难分层，不跨领域堆砌。
5. 措施具体可执行（教学策略、辅助层级、教具、家庭配合），禁止"加强训练、提高能力"类空话。
6. 评价方式可操作：写明评价情境、频次、达成判定（连续次数/正确率/独立程度）。
7. 语气专业克制、尊重个体差异，不用"正常/不正常、差生"等评判性表述。
8. 只输出规定 JSON，不输出 JSON 以外解释；一切为草稿，最终由教师审定负责。

【输出 JSON】
{
  "domain_summaries": [{"domain":"领域","current_level":"基于评估的客观描述，不诊断",
    "priority":"high|medium|low"}],
  "long_term_goals": [{"domain":"领域","goal":"长期目标",
    "short_term_goals":[{"condition":"条件","behavior":"行为","criterion":"标准","support_level":0,
      "teaching_methods":["策略"],"materials":["教具"],"evaluation":"评价方式与频次"}]}],
  "supports": {"teaching":["教学措施"],"rehab":["康复配合，如教师提供"],"family":["家庭配合"]},
  "evaluation_plan":"本学期评价安排",
  "missing_info":["还需教师补充的信息"],
  "ai_disclaimer":"本内容由 AI 依据教师评估生成，仅供草稿参考，需教师审定签字后生效。"
}"""


# 按 IEP 编辑页的三个步骤分别生成，避免「一次生成把所有内容混在一起」
_DRAFT_SECTION_RULES = """
【绝对铁律】
1. 只用教师提供的信息。严禁编造/推测：医学诊断、障碍等级与名称、病因病史、任何量表分数、家庭隐私。
   信息不足则该字段留空，并在 missing_info 说明需补充什么。
2. 你不做评估、不贴标签、不下定性结论；只把教师已有评估转写为客观、可教学的表述。
3. 语气专业克制、尊重个体差异，不用"正常/不正常、差生"等评判性表述。
4. 只输出规定 JSON，不输出 JSON 以外解释；一切为草稿，最终由教师审定负责。
"""

IEP_DRAFT_PROFILE_PROMPT = (
    """你是一名资深特殊教育（培智）个别化教育计划（IEP）教研助手，服务一线特教教师。
唯一任务：根据教师【已填写确认】的发展领域评估，为该学生起草「学生基本情况」与各发展领域的「评估小结」文字，供教师审定修改。
不要生成任何目标、支持措施或评价方式。
"""
    + _DRAFT_SECTION_RULES
    + """
【输出 JSON】
{
  "student_profile": "学生基本情况（兴趣、优势、关注点、沟通与行为特点；只描述教师已提供的信息，不写医学诊断结论）",
  "domain_summaries": [{"domain":"领域","current_level":"基于教师评估的客观描述",
    "priority":"high|medium|low"}],
  "missing_info":["还需教师补充的信息"],
  "ai_disclaimer":"本内容由 AI 依据教师评估生成，仅供草稿参考，需教师审定签字后生效。"
}"""
)

IEP_DRAFT_GOALS_PROMPT = (
    """你是一名资深特殊教育（培智）个别化教育计划（IEP）教研助手，服务一线特教教师。
唯一任务：根据教师【已填写确认】的发展领域评估，为该学生起草本学期的长短期目标，供教师逐条审定修改。
不要生成学生基本情况、支持措施或评价方式。
"""
    + _DRAFT_SECTION_RULES
    + """
【补充要求】
- 短期目标必须可测量，统一"条件+可观察行为+达成标准"，标注辅助等级（0不能完成/1大量辅助/2少量辅助/3独立完成）。
  示例："在教师口头提示下（条件），完成3步洗手流程（行为），连续3天每步正确率≥80%（标准），辅助等级2"。
- 目标针对评估评级较低（0-1级）且优先级高的领域，按领域分组；每个长期目标下 2-4 个短期目标，由易到难分层，不跨领域堆砌。
- 评价方式可操作：写明评价情境、频次、达成判定（连续次数/正确率/独立程度）。

【输出 JSON】
{
  "long_term_goals": [{"domain":"领域","goal":"长期目标",
    "short_term_goals":[{"condition":"条件","behavior":"行为","criterion":"标准","support_level":0,
      "teaching_methods":["策略"],"materials":["教具"],"evaluation":"评价方式与频次"}]}],
  "missing_info":["还需教师补充的信息"],
  "ai_disclaimer":"本内容由 AI 依据教师评估生成，仅供草稿参考，需教师审定签字后生效。"
}"""
)

IEP_DRAFT_SUPPORTS_PROMPT = (
    """你是一名资深特殊教育（培智）个别化教育计划（IEP）教研助手，服务一线特教教师。
唯一任务：根据教师【已填写确认】的发展领域评估与本学期目标，为该学生起草「支持措施」与「评估/评价方式」，供教师审定修改。
不要生成学生基本情况或具体目标。
"""
    + _DRAFT_SECTION_RULES
    + """
【补充要求】
- 措施具体可执行（教学策略、辅助层级、教具、家庭配合），禁止"加强训练、提高能力"类空话。
- 评价方式可操作：写明评价情境、频次、达成判定（连续次数/正确率/独立程度）。

【输出 JSON】
{
  "supports": {"teaching":["教学措施"],"rehab":["康复配合，如教师提供"],"family":["家庭配合"]},
  "evaluation_plan":"本学期评价安排",
  "missing_info":["还需教师补充的信息"],
  "ai_disclaimer":"本内容由 AI 依据教师评估生成，仅供草稿参考，需教师审定签字后生效。"
}"""
)

DRAFT_SECTION_PROMPTS = {
    "profile": IEP_DRAFT_PROFILE_PROMPT,
    "goals": IEP_DRAFT_GOALS_PROMPT,
    "supports": IEP_DRAFT_SUPPORTS_PROMPT,
}
DRAFT_SECTIONS = ("all", "profile", "goals", "supports")


GROWTH_REPORT_SYSTEM_PROMPT = """你是特教教师的助手，为一名培智学生撰写本学期成长报告草稿，教师审定后发给家长。
【铁律】
1. 所有"进步/变化/表现"结论只能基于教师提供的评估快照、目标达成状态和观察记录；每条结论在 evidence_refs 给出依据。
   依据只写家长看得懂的中文表述（目标的中文名称、领域名称或观察日期/情境）；严禁输出任何内部 ID、编号、字段名、代码
   或技术标识（如 stg-1、obs-1、UUID、JSON 键名、英文变量名）。无依据的内容写入 needs_review，不得写成结论。
2. 严禁编造诊断、分数、事件、引语；不夸大不贬低；不用"正常/异常、聪明/笨"等标签。
3. 用家长能理解、具体、鼓励性的语言描述孩子"能做什么"，用具体行为事例说明进步。
4. 未达成目标表述为"下学期继续支持……"，并给家庭 2-3 条可操作建议。
5. 对比期初/期末只陈述评级与行为变化事实，不推断医学原因。
6. 只输出规定 JSON；一切为草稿，教师审定负责。
【输出 JSON】
{
  "overview":"总体概述（200字内）",
  "domain_progress":[{"domain":"领域","start_level":0,"end_level":0,"description":"行为变化","evidence_refs":["依据的中文表述（不含ID/编号）"]}],
  "goals_summary":{"achieved":["已达成目标的中文表述（不含ID/编号）"],"in_progress":["进行中"],"next_term_focus":["下学期重点"]},
  "highlights":["2-3个典型事例，须有 evidence_refs（中文表述）"],
  "family_suggestions":["2-3条家庭配合"],
  "needs_review":["缺证据、需教师核实"],
  "ai_disclaimer":"本报告由 AI 依据本学期记录生成草稿，经教师审定后提供给家长。"
}"""


_LEVEL_TEXT = {
    0: "0 不能完成",
    1: "1 大量辅助",
    2: "2 少量辅助",
    3: "3 独立完成",
}
_GOAL_STATUS_TEXT = {
    "not_started": "未开始",
    "in_progress": "进行中",
    "achieved": "已达成",
    "maintain": "维持",
}


class IEPAIService:
    """IEP AI 文书生成服务。"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------------- 内部工具 ----------------

    @staticmethod
    def _level(value: Any) -> str:
        if value is None:
            return "未评估（不计为0）"
        return _LEVEL_TEXT.get(value, str(value))

    @staticmethod
    def _parse_json(content: str) -> dict:
        text = (content or "").strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
            text = re.sub(r"```$", "", text).strip()
        try:
            parsed = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            raise BadRequestException("AI 返回内容无法解析为 JSON，请重试或改用手工填写")
        if not isinstance(parsed, dict):
            raise BadRequestException("AI 返回结构不正确，请重试")
        return parsed

    @staticmethod
    def _as_text(value: Any) -> str:
        """把 AI 可能返回的富文本片段（字符串，或 {description, evidence_refs} 这类对象）压成可读字符串。"""
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, (int, float, bool)):
            return str(value)
        if isinstance(value, list):
            parts = [IEPAIService._as_text(v) for v in value]
            return "；".join(p for p in parts if p)
        if isinstance(value, dict):
            main = ""
            for key in ("description", "text", "content", "summary", "goal", "title"):
                candidate = value.get(key)
                if isinstance(candidate, str) and candidate.strip():
                    main = candidate.strip()
                    break
            refs = value.get("evidence_refs")
            ref_texts = IEPAIService._text_list(refs)
            suffix = f"（依据：{'、'.join(ref_texts)}）" if ref_texts else ""
            return " ".join(p for p in (main, suffix) if p)
        return str(value)

    @staticmethod
    def _text_list(value: Any) -> list[str]:
        """把「字符串数组 / 单值 / 非法值」统一成字符串数组，保证前端不会渲染到对象。"""
        if value is None:
            return []
        if isinstance(value, list):
            texts = [IEPAIService._as_text(v) for v in value]
            return [t for t in texts if t]
        text = IEPAIService._as_text(value)
        return [text] if text else []

    @classmethod
    def _normalize_report(cls, parsed: dict) -> dict:
        """成长报告结构兜底：AI 不保证严格贴合模板，这里把列表字段收敛为字符串列表。"""
        for key in ("highlights", "family_suggestions", "needs_review"):
            if key in parsed:
                parsed[key] = cls._text_list(parsed[key])
        goals = parsed.get("goals_summary")
        if isinstance(goals, dict):
            for key in ("achieved", "in_progress", "next_term_focus"):
                if key in goals:
                    goals[key] = cls._text_list(goals[key])
        progress = parsed.get("domain_progress")
        if isinstance(progress, list):
            normalized: list[Any] = []
            for item in progress:
                if isinstance(item, dict):
                    item = {**item}
                    item["domain"] = cls._as_text(item.get("domain"))
                    item["description"] = cls._as_text(item.get("description"))
                    item["evidence_refs"] = cls._text_list(item.get("evidence_refs"))
                    normalized.append(item)
                elif isinstance(item, str):
                    normalized.append({"domain": "", "description": item, "evidence_refs": []})
            parsed["domain_progress"] = normalized
        return parsed

    @classmethod
    def _normalize_draft(cls, parsed: dict) -> dict:
        """初稿结构兜底：同上，避免把对象直接交给前端渲染。"""
        if "missing_info" in parsed:
            parsed["missing_info"] = cls._text_list(parsed["missing_info"])
        summaries = parsed.get("domain_summaries")
        if isinstance(summaries, list):
            parsed["domain_summaries"] = [
                (
                    {
                        **s,
                        "domain": cls._as_text(s.get("domain")),
                        "current_level": cls._as_text(s.get("current_level")),
                        "priority": cls._as_text(s.get("priority")),
                    }
                    if isinstance(s, dict)
                    else s
                )
                for s in summaries
            ]
        goals = parsed.get("long_term_goals")
        if isinstance(goals, list):
            parsed["long_term_goals"] = [
                cls._normalize_long_term_goal(g) if isinstance(g, dict) else g for g in goals
            ]
        supports = parsed.get("supports")
        if isinstance(supports, dict):
            parsed["supports"] = {key: cls._text_list(value) for key, value in supports.items()}
        return parsed

    @classmethod
    def _normalize_long_term_goal(cls, goal: dict) -> dict:
        normalized = {**goal}
        normalized["domain"] = cls._as_text(goal.get("domain"))
        normalized["goal"] = cls._as_text(goal.get("goal"))
        shorts = goal.get("short_term_goals")
        if isinstance(shorts, list):
            normalized["short_term_goals"] = [
                (
                    {
                        **s,
                        "condition": cls._as_text(s.get("condition")),
                        "behavior": cls._as_text(s.get("behavior")),
                        "criterion": cls._as_text(s.get("criterion")),
                        "teaching_methods": cls._text_list(s.get("teaching_methods")),
                        "materials": cls._text_list(s.get("materials")),
                        "evaluation": cls._as_text(s.get("evaluation")),
                    }
                    if isinstance(s, dict)
                    else s
                )
                for s in shorts
            ]
        return normalized

    async def _chat(self, cfg: dict, system_prompt: str, user_content: str) -> tuple[str, str]:
        headers = {
            "Authorization": f"Bearer {cfg.get('api_key', '')}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": cfg["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "stream": False,
            "temperature": 0.2,
        }
        try:
            async with ai_client_module.build_client() as client:
                response = await client.post(
                    f"{cfg['api_base']}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                ai_client_module.raise_for_status(response, cfg["api_base"])
        except AIServiceError as exc:
            logger.error("IEP AI 调用失败: %s", exc.log_detail)
            raise BadRequestException(f"{exc.user_message} 若反复失败，可改用手工填写。")
        except Exception as exc:  # noqa: BLE001 - 兜底，避免接口返回 500
            described = ai_client_module.log_and_describe(exc, cfg["api_base"], "iep_ai")
            raise BadRequestException(f"{described.user_message} 若反复失败，可改用手工填写。")

        try:
            data = response.json()
        except ValueError:
            logger.error("IEP AI 返回非 JSON 内容: %s", (response.text or "")[:300])
            raise BadRequestException(
                "AI 服务返回的内容不是合法 JSON，可能是服务地址填写成了网页地址。"
                "请到「设置 → AI 助手」核对服务地址，或改用手工填写。"
            )

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise BadRequestException(
                "AI 服务返回的内容格式与预期不符，本次生成未成功。可稍后重试，或改用手工填写。"
            )
        model = data.get("model") or cfg["model"]
        return content, model

    async def _record_log(self, iep_id: str, kind: str, model: str, snapshot: str, raw: str) -> str:
        log = IEPGenerationLog(
            iep_id=iep_id,
            kind=kind,
            model=model,
            template_snapshot=snapshot,
            raw_output=raw,
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log.id

    # ---------------- 上下文组装 ----------------

    def _assessment_context(self, iep: Any) -> str:
        name = iep.student.name if getattr(iep, "student", None) else "（未知）"
        lines = [
            f"学生：{name}",
            f"学期：{iep.term}",
            f"学生基本情况：{iep.student_profile or '（教师未填写）'}",
            "",
            "教师已确认的发展领域评估：",
        ]
        if not iep.domain_assessments:
            lines.append("（教师尚未填写任何领域评估，请据此在 missing_info 中提示需要先完成评估）")
        for d in iep.domain_assessments:
            lines.append(f"\n【{d.domain_name}】领域整体：{self._level(d.overall_level)}")
            for it in d.items:
                note = f"（{it.note}）" if it.note else ""
                lines.append(f"  - {it.item_name}：{self._level(it.level)}{note}")
        return "\n".join(lines)

    def _report_context(self, iep: Any) -> str:
        lines = [self._assessment_context(iep), "", "本学期目标及达成状态："]
        if not iep.long_term_goals:
            lines.append("（暂无目标记录）")
        for g in iep.long_term_goals:
            lines.append(f"\n长期目标（{g.domain_name or '未分领域'}）：{g.goal}")
            for s in g.short_term_goals:
                status = _GOAL_STATUS_TEXT.get(s.status, s.status)
                lines.append(
                    f"  · [{status}] {s.condition or ''}{s.behavior}"
                    f"（标准：{s.criterion or '未写'}）"
                )
        return "\n".join(lines)

    # ---------------- 对外能力 ----------------

    async def generate_draft(
        self, iep_id: str, user_id: str, section: str = "all"
    ) -> tuple[dict, str]:
        """
        生成 IEP 初稿。

        section 对应编辑页三个步骤，只生成该页需要的内容：
        - profile：学生基本情况 + 各领域评估小结（第 1 页）
        - goals：长短期目标（第 2 页）
        - supports：支持措施 + 评价方式（第 3 页）
        - all：一次生成全部（默认，保留旧行为）
        """
        if section not in DRAFT_SECTIONS:
            raise BadRequestException(f"不支持的生成范围：{section}")

        cfg = await AIConfigService.get_effective_config(self.db, user_id)
        if not cfg:
            raise BadRequestException(
                "尚未配置 AI 服务：请先在「系统设置」配置 API 密钥，或手工填写 IEP"
            )

        iep = await IEPService(self.db).get_by_id(iep_id, user_id)
        if not iep:
            raise NotFoundException("IEP", iep_id)
        if iep.status == IEPStatus.LOCKED:
            raise BadRequestException("该 IEP 已定稿，不能再生成 AI 初稿；请先创建修订版本")

        context = self._assessment_context(iep)
        prompt = IEP_DRAFT_SYSTEM_PROMPT if section == "all" else DRAFT_SECTION_PROMPTS[section]
        content, model = await self._chat(cfg, prompt, context)
        parsed = self._normalize_draft(self._parse_json(content))
        log_id = await self._record_log(iep.id, "draft", model, context, content)
        return parsed, log_id

    async def generate_report(self, iep_id: str, user_id: str) -> tuple[dict, str]:
        cfg = await AIConfigService.get_effective_config(self.db, user_id)
        if not cfg:
            raise BadRequestException("尚未配置 AI 服务：请先在「系统设置」配置 API 密钥")

        iep = await IEPService(self.db).get_by_id(iep_id, user_id)
        if not iep:
            raise NotFoundException("IEP", iep_id)

        context = self._report_context(iep)
        content, model = await self._chat(cfg, GROWTH_REPORT_SYSTEM_PROMPT, context)
        parsed = self._normalize_report(self._parse_json(content))
        log_id = await self._record_log(iep.id, "report", model, context, content)
        return parsed, log_id

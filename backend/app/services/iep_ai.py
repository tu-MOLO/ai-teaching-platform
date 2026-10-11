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

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models.iep import IEPGenerationLog, IEPStatus
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


GROWTH_REPORT_SYSTEM_PROMPT = """你是特教教师的助手，为一名培智学生撰写本学期成长报告草稿，教师审定后发给家长。
【铁律】
1. 所有"进步/变化/表现"结论只能基于教师提供的评估快照、目标达成状态和观察记录；每条结论在 evidence_refs 给出依据（id或日期）。
   无依据的内容写入 needs_review，不得写成结论。
2. 严禁编造诊断、分数、事件、引语；不夸大不贬低；不用"正常/异常、聪明/笨"等标签。
3. 用家长能理解、具体、鼓励性的语言描述孩子"能做什么"，用具体行为事例说明进步。
4. 未达成目标表述为"下学期继续支持……"，并给家庭 2-3 条可操作建议。
5. 对比期初/期末只陈述评级与行为变化事实，不推断医学原因。
6. 只输出规定 JSON；一切为草稿，教师审定负责。
【输出 JSON】
{
  "overview":"总体概述（200字内）",
  "domain_progress":[{"domain":"领域","start_level":0,"end_level":0,"description":"行为变化","evidence_refs":["id或日期"]}],
  "goals_summary":{"achieved":["已达成，引用id"],"in_progress":["进行中"],"next_term_focus":["下学期重点"]},
  "highlights":["2-3个典型事例，须有 evidence_refs"],
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
            async with httpx.AsyncClient(timeout=settings.AI_CONNECT_TIMEOUT) as client:
                response = await client.post(
                    f"{cfg['api_base']}/chat/completions",
                    headers=headers,
                    json=payload,
                )
        except httpx.TimeoutException:
            raise BadRequestException("AI 服务请求超时，请稍后重试或手工填写")
        except httpx.HTTPError as exc:
            logger.error(f"IEP AI request failed: {exc}")
            raise BadRequestException("无法连接 AI 服务，请检查网络或配置")

        if response.status_code != 200:
            logger.error(f"IEP AI HTTP {response.status_code}: {response.text[:300]}")
            raise BadRequestException(
                f"AI 服务返回异常（HTTP {response.status_code}），请检查配置或稍后重试"
            )

        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise BadRequestException("AI 返回内容格式不正确，请重试")
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
                    f"（标准：{s.criterion or '未写'}；目标ID：{s.id}）"
                )
        return "\n".join(lines)

    # ---------------- 对外能力 ----------------

    async def generate_draft(self, iep_id: str, user_id: str) -> tuple[dict, str]:
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
        content, model = await self._chat(cfg, IEP_DRAFT_SYSTEM_PROMPT, context)
        parsed = self._parse_json(content)
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
        parsed = self._parse_json(content)
        log_id = await self._record_log(iep.id, "report", model, context, content)
        return parsed, log_id

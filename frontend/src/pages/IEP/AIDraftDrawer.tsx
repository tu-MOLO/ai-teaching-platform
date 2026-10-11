import { useState } from 'react';
import {
  Drawer,
  Card,
  Tag,
  Button,
  Space,
  Alert,
  Input,
  Divider,
} from 'antd';
import type {
  AIShortTermGoal,
  IEPDraftAI,
} from '../../services/iep';

type Decision = 'pending' | 'accepted' | 'ignored';

export interface AppliedGoal {
  domain: string;
  goal: string;
  shortTermGoals: Array<{
    condition: string;
    behavior: string;
    criterion: string;
    support_level: number;
    teaching_methods: string[];
    materials: string[];
  }>;
}

interface Props {
  open: boolean;
  draft: IEPDraftAI | null;
  onClose: () => void;
  onApply: (
    goals: AppliedGoal[],
    extras: {
      evaluationPlan: string;
      supports: NonNullable<IEPDraftAI['supports']>;
    } | null
  ) => void;
  onHandledChange: (allHandled: boolean) => void;
}

const LEVEL_TAG: Record<number, string> = {
  0: '0 不能完成',
  1: '1 大量辅助',
  2: '2 少量辅助',
  3: '3 独立完成',
};

const DECISION_TAG: Record<Decision, { color: string; text: string }> = {
  pending: { color: 'default', text: '待处理' },
  accepted: { color: 'success', text: '已采纳' },
  ignored: { color: 'error', text: '已忽略' },
};

const AIDraftDrawer = ({
  open,
  draft,
  onClose,
  onApply,
  onHandledChange,
}: Props) => {
  const goals = draft?.long_term_goals ?? [];
  const [goalTexts, setGoalTexts] = useState<Record<number, string>>({});
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [extrasDecision, setExtrasDecision] = useState<Decision>('pending');
  const [evalText, setEvalText] = useState(draft?.evaluation_plan ?? '');

  const decisionOf = (i: number): Decision => decisions[i] ?? 'pending';

  const emitHandled = (
    dec: Record<number, Decision>,
    extras: Decision
  ) => {
    const goalsAll =
      goals.length > 0 &&
      goals.every((_, i) => (dec[i] ?? 'pending') !== 'pending');
    onHandledChange(goalsAll && extras !== 'pending');
  };

  const setGoalDecision = (i: number, d: Decision) => {
    const next = { ...decisions, [i]: d };
    setDecisions(next);
    emitHandled(next, extrasDecision);
  };

  const setExtras = (d: Decision) => {
    setExtrasDecision(d);
    emitHandled(decisions, d);
  };

  const acceptedGoals = goals.filter(
    (_, i) => decisionOf(i) === 'accepted'
  ).length;
  const pendingGoals = goals.filter(
    (_, i) => decisionOf(i) === 'pending'
  ).length;

  const handleApply = () => {
    const applied: AppliedGoal[] = [];
    goals.forEach((g, i) => {
      if (decisionOf(i) !== 'accepted') return;
      applied.push({
        domain: g.domain ?? '',
        goal: goalTexts[i] ?? g.goal ?? '',
        shortTermGoals: (g.short_term_goals ?? []).map(
          (s: AIShortTermGoal) => ({
            condition: s.condition ?? '',
            behavior: s.behavior ?? '',
            criterion: s.criterion ?? '',
            support_level:
              typeof s.support_level === 'number' ? s.support_level : 2,
            teaching_methods: s.teaching_methods ?? [],
            materials: s.materials ?? [],
          })
        ),
      });
    });
    onApply(
      applied,
      extrasDecision === 'accepted'
        ? {
            evaluationPlan: evalText,
            supports: draft?.supports ?? {},
          }
        : null
    );
  };

  const canApply = acceptedGoals > 0 || extrasDecision === 'accepted';

  return (
    <Drawer
      title="AI 生成的 IEP 初稿（请逐条审定）"
      open={open}
      onClose={onClose}
      width={720}
      footer={
        <Space>
          <span className="muted">
            已采纳 {acceptedGoals} 项 · 待处理 {pendingGoals} 项
          </span>
          <Button type="primary" disabled={!canApply} onClick={handleApply}>
            将已采纳内容加入计划
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      {draft?.ai_disclaimer && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={draft.ai_disclaimer}
        />
      )}

      {draft?.missing_info && draft.missing_info.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="AI 提示以下信息不足，未编造，请补充后再生成或手工填写"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {draft.missing_info.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          }
        />
      )}

      {goals.length === 0 && (
        <Alert
          type="error"
          showIcon
          message="AI 未生成任何目标，可能因评估信息不足，请先完善评估或手工填写"
          style={{ marginBottom: 12 }}
        />
      )}

      {goals.map((g, gi) => (
        <Card
          key={gi}
          size="small"
          style={{ marginBottom: 12 }}
          title={
            <Space wrap>
              {g.domain && <Tag color="blue">{g.domain}</Tag>}
              <Tag color={DECISION_TAG[decisionOf(gi)].color}>
                {DECISION_TAG[decisionOf(gi)].text}
              </Tag>
            </Space>
          }
          extra={
            <Space>
              <Button
                size="small"
                type={decisionOf(gi) === 'accepted' ? 'primary' : 'default'}
                onClick={() => setGoalDecision(gi, 'accepted')}
              >
                采纳
              </Button>
              <Button
                size="small"
                danger={decisionOf(gi) === 'ignored'}
                onClick={() => setGoalDecision(gi, 'ignored')}
              >
                忽略
              </Button>
            </Space>
          }
        >
          <Input.TextArea
            autoSize
            value={goalTexts[gi] ?? g.goal ?? ''}
            onChange={(e) =>
              setGoalTexts({ ...goalTexts, [gi]: e.target.value })
            }
            placeholder="长期目标（可修改后采纳）"
            style={{ marginBottom: 8 }}
          />
          {(g.short_term_goals ?? []).map((s, si) => (
            <div
              key={si}
              style={{
                borderTop: '1px dashed #e8e8e8',
                padding: '8px 0',
              }}
            >
              <Space wrap style={{ marginBottom: 4 }}>
                <Tag>{LEVEL_TAG[s.support_level ?? 2]}</Tag>
                {s.teaching_methods?.map((m) => (
                  <Tag key={m} color="geekblue">
                    {m}
                  </Tag>
                ))}
              </Space>
              <div>
                {s.condition}
                {s.behavior}
              </div>
              <div className="muted">达成标准：{s.criterion || '未写'}</div>
              {s.materials && s.materials.length > 0 && (
                <div className="muted">教具：{s.materials.join('、')}</div>
              )}
            </div>
          ))}
        </Card>
      ))}

      <Divider orientation="left">支持措施与评价方式</Divider>
      <Card
        size="small"
        title={
          <Tag color={DECISION_TAG[extrasDecision].color}>
            {DECISION_TAG[extrasDecision].text}
          </Tag>
        }
        extra={
          <Space>
            <Button
              size="small"
              type={extrasDecision === 'accepted' ? 'primary' : 'default'}
              onClick={() => setExtras('accepted')}
            >
              采纳
            </Button>
            <Button
              size="small"
              danger={extrasDecision === 'ignored'}
              onClick={() => setExtras('ignored')}
            >
              忽略
            </Button>
          </Space>
        }
      >
        <Input.TextArea
          autoSize
          value={evalText}
          onChange={(e) => setEvalText(e.target.value)}
          placeholder="本学期评价方式"
          style={{ marginBottom: 8 }}
        />
        {(['teaching', 'rehab', 'family'] as const).map((k) => {
          const labels = {
            teaching: '教学措施',
            rehab: '康复配合',
            family: '家庭配合',
          };
          const items = draft?.supports?.[k] ?? [];
          return (
            <div key={k} style={{ marginBottom: 4 }}>
              <span className="muted">{labels[k]}：</span>
              {items.length > 0 ? items.join('；') : '（无）'}
            </div>
          );
        })}
      </Card>
    </Drawer>
  );
};

export default AIDraftDrawer;

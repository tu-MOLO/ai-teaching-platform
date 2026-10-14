import { useState } from 'react';
import { Drawer, Card, Tag, Button, Space, Alert, Input, Divider } from 'antd';
import type {
  AIShortTermGoal,
  IEPDraftAI,
  IEPDraftSection,
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

export interface AppliedProfile {
  studentProfile: string;
  domainSummaries: Array<{ domain: string; summary: string }>;
}

export interface AppliedSupports {
  evaluationPlan: string;
  supports: NonNullable<IEPDraftAI['supports']>;
}

/** 采纳结果：只包含当前页的内容，由编辑页写入对应步骤 */
export type AppliedAIResult =
  | { section: 'goals'; goals: AppliedGoal[] }
  | { section: 'profile'; profile: AppliedProfile }
  | { section: 'supports'; supports: AppliedSupports };

interface Props {
  open: boolean;
  section: IEPDraftSection;
  draft: IEPDraftAI | null;
  onClose: () => void;
  onApply: (result: AppliedAIResult) => void;
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

const PRIORITY_TEXT: Record<string, string> = {
  high: '优先级高',
  medium: '优先级中',
  low: '优先级低',
};

const SECTION_TITLE: Record<IEPDraftSection, string> = {
  profile: '学生基本情况与领域小结',
  goals: '长短期目标',
  supports: '支持措施与评价方式',
};

const SUPPORT_LABELS = {
  teaching: '教学措施',
  rehab: '康复配合',
  family: '家庭配合',
} as const;

/** 采纳/忽略 二选一按钮组 */
const DecisionButtons = ({
  decision,
  onDecide,
}: {
  decision: Decision;
  onDecide: (d: Decision) => void;
}) => (
  <Space>
    <Button
      size="small"
      type={decision === 'accepted' ? 'primary' : 'default'}
      onClick={() => onDecide('accepted')}
    >
      采纳
    </Button>
    <Button
      size="small"
      danger={decision === 'ignored'}
      onClick={() => onDecide('ignored')}
    >
      忽略
    </Button>
  </Space>
);

const AIDraftDrawer = ({ open, section, draft, onClose, onApply }: Props) => {
  const goals = section === 'goals' ? draft?.long_term_goals ?? [] : [];
  const domainSummaries =
    section === 'profile' ? draft?.domain_summaries ?? [] : [];
  const [goalTexts, setGoalTexts] = useState<Record<number, string>>({});
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [sectionDecision, setSectionDecision] = useState<Decision>('pending');
  const [profileText, setProfileText] = useState(draft?.student_profile ?? '');
  const [evalText, setEvalText] = useState(draft?.evaluation_plan ?? '');

  const decisionOf = (i: number): Decision => decisions[i] ?? 'pending';

  const setGoalDecision = (i: number, d: Decision) => {
    setDecisions({ ...decisions, [i]: d });
  };

  const acceptedGoals = goals.filter(
    (_, i) => decisionOf(i) === 'accepted'
  ).length;
  const pendingGoals = goals.filter(
    (_, i) => decisionOf(i) === 'pending'
  ).length;

  const handleApply = () => {
    if (section === 'goals') {
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
      onApply({ section: 'goals', goals: applied });
      return;
    }
    if (section === 'profile') {
      onApply({
        section: 'profile',
        profile: {
          studentProfile: profileText,
          domainSummaries: domainSummaries.map((s) => ({
            domain: s.domain ?? '',
            summary: s.current_level ?? '',
          })),
        },
      });
      return;
    }
    onApply({
      section: 'supports',
      supports: {
        evaluationPlan: evalText,
        supports: draft?.supports ?? {},
      },
    });
  };

  const canApply =
    section === 'goals' ? acceptedGoals > 0 : sectionDecision === 'accepted';

  const emptyHint =
    (section === 'goals' && goals.length === 0) ||
    (section === 'profile' &&
      domainSummaries.length === 0 &&
      !profileText) ||
    (section === 'supports' && !evalText && !draft?.supports);

  return (
    <Drawer
      title={`AI 生成的${SECTION_TITLE[section]}（请审阅后采纳，仅填入本页）`}
      open={open}
      onClose={onClose}
      width={720}
      footer={
        <Space>
          {section === 'goals' ? (
            <span className="muted">
              已采纳 {acceptedGoals} 项 · 待处理 {pendingGoals} 项
            </span>
          ) : (
            <span className="muted">{DECISION_TAG[sectionDecision].text}</span>
          )}
          <Button type="primary" disabled={!canApply} onClick={handleApply}>
            {section === 'goals' ? '将已采纳目标加入计划' : '采纳并填入本页'}
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

      {emptyHint && (
        <Alert
          type="error"
          showIcon
          message="AI 未生成本页内容，可能因评估信息不足，请先完善评估或手工填写"
          style={{ marginBottom: 12 }}
        />
      )}

      {section === 'goals' &&
        goals.map((g, gi) => (
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
              <DecisionButtons
                decision={decisionOf(gi)}
                onDecide={(d) => setGoalDecision(gi, d)}
              />
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
                style={{ borderTop: '1px dashed #e8e8e8', padding: '8px 0' }}
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

      {section === 'profile' && (
        <Card
          size="small"
          title={
            <Tag color={DECISION_TAG[sectionDecision].color}>
              {DECISION_TAG[sectionDecision].text}
            </Tag>
          }
          extra={
            <DecisionButtons
              decision={sectionDecision}
              onDecide={setSectionDecision}
            />
          }
        >
          <Input.TextArea
            autoSize
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            placeholder="学生基本情况（可修改后采纳）"
            style={{ marginBottom: 8 }}
          />
          <Divider orientation="left" plain>
            各领域评估小结
          </Divider>
          {domainSummaries.length === 0 && (
            <div className="muted">（AI 未给出领域小结）</div>
          )}
          {domainSummaries.map((s, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <Space wrap>
                {s.domain && <Tag color="blue">{s.domain}</Tag>}
                {s.priority && (
                  <Tag>{PRIORITY_TEXT[s.priority] ?? s.priority}</Tag>
                )}
              </Space>
              <div>{s.current_level}</div>
            </div>
          ))}
        </Card>
      )}

      {section === 'supports' && (
        <Card
          size="small"
          title={
            <Tag color={DECISION_TAG[sectionDecision].color}>
              {DECISION_TAG[sectionDecision].text}
            </Tag>
          }
          extra={
            <DecisionButtons
              decision={sectionDecision}
              onDecide={setSectionDecision}
            />
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
            const items = draft?.supports?.[k] ?? [];
            return (
              <div key={k} style={{ marginBottom: 4 }}>
                <span className="muted">{SUPPORT_LABELS[k]}：</span>
                {items.length > 0 ? items.join('；') : '（无）'}
              </div>
            );
          })}
        </Card>
      )}
    </Drawer>
  );
};

export default AIDraftDrawer;

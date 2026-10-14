import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Divider, Empty, Form, Input, Radio, Select, Space, Spin, Steps, Tag } from 'antd';
import { message } from '@/utils/feedback';
import {
  PlusOutlined,
  MinusCircleOutlined,
  ArrowLeftOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createIEP,
  generateIEPDraft,
  getDefaultTemplate,
  getIEP,
  submitIEP,
  updateIEP,
  type DomainAssessment,
  type IEPDraftAI,
  type IEPDraftSection,
  type IEPSupports,
  type LongTermGoal,
  type ShortTermGoal,
} from '../../services/iep';
import { studentService } from '../../services/student';
import type { Student } from '../../services/student';
import AIDraftDrawer from './AIDraftDrawer';
import type { AppliedAIResult } from './AIDraftDrawer';
import ConfigurableSelect from '../../components/Common/ConfigurableSelect';
import './index.css';

// 0–3 级：数字越小所需支持越多
const LEVEL_BUTTONS = [
  { value: 0, label: '0', title: '不能完成' },
  { value: 1, label: '1', title: '大量辅助' },
  { value: 2, label: '2', title: '少量辅助' },
  { value: 3, label: '3', title: '独立完成' },
];

interface EditorState {
  student_id: string;
  term: string;
  student_profile: string;
  supports: IEPSupports;
  evaluation_plan: string;
  domain_assessments: DomainAssessment[];
  long_term_goals: LongTermGoal[];
}

const emptyState: EditorState = {
  student_id: '',
  term: '',
  student_profile: '',
  supports: { teaching: [], rehab: [], family: [] },
  evaluation_plan: '',
  domain_assessments: [],
  long_term_goals: [],
};

const IEPEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [state, setState] = useState<EditorState>(emptyState);

  // AI 生成（人在回路，三页各自生成、只填本页）
  const [savedId, setSavedId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState<IEPDraftSection | null>(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiSection, setAiSection] = useState<IEPDraftSection>('goals');
  const [aiDraft, setAiDraft] = useState<IEPDraftAI | null>(null);

  const patch = useCallback((p: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  // 初始化：编辑加载已有 IEP；新建用默认模板生成评估骨架
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const studentResp = await studentService.getStudents({ page_size: 100 });
        setStudents(studentResp.data || []);

        if (isEdit && id) {
          const iep = await getIEP(id);
          if (iep.status === 'locked') {
            message.warning('该 IEP 已定稿，不能直接编辑，请使用「修订」创建新版本');
            navigate(`/iep/${id}`);
            return;
          }
          setState({
            student_id: iep.student_id,
            term: iep.term,
            student_profile: iep.student_profile || '',
            supports: iep.supports || { teaching: [], rehab: [], family: [] },
            evaluation_plan: iep.evaluation_plan || '',
            domain_assessments: iep.domain_assessments || [],
            long_term_goals: iep.long_term_goals || [],
          });
        } else {
          const tpl = await getDefaultTemplate();
          const domains: DomainAssessment[] = tpl.domains.map((d) => ({
            domain_code: d.code || undefined,
            domain_name: d.name,
            overall_level: null,
            summary: '',
            sort_order: d.sort_order,
            items: d.items.map((it) => ({
              item_name: it.name,
              level: null,
              note: '',
              sort_order: it.sort_order,
            })),
          }));
          setState({ ...emptyState, domain_assessments: domains });
        }
      } catch (error) {
        message.error('初始化失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 评估操作 ----------
  const setItemLevel = (di: number, ii: number, level: number | null) => {
    setState((prev) => {
      const domains = [...prev.domain_assessments];
      const items = [...domains[di].items];
      items[ii] = { ...items[ii], level };
      domains[di] = { ...domains[di], items };
      return { ...prev, domain_assessments: domains };
    });
  };

  const setDomainLevel = (di: number, level: number | null) => {
    setState((prev) => {
      const domains = [...prev.domain_assessments];
      domains[di] = { ...domains[di], overall_level: level };
      return { ...prev, domain_assessments: domains };
    });
  };

  // ---------- 目标操作 ----------
  const addLongGoal = () => {
    const first = state.domain_assessments[0];
    setState((prev) => ({
      ...prev,
      long_term_goals: [
        ...prev.long_term_goals,
        {
          domain_code: first?.domain_code || undefined,
          domain_name: first?.domain_name || '',
          goal: '',
          sort_order: prev.long_term_goals.length,
          short_term_goals: [],
        },
      ],
    }));
  };

  const updateLongGoal = (li: number, p: Partial<LongTermGoal>) => {
    setState((prev) => {
      const goals = [...prev.long_term_goals];
      goals[li] = { ...goals[li], ...p };
      return { ...prev, long_term_goals: goals };
    });
  };

  const removeLongGoal = (li: number) => {
    setState((prev) => ({
      ...prev,
      long_term_goals: prev.long_term_goals.filter((_, i) => i !== li),
    }));
  };

  const addShortGoal = (li: number) => {
    setState((prev) => {
      const goals = [...prev.long_term_goals];
      const newShort: ShortTermGoal = {
        condition: '',
        behavior: '',
        criterion: '',
        support_level: null,
        status: 'not_started',
        teaching_methods: [],
        materials: [],
        sort_order: goals[li].short_term_goals.length,
      };
      goals[li] = {
        ...goals[li],
        short_term_goals: [...goals[li].short_term_goals, newShort],
      };
      return { ...prev, long_term_goals: goals };
    });
  };

  const updateShortGoal = (
    li: number,
    si: number,
    p: Partial<ShortTermGoal>
  ) => {
    setState((prev) => {
      const goals = [...prev.long_term_goals];
      const shorts = [...goals[li].short_term_goals];
      shorts[si] = { ...shorts[si], ...p };
      goals[li] = { ...goals[li], short_term_goals: shorts };
      return { ...prev, long_term_goals: goals };
    });
  };

  const removeShortGoal = (li: number, si: number) => {
    setState((prev) => {
      const goals = [...prev.long_term_goals];
      goals[li] = {
        ...goals[li],
        short_term_goals: goals[li].short_term_goals.filter((_, i) => i !== si),
      };
      return { ...prev, long_term_goals: goals };
    });
  };

  // ---------- 组装 payload（赋 sort_order，剔除全空评估） ----------
  const buildPayload = () => {
    const domains = state.domain_assessments
      .map((d, di) => ({
        ...d,
        sort_order: di,
        items: d.items
          .map((it, ii) => ({ ...it, sort_order: ii }))
          .filter((it) => it.level !== null || (it.note && it.note.trim())),
      }))
      .filter(
        (d) =>
          d.overall_level !== null ||
          (d.summary && d.summary.trim()) ||
          d.items.length > 0
      );

    const goals = state.long_term_goals
      .map((g, li) => ({
        ...g,
        sort_order: li,
        short_term_goals: g.short_term_goals
          .map((s, si) => ({ ...s, sort_order: si }))
          .filter((s) => s.behavior && s.behavior.trim()),
      }))
      .filter((g) => g.goal && g.goal.trim());

    return {
      student_id: state.student_id,
      term: state.term,
      student_profile: state.student_profile,
      supports: state.supports,
      evaluation_plan: state.evaluation_plan,
      domain_assessments: domains,
      long_term_goals: goals,
    };
  };

  const validateCurrent = (): boolean => {
    if (step === 0) {
      if (!state.student_id) {
        message.warning('请选择学生');
        return false;
      }
      if (!state.term.trim()) {
        message.warning('请填写学期');
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (validateCurrent()) setStep((s) => s + 1);
  };

  // ---------- AI 生成（每页只生成当页内容） ----------
  const resolveDomain = (domain: string) => {
    const hit = state.domain_assessments.find(
      (d) => d.domain_name === domain || d.domain_code === domain
    );
    return hit || { domain_code: domain, domain_name: domain };
  };

  /** 生成前确保 IEP 已存在（新建时先落草稿），返回可用的 IEP id */
  const ensureIepId = async (): Promise<string | null> => {
    const activeId = id || savedId;
    if (activeId) return activeId;
    if (!state.student_id || !state.term.trim()) {
      message.warning('请先选择学生并填写学期，再使用 AI 生成');
      setStep(0);
      return null;
    }
    const created = await createIEP(buildPayload());
    setSavedId(created.id);
    navigate(`/iep/${created.id}/edit`, { replace: true });
    return created.id;
  };

  const handleGenerate = async (section: IEPDraftSection) => {
    setAiGenerating(section);
    try {
      const activeId = await ensureIepId();
      if (!activeId) return;
      const draft = await generateIEPDraft(activeId, section);
      setAiSection(section);
      setAiDraft(draft);
      setAiDrawerOpen(true);
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          'AI 生成失败，可手工填写'
      );
    } finally {
      setAiGenerating(null);
    }
  };

  const dedupe = (items: string[]) =>
    Array.from(new Set(items.filter((x) => x && x.trim())));

  const handleApplyAI = (result: AppliedAIResult) => {
    if (result.section === 'goals') {
      const mappedGoals: LongTermGoal[] = result.goals.map((g, gi) => {
        const domain = resolveDomain(g.domain);
        return {
          domain_code: domain.domain_code,
          domain_name: domain.domain_name,
          goal: g.goal,
          sort_order: state.long_term_goals.length + gi,
          short_term_goals: g.shortTermGoals.map((s, si) => ({
            condition: s.condition,
            behavior: s.behavior,
            criterion: s.criterion,
            support_level: s.support_level,
            status: 'not_started',
            teaching_methods: s.teaching_methods,
            materials: s.materials,
            sort_order: si,
          })),
        };
      });
      setState((prev) => ({
        ...prev,
        long_term_goals: [...prev.long_term_goals, ...mappedGoals],
      }));
      setAiDrawerOpen(false);
      message.success(
        `已将 ${mappedGoals.length} 条 AI 目标加入计划，请核对后再提交审定`
      );
      return;
    }

    if (result.section === 'profile') {
      const { studentProfile, domainSummaries } = result.profile;
      let filled = 0;
      setState((prev) => ({
        ...prev,
        student_profile: studentProfile || prev.student_profile,
        domain_assessments: prev.domain_assessments.map((d) => {
          const hit = domainSummaries.find(
            (s) => s.domain && (s.domain === d.domain_name || s.domain === d.domain_code)
          );
          if (!hit || !hit.summary) return d;
          filled += 1;
          return { ...d, summary: hit.summary };
        }),
      }));
      setAiDrawerOpen(false);
      message.success(`已填入学生基本情况和 ${filled} 个领域小结，请核对后修改`);
      return;
    }

    setState((prev) => ({
      ...prev,
      supports: {
        teaching: dedupe([
          ...prev.supports.teaching,
          ...(result.supports.supports.teaching || []),
        ]),
        rehab: dedupe([
          ...prev.supports.rehab,
          ...(result.supports.supports.rehab || []),
        ]),
        family: dedupe([
          ...prev.supports.family,
          ...(result.supports.supports.family || []),
        ]),
      },
      evaluation_plan: result.supports.evaluationPlan || prev.evaluation_plan,
    }));
    setAiDrawerOpen(false);
    message.success('已填入支持措施与评价方式，请核对后修改');
  };

  /** 每页的 AI 生成按钮 */
  const renderAiButton = (section: IEPDraftSection, hint: string) => (
    <Space style={{ marginBottom: 12 }}>
      <Button
        icon={<RobotOutlined />}
        loading={aiGenerating === section}
        disabled={aiGenerating !== null && aiGenerating !== section}
        onClick={() => handleGenerate(section)}
      >
        AI 生成本页内容
      </Button>
      <span style={{ color: '#888' }}>{hint}</span>
    </Space>
  );

  // 保存（草稿）或保存并提交审定
  const persist = async (submit: boolean) => {
    if (!state.student_id || !state.term.trim()) {
      message.warning('请先完善学生与学期');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      let iepId: string;
      if (isEdit && id) {
        const updated = await updateIEP(id, payload);
        iepId = updated.id;
      } else {
        const created = await createIEP(payload);
        iepId = created.id;
      }

      if (submit) {
        const hasContent =
          payload.domain_assessments.length > 0 ||
          payload.long_term_goals.length > 0;
        if (!hasContent) {
          message.warning('至少需要一项评估或目标才能提交审定');
          setSaving(false);
          return;
        }
        await submitIEP(iepId);
        message.success('已提交审定');
      } else {
        message.success('草稿已保存');
      }
      navigate(`/iep/${iepId}`);
    } catch (error) {
      message.error('保存失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const domainOptions = state.domain_assessments.map((d, i) => ({
    label: d.domain_name,
    value: i,
  }));

  return (
    <div className="iep-page">
      <div className="iep-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/iep')}
          >
            返回列表
          </Button>
          <h1 className="iep-title" style={{ margin: 0 }}>
            {isEdit ? '编辑 IEP' : '新建 IEP'}
          </h1>
        </Space>
      </div>

      <Steps
        current={step}
        onChange={(c) => setStep(c)}
        items={[
          { title: '情况与评估' },
          { title: '长短期目标' },
          { title: '复核' },
        ]}
        style={{ marginBottom: 24 }}
      />

      <div className="iep-editor-step">
        {/* ============ 步骤 1：基本情况 + 评估 ============ */}
        {step === 0 && (
          <Card>
            <Alert
              type="info"
              message="评估等级说明"
              description={
                <Space wrap>
                  {LEVEL_BUTTONS.map((l) => (
                    <Tag key={l.value}>
                      {l.label} {l.title}
                    </Tag>
                  ))}
                  <span style={{ color: '#888' }}>
                    未观察到的条目可留空（不计为 0）
                  </span>
                </Space>
              }
              style={{ marginBottom: 20 }}
            />

            <Form layout="vertical">
              <Space style={{ display: 'flex' }} align="start">
                <Form.Item label="学生" required style={{ width: 260 }}>
                  <Select
                    showSearch
                    placeholder="选择学生"
                    optionFilterProp="label"
                    disabled={isEdit}
                    value={state.student_id || undefined}
                    onChange={(v) => patch({ student_id: v })}
                    options={students.map((s) => ({
                      label: `${s.name}（${s.grade || ''}${
                        s.class_name ? ' ' + s.class_name : ''
                      }）`,
                      value: s.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item label="学期" required style={{ width: 260 }}>
                  <Input
                    placeholder="如 2026-2027 第一学期"
                    value={state.term}
                    onChange={(e) => patch({ term: e.target.value })}
                  />
                </Form.Item>
              </Space>

              <Form.Item label="学生基本情况（教师观察 / 家长提供）">
                <Input.TextArea
                  rows={3}
                  placeholder="描述学生的障碍情况、兴趣、优势与关注点；不写医学诊断结论"
                  value={state.student_profile}
                  onChange={(e) => patch({ student_profile: e.target.value })}
                />
              </Form.Item>

              {renderAiButton(
                'profile',
                '根据已填评估起草「学生基本情况 + 各领域评估小结」，只填入本页'
              )}

              <Divider orientation="left">发展领域评估</Divider>

              {state.domain_assessments.map((domain, di) => (
                <div key={di} className="iep-assessment-domain">
                  <Space style={{ marginBottom: 8 }}>
                    <strong>{domain.domain_name}</strong>
                    <span style={{ color: '#888' }}>领域整体：</span>
                    <Radio.Group
                      size="small"
                      value={domain.overall_level}
                      onChange={(e) => setDomainLevel(di, e.target.value)}
                    >
                      {LEVEL_BUTTONS.map((l) => (
                        <Radio.Button key={l.value} value={l.value}>
                          {l.label}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                    {domain.overall_level !== null && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setDomainLevel(di, null)}
                      >
                        清除
                      </Button>
                    )}
                  </Space>

                  <Card size="small" style={{ background: '#fafafa' }}>
                    {domain.items.map((item, ii) => (
                      <Space
                        key={ii}
                        style={{ width: '100%', marginBottom: 6 }}
                        align="center"
                      >
                        <span style={{ minWidth: 140 }}>{item.item_name}</span>
                        <Radio.Group
                          size="small"
                          className="iep-level-radio"
                          value={item.level}
                          onChange={(e) => setItemLevel(di, ii, e.target.value)}
                        >
                          {LEVEL_BUTTONS.map((l) => (
                            <Radio.Button key={l.value} value={l.value}>
                              {l.label}
                            </Radio.Button>
                          ))}
                        </Radio.Group>
                        {item.level !== null && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setItemLevel(di, ii, null)}
                          >
                            清除
                          </Button>
                        )}
                      </Space>
                    ))}
                    <Input
                      size="small"
                      placeholder="领域观察小结（可选）"
                      value={domain.summary || ''}
                      onChange={(e) => {
                        setState((prev) => {
                          const domains = [...prev.domain_assessments];
                          domains[di] = {
                            ...domains[di],
                            summary: e.target.value,
                          };
                          return { ...prev, domain_assessments: domains };
                        });
                      }}
                      style={{ marginTop: 4 }}
                    />
                  </Card>
                </div>
              ))}
            </Form>
          </Card>
        )}

        {/* ============ 步骤 2：长短期目标 ============ */}
        {step === 1 && (
          <Card>
            <Alert
              type="info"
              message="短期目标建议写清「条件 + 行为 + 标准」，并标注所需支持级别"
              style={{ marginBottom: 16 }}
            />

            {renderAiButton(
              'goals',
              '根据评估起草长短期目标，逐条采纳后只加入本页'
            )}

            {state.long_term_goals.length === 0 && (
              <Empty description="还没有长期目标" style={{ marginBottom: 16 }} />
            )}

            {state.long_term_goals.map((goal, li) => (
              <div key={li} className="iep-goal-block">
                <Space style={{ width: '100%', marginBottom: 12 }} align="baseline">
                  <strong>长期目标 {li + 1}</strong>
                  <Select
                    size="small"
                    style={{ width: 140 }}
                    value={domainOptions.find(
                      (o) => o.label === goal.domain_name
                    )?.value}
                    onChange={(v) =>
                      updateLongGoal(li, {
                        domain_code: state.domain_assessments[v]?.domain_code,
                        domain_name: state.domain_assessments[v]?.domain_name,
                      })
                    }
                    options={domainOptions}
                  />
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<MinusCircleOutlined />}
                    onClick={() => removeLongGoal(li)}
                  >
                    删除长期目标
                  </Button>
                </Space>
                <Input
                  placeholder="长期目标描述（学期末期望达到的水平）"
                  value={goal.goal}
                  onChange={(e) => updateLongGoal(li, { goal: e.target.value })}
                  style={{ marginBottom: 12 }}
                />

                {goal.short_term_goals.map((s, si) => (
                  <Card
                    key={si}
                    size="small"
                    style={{ marginBottom: 10, background: '#fafafa' }}
                    title={
                      <Space>
                        <span>短期目标 {si + 1}</span>
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<MinusCircleOutlined />}
                          onClick={() => removeShortGoal(li, si)}
                        >
                          删除
                        </Button>
                      </Space>
                    }
                  >
                    <Space wrap align="start">
                      <Input
                        addonBefore="条件"
                        style={{ width: 200 }}
                        value={s.condition || ''}
                        onChange={(e) =>
                          updateShortGoal(li, si, { condition: e.target.value })
                        }
                      />
                      <Input
                        addonBefore="行为"
                        style={{ width: 220 }}
                        value={s.behavior}
                        onChange={(e) =>
                          updateShortGoal(li, si, { behavior: e.target.value })
                        }
                      />
                      <Input
                        addonBefore="标准"
                        style={{ width: 220 }}
                        value={s.criterion || ''}
                        onChange={(e) =>
                          updateShortGoal(li, si, { criterion: e.target.value })
                        }
                      />
                    </Space>
                    <Space wrap style={{ marginTop: 10 }} align="center">
                      <span style={{ color: '#888' }}>支持级别：</span>
                      <Radio.Group
                        size="small"
                        value={s.support_level}
                        onChange={(e) =>
                          updateShortGoal(li, si, { support_level: e.target.value })
                        }
                      >
                        {LEVEL_BUTTONS.map((l) => (
                          <Radio.Button key={l.value} value={l.value}>
                            {l.label}
                          </Radio.Button>
                        ))}
                      </Radio.Group>
                    </Space>
                    <Space wrap style={{ marginTop: 10, width: '100%' }}>
                      <ConfigurableSelect
                        groupKey="iep_teaching_method"
                        mode="multiple"
                        size="small"
                        placeholder="教学方法"
                        style={{ minWidth: 240, flex: 1 }}
                        value={s.teaching_methods || []}
                        onChange={(v) =>
                          updateShortGoal(li, si, { teaching_methods: v as string[] })
                        }
                      />
                      <ConfigurableSelect
                        groupKey="iep_material"
                        mode="multiple"
                        size="small"
                        placeholder="教具 / 材料"
                        style={{ minWidth: 200, flex: 1 }}
                        value={s.materials || []}
                        onChange={(v) =>
                          updateShortGoal(li, si, { materials: v as string[] })
                        }
                      />
                    </Space>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addShortGoal(li)}
                >
                  添加短期目标
                </Button>
              </div>
            ))}

            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="large"
              style={{ width: '100%' }}
              onClick={addLongGoal}
            >
              添加长期目标
            </Button>
          </Card>
        )}

        {/* ============ 步骤 3：复核 ============ */}
        {step === 2 && (
          <Card>
            {renderAiButton(
              'supports',
              '根据评估与目标起草支持措施与评价方式，只填入本页'
            )}

            <Form layout="vertical">
              <Form.Item label="评估 / 评价方式">
                <Input.TextArea
                  rows={2}
                  placeholder="说明如何在学期中、学期末评价目标达成情况"
                  value={state.evaluation_plan}
                  onChange={(e) => patch({ evaluation_plan: e.target.value })}
                />
              </Form.Item>
            </Form>

            <Divider orientation="left">支持措施</Divider>
            <Space wrap style={{ marginBottom: 16 }}>
              {(['teaching', 'rehab', 'family'] as const).map((k) => (
                <ConfigurableSelect
                  key={k}
                  groupKey={
                    k === 'teaching'
                      ? 'iep_support_teaching'
                      : k === 'rehab'
                      ? 'iep_support_rehab'
                      : 'iep_support_family'
                  }
                  mode="multiple"
                  style={{ minWidth: 240 }}
                  placeholder={
                    k === 'teaching'
                      ? '教学支持'
                      : k === 'rehab'
                      ? '康复支持'
                      : '家庭支持'
                  }
                  value={state.supports[k]}
                  onChange={(v) =>
                    patch({ supports: { ...state.supports, [k]: v as string[] } })
                  }
                />
              ))}
            </Space>

            <Divider orientation="left">复核摘要</Divider>
            <p>
              已评估领域：
              <strong>
                {
                  state.domain_assessments.filter(
                    (d) => d.overall_level !== null
                  ).length
                }
              </strong>{' '}
              / {state.domain_assessments.length}；长期目标：
              <strong>{state.long_term_goals.length}</strong>；短期目标：
              <strong>
                {state.long_term_goals.reduce(
                  (sum, g) => sum + g.short_term_goals.length,
                  0
                )}
              </strong>
            </p>
            <Alert
              type="warning"
              message="提交后进入「待审定」，需由教师主动「定稿」才会锁定；AI 不会自动定稿。"
            />
          </Card>
        )}

        <div className="iep-footer-actions">
          <Button
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            上一步
          </Button>
          <Space>
            <Button loading={saving} onClick={() => persist(false)}>
              保存草稿
            </Button>
            {step < 2 ? (
              <Button type="primary" onClick={goNext}>
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                loading={saving}
                onClick={() => persist(true)}
              >
                保存并提交审定
              </Button>
            )}
          </Space>
        </div>
      </div>

      <AIDraftDrawer
        key={`${aiSection}-${aiDraft?.generation_log_id || 'iep-draft'}`}
        open={aiDrawerOpen}
        section={aiSection}
        draft={aiDraft}
        onClose={() => setAiDrawerOpen(false)}
        onApply={handleApplyAI}
      />
    </div>
  );
};

export default IEPEditor;

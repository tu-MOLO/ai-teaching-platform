import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};
const mockGetDefaultTemplate = vi.fn().mockResolvedValue({
  id: 'tpl1',
  name: '默认模板',
  is_default: true,
  domains: [
    {
      code: 'perception',
      name: '感知',
      sort_order: 0,
      items: [
        { name: '注视', sort_order: 0 },
        { name: '追视', sort_order: 1 },
      ],
    },
  ],
});
const mockCreate = vi.fn().mockResolvedValue({ id: 'new1', status: 'draft' });
const mockUpdate = vi.fn().mockResolvedValue({ id: 'new1', status: 'draft' });
const mockGetIEP = vi.fn();
const mockSubmit = vi.fn().mockResolvedValue({ id: 'new1', status: 'review' });
const mockGenerateDraft = vi.fn();
const mockGetStudents = vi.fn().mockResolvedValue({
  data: [{ id: 's1', name: '小明', grade: '三年级', class_name: '一班' }],
});
// 每个用例可切换路由参数（编辑模式）
let mockParams: Record<string, string> = {};

vi.mock('../../../services/iep', () => ({
  getDefaultTemplate: (...a: any[]) => mockGetDefaultTemplate(...a),
  createIEP: (...a: any[]) => mockCreate(...a),
  updateIEP: (...a: any[]) => mockUpdate(...a),
  getIEP: (...a: any[]) => mockGetIEP(...a),
  submitIEP: (...a: any[]) => mockSubmit(...a),
  generateIEPDraft: (...a: any[]) => mockGenerateDraft(...a),
}));

vi.mock('../../../services/student', () => ({
  studentService: { getStudents: (...a: any[]) => mockGetStudents(...a) },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

vi.mock('antd', () => {
  const StepsComp = ({ items, onChange }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'steps' },
      (items || []).map((it: any, i: number) =>
        React.createElement(
          'button',
          { key: i, type: 'button', 'data-testid': `step-${i}`, onClick: () => onChange?.(i) },
          it.title
        )
      )
    );

  const Radio = Object.assign(
    (props: any) => React.createElement('input', { type: 'radio', ...props }),
    {
      Button: ({ value, children, onClick }: any) =>
        React.createElement(
          'button',
          { type: 'button', 'data-testid': `radio-${value}`, onClick },
          children
        ),
      Group: ({ value, onChange, children }: any) => {
        const buttons = React.Children.map(children, (c: any) =>
          React.cloneElement(c, {
            onClick: () => onChange?.({ target: { value: c.props.value } }),
            'data-selected': value === c.props.value,
          })
        );
        return React.createElement(
          'div',
          { 'data-testid': 'radio-group' },
          buttons
        );
      },
    }
  );

  const TagsSelect = ({ value, onChange, placeholder }: any) =>
    React.createElement(
      'div',
      { 'data-testid': `tags-${placeholder}` },
      React.createElement('input', {
        value: (value || []).join(','),
        readOnly: true,
      }),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => onChange?.([...(value || []), `${placeholder}项`]),
        },
        '添加标签'
      )
    );

  const SelectComp = ({ options, value, onChange, placeholder, mode }: any) =>
    mode === 'tags'
      ? TagsSelect({ value, onChange, placeholder })
      : React.createElement(
          'select',
          {
            'data-testid': 'select',
            value,
            onChange: (e: any) => onChange?.(e.target.value),
          },
          React.createElement('option', { value: '' }, placeholder),
          (options || []).map((o: any) =>
            React.createElement('option', { key: o.value, value: o.value }, o.label)
          )
        );

  return {
    Drawer: ({ open, title, footer, children }: any) =>
      open
        ? React.createElement('div', null, title, children, footer)
        : null,
    Steps: StepsComp,
    Radio,
    Select: SelectComp,
    Card: ({ children, title, extra }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'card' },
        title,
        extra,
        children
      ),
    Button: ({ children, onClick, disabled, loading }: any) =>
      React.createElement(
        'button',
        { type: 'button', onClick, disabled: disabled || !!loading },
        children
      ),
    Space: ({ children }: any) =>
      React.createElement('div', null, children),
    Tag: ({ children }: any) =>
      React.createElement('span', null, children),
    Alert: ({ message, description }: any) =>
      React.createElement('div', { 'data-testid': 'alert' }, message, description),
    Divider: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'divider' }, children),
    Spin: () => React.createElement('div', { 'data-testid': 'spin' }),
    Empty: ({ description }: any) =>
      React.createElement('div', null, description),
    Form: Object.assign(
      ({ children }: any) => React.createElement('div', null, children),
      {
        Item: ({ label, children }: any) =>
          React.createElement(
            'div',
            null,
            label ? React.createElement('label', null, label) : null,
            children
          ),
      }
    ),
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { TextArea: (props: any) => React.createElement('textarea', props) }
    ),
    message: mockMessage,
  };
});

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () =>
    React.createElement('span', { 'data-testid': `icon-${name}` }, name);
  return {
    PlusOutlined: icon('PlusOutlined'),
    MinusCircleOutlined: icon('MinusCircleOutlined'),
    ArrowLeftOutlined: icon('ArrowLeftOutlined'),
    RobotOutlined: icon('RobotOutlined'),
  };
});

const IEPEditor = (await import('../Editor')).default;

const draftAI = {
  ai_disclaimer: 'AI 草稿声明',
  missing_info: ['需补充家庭情况'],
  long_term_goals: [
    {
      domain: '感知',
      goal: '提升追踪',
      short_term_goals: [
        {
          condition: '教师提示下',
          behavior: '追视',
          criterion: '连续3次',
          support_level: 2,
          teaching_methods: ['示范'],
          materials: ['玩具'],
        },
      ],
    },
  ],
  supports: { teaching: ['视觉提示'], rehab: [], family: [] },
  evaluation_plan: '每周观察',
  generation_log_id: 'log1',
};

describe('IEP editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
  });

  const renderEditor = () => render(React.createElement(IEPEditor));

  const fillStudentAndTerm = async () => {
    fireEvent.change(await screen.findByTestId('select'), {
      target: { value: 's1' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('如 2026-2027 第一学期'),
      { target: { value: '2026-2027 第一学期' } }
    );
  };

  const goToStep = async (n: number) => {
    fireEvent.click(screen.getByTestId(`step-${n}`));
  };

  it('renders step 1 (assessment) after initialization', async () => {
    renderEditor();
    expect(await screen.findByText('发展领域评估')).toBeInTheDocument();
  });

  it('does not advance without selecting a student', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    // stays on assessment step
    expect(screen.getByText('发展领域评估')).toBeInTheDocument();
  });

  it('fills student and term, advances to goals, adds a long-term goal', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');

    await fillStudentAndTerm();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    const addGoal = await screen.findByText('添加长期目标');
    fireEvent.click(addGoal);
    expect(
      await screen.findByPlaceholderText(/长期目标描述/)
    ).toBeInTheDocument();
  });

  it('saves a draft and calls createIEP', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');

    await fillStudentAndTerm();
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  });

  it('评估步骤：选择领域/条目级别后出现清除按钮，清除后级别重置', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');

    // 1 个领域组 + 2 个条目组
    const groups = screen.getAllByTestId('radio-group');
    expect(groups.length).toBe(3);

    // 领域整体选 0
    fireEvent.click(within(groups[0]).getByTestId('radio-0'));
    expect(screen.getAllByText('清除').length).toBe(1);

    // 第一个条目选 2
    fireEvent.click(within(groups[1]).getByTestId('radio-2'));
    expect(screen.getAllByText('清除').length).toBe(2);

    // 清除领域整体
    fireEvent.click(screen.getAllByText('清除')[0]);
    expect(screen.getAllByText('清除').length).toBe(1);
  });

  it('目标步骤：长期/短期目标的增改删与标签输入', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');
    await fillStudentAndTerm();
    await goToStep(1);

    fireEvent.click(screen.getByRole('button', { name: '添加长期目标' }));
    const goalInput = await screen.findByPlaceholderText(/长期目标描述/);
    fireEvent.change(goalInput, { target: { value: '提升日常沟通' } });

    // 关联领域
    const domainSelect = screen.getByTestId('select');
    fireEvent.change(domainSelect, { target: { value: '0' } });

    // 添加短期目标并填写三要素
    fireEvent.click(screen.getByRole('button', { name: '添加短期目标' }));
    const textInputs = document.querySelectorAll('input');
    // 顺序：长期目标描述、条件、行为、标准、教学方法(tags)、教具(tags)
    fireEvent.change(textInputs[1], { target: { value: '餐前' } });
    fireEvent.change(textInputs[2], { target: { value: '表达需求' } });
    fireEvent.change(textInputs[3], { target: { value: '连续3天' } });

    // 支持级别
    const supportGroup = screen.getByTestId('radio-group');
    fireEvent.click(within(supportGroup).getByTestId('radio-1'));

    // 教学方法 / 教具标签
    const tagButtons = screen.getAllByRole('button', { name: '添加标签' });
    expect(tagButtons.length).toBe(2);
    fireEvent.click(tagButtons[0]);
    fireEvent.click(tagButtons[1]);

    // 删除短期目标
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() =>
      expect(screen.queryByText('短期目标 1')).toBeNull()
    );

    // 删除长期目标
    fireEvent.click(screen.getByRole('button', { name: '删除长期目标' }));
    expect(await screen.findByText('还没有长期目标')).toBeInTheDocument();
  });

  it('复核步骤：填写评价方式与三类支持措施，摘要统计正确，可往返导航', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');
    await fillStudentAndTerm();

    // 在评估页给领域定级，便于复核摘要计数
    const groups = screen.getAllByTestId('radio-group');
    fireEvent.click(within(groups[0]).getByTestId('radio-3'));

    await goToStep(2);
    expect(screen.getByText(/已评估领域/)).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('说明如何在学期中、学期末评价目标达成情况'),
      { target: { value: '每周观察记录' } }
    );

    // 教学/康复/家庭三个标签选择器
    const supportTagButtons = screen.getAllByRole('button', {
      name: '添加标签',
    });
    expect(supportTagButtons.length).toBe(3);
    supportTagButtons.forEach((b) => fireEvent.click(b));

    // 上一步 -> 下一步
    fireEvent.click(screen.getByRole('button', { name: '上一步' }));
    expect(screen.getByText('添加长期目标')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/已评估领域/)).toBeInTheDocument();
  });

  it('有评估内容时保存并提交审定：createIEP + submitIEP 后跳转详情', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');
    await fillStudentAndTerm();
    const groups = screen.getAllByTestId('radio-group');
    fireEvent.click(within(groups[0]).getByTestId('radio-2'));

    await goToStep(2);
    fireEvent.click(screen.getByRole('button', { name: '保存并提交审定' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('new1'));
    expect(mockMessage.success).toHaveBeenCalledWith('已提交审定');
    expect(mockNavigate).toHaveBeenCalledWith('/iep/new1');
  });

  it('无任何评估或目标时提交审定被拦截', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');
    await fillStudentAndTerm();
    await goToStep(2);

    fireEvent.click(screen.getByRole('button', { name: '保存并提交审定' }));

    await waitFor(() =>
      expect(mockMessage.warning).toHaveBeenCalledWith(
        '至少需要一项评估或目标才能提交审定'
      )
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('编辑已锁定 IEP 被拦截并跳回详情', async () => {
    mockParams = { id: 'iep-9' };
    mockGetIEP.mockResolvedValueOnce({
      id: 'iep-9',
      student_id: 's1',
      term: '2025 秋季',
      status: 'locked',
      student_profile: '',
      supports: { teaching: [], rehab: [], family: [] },
      evaluation_plan: '',
      domain_assessments: [],
      long_term_goals: [],
    });
    renderEditor();

    await waitFor(() =>
      expect(mockMessage.warning).toHaveBeenCalledWith(
        '该 IEP 已定稿，不能直接编辑，请使用「修订」创建新版本'
      )
    );
    expect(mockNavigate).toHaveBeenCalledWith('/iep/iep-9');
  });

  it('编辑草稿 IEP 时保存调用 updateIEP 而非 createIEP', async () => {
    mockParams = { id: 'iep-9' };
    mockGetIEP.mockResolvedValueOnce({
      id: 'iep-9',
      student_id: 's1',
      term: '2025 秋季',
      status: 'draft',
      student_profile: '已有观察',
      supports: { teaching: [], rehab: [], family: [] },
      evaluation_plan: '',
      domain_assessments: [
        {
          domain_code: 'perception',
          domain_name: '感知',
          overall_level: null,
          summary: '',
          sort_order: 0,
          items: [
            { item_name: '注视', level: null, note: '', sort_order: 0 },
          ],
        },
      ],
      long_term_goals: [],
    });
    renderEditor();
    expect(await screen.findByText('编辑 IEP')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('iep-9', expect.any(Object))
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('未选学生时生成 AI 初稿被提示拦截', async () => {
    renderEditor();
    await screen.findByText('发展领域评估');

    fireEvent.click(screen.getByRole('button', { name: 'AI 生成初稿' }));

    expect(mockMessage.warning).toHaveBeenCalledWith(
      '请先选择学生并填写学期，再生成 AI 初稿'
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('AI 初稿：先落库再生成，采纳后目标与附加信息合入计划', async () => {
    mockGenerateDraft.mockResolvedValue(draftAI);
    renderEditor();
    await screen.findByText('发展领域评估');
    await fillStudentAndTerm();

    fireEvent.click(screen.getByRole('button', { name: 'AI 生成初稿' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith(
      '/iep/new1/edit',
      expect.objectContaining({ replace: true })
    );
    expect(await screen.findByText('AI 草稿声明')).toBeInTheDocument();

    // 分别采纳目标卡片与附加信息卡片
    fireEvent.click(screen.getAllByRole('button', { name: '采纳' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '采纳' })[1]);
    fireEvent.click(
      screen.getByRole('button', { name: '将已采纳内容加入计划' })
    );

    await waitFor(() =>
      expect(mockMessage.success).toHaveBeenCalledWith(
        '已将 1 条 AI 目标加入计划，请核对后再提交审定'
      )
    );
  });

  it('AI 草稿未全部处理时提交审定被拦截', async () => {
    mockGenerateDraft.mockResolvedValue(draftAI);
    renderEditor();
    await screen.findByText('发展领域评估');
    await fillStudentAndTerm();

    fireEvent.click(screen.getByRole('button', { name: 'AI 生成初稿' }));
    expect(await screen.findByText('AI 草稿声明')).toBeInTheDocument();

    // 不处理草稿，直接跳到复核页提交
    await goToStep(2);
    fireEvent.click(screen.getByRole('button', { name: '保存并提交审定' }));

    await waitFor(() =>
      expect(mockMessage.warning).toHaveBeenCalledWith(
        '请先处理全部 AI 草稿（逐条采纳或忽略）后再提交审定'
      )
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});

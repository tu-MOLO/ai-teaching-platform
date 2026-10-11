import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const {
  mockNavigate,
  mockGetIEP,
  mockDeleteIEP,
  mockSubmitIEP,
  mockBackIEPToDraft,
  mockLockIEP,
  mockReviseIEP,
  mockGenerateGrowthReport,
  mockGetIEPCompare,
  mockExportIEP,
  mockMessage,
  mockConfirm,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetIEP: vi.fn(),
  mockDeleteIEP: vi.fn(),
  mockSubmitIEP: vi.fn(),
  mockBackIEPToDraft: vi.fn(),
  mockLockIEP: vi.fn(),
  mockReviseIEP: vi.fn(),
  mockGenerateGrowthReport: vi.fn(),
  mockGetIEPCompare: vi.fn(),
  mockExportIEP: vi.fn(),
  mockMessage: { success: vi.fn(), error: vi.fn() },
  mockConfirm: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'iep-1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/utils/feedback', () => ({
  message: mockMessage,
  modal: { confirm: (...args: unknown[]) => mockConfirm(...args) },
}));

vi.mock('../../../services/iep', () => ({
  getIEP: (...args: unknown[]) => mockGetIEP(...args),
  deleteIEP: (...args: unknown[]) => mockDeleteIEP(...args),
  submitIEP: (...args: unknown[]) => mockSubmitIEP(...args),
  backIEPToDraft: (...args: unknown[]) => mockBackIEPToDraft(...args),
  lockIEP: (...args: unknown[]) => mockLockIEP(...args),
  reviseIEP: (...args: unknown[]) => mockReviseIEP(...args),
  generateGrowthReport: (...args: unknown[]) =>
    mockGenerateGrowthReport(...args),
  getIEPCompare: (...args: unknown[]) => mockGetIEPCompare(...args),
}));

vi.mock('../../../services/iepExport', () => ({
  exportIEP: (...args: unknown[]) => mockExportIEP(...args),
}));

vi.mock('@ant-design/icons', () => {
  const NullIcon = () => null;
  return {
    ArrowLeftOutlined: NullIcon,
    EditOutlined: NullIcon,
    DeleteOutlined: NullIcon,
    CheckCircleOutlined: NullIcon,
    RollbackOutlined: NullIcon,
    LockOutlined: NullIcon,
    CopyOutlined: NullIcon,
    DownloadOutlined: NullIcon,
    FileTextOutlined: NullIcon,
  };
});

// 局部 antd mock：Table 渲染行列以执行 render 回调
vi.mock('antd', () => {
  const h = React.createElement;
  const Table = ({ dataSource = [], columns = [], rowKey: _rk }: any) =>
    h(
      'table',
      null,
      h(
        'tbody',
        null,
        dataSource.map((row: any, i: number) =>
          h(
            'tr',
            { key: i },
            columns.map((c: any) =>
              h(
                'td',
                { key: c.dataIndex ?? c.title },
                c.render ? c.render(row[c.dataIndex as string], row, i) : row[c.dataIndex as string]
              )
            )
          )
        )
      )
    );
  const Descriptions = ({ children }: any) =>
    h('div', { 'data-testid': 'descriptions' }, children);
  Descriptions.Item = ({ label, children }: any) =>
    h('div', null, label ? h('span', null, label) : null, children);
  return {
    Button: ({ children, onClick, loading, icon }: any) =>
      h(
        'button',
        { type: 'button', onClick, disabled: !!loading },
        icon,
        children
      ),
    Card: ({ title, children, className }: any) =>
      h('div', { className }, title, children),
    Descriptions,
    Divider: ({ children }: any) => h('div', null, children),
    Empty: ({ description }: any) => h('div', null, description),
    Progress: ({ percent }: any) => h('div', null, `${percent}%`),
    Space: ({ children }: any) => h('div', null, children),
    Spin: () => h('div', { 'data-testid': 'spin' }, 'Loading'),
    Table,
    Tag: ({ children, color }: any) =>
      h('span', { 'data-color': color }, children),
    Modal: ({ open, children, title }: any) =>
      open ? h('div', { 'data-testid': 'modal' }, title, children) : null,
  };
});

vi.mock('echarts-for-react', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getEchartsInstance: () => ({ resize: vi.fn() }),
    }));
    return React.createElement('div', { 'data-testid': 'echarts' });
  }),
}));

import IEPDetailPage from '../Detail';
import type { IEP, IEPStatusValue } from '../../../services/iep';

const makeIep = (status: IEPStatusValue): IEP => ({
  id: 'iep-1',
  student_id: 'stu-1',
  student_name: '小明',
  term: '2026 春季学期',
  status,
  parent_id: status === 'locked' ? 'iep-0' : null,
  revision_no: 1,
  student_profile: '自闭症谱系，语言表达较弱。',
  evaluation_plan: '每周一次自然观察。',
  reviewed_at: status === 'locked' ? '2026-06-30T08:00:00' : null,
  domain_assessments: [
    {
      domain_code: 'language',
      domain_name: '语言',
      overall_level: 2,
      summary: '词汇量增长明显。',
      sort_order: 0,
      items: [
        { item_name: '听懂一步指令', level: 3, note: '稳定', sort_order: 0 },
        { item_name: '主动表达需求', level: null, note: null, sort_order: 1 },
      ],
    },
  ],
  long_term_goals: [
    {
      domain_code: 'language',
      domain_name: '语言',
      goal: '提升日常沟通能力',
      sort_order: 0,
      short_term_goals: [
        {
          condition: '餐前',
          behavior: '用短句表达需求',
          criterion: '连续3天',
          support_level: 2,
          status: 'achieved',
          teaching_methods: ['示范', '强化'],
          sort_order: 0,
        },
        {
          behavior: '回答简单问题',
          support_level: 1,
          status: 'in_progress',
          sort_order: 1,
        },
        {
          behavior: '复述故事',
          support_level: null,
          status: 'not_started',
          sort_order: 2,
        },
      ],
    },
  ],
  supports: {
    teaching: ['视觉时间表'],
    rehab: ['语言治疗每周2次'],
    family: ['家中使用图片交换'],
  },
  created_at: '2026-02-01T00:00:00',
  updated_at: '2026-06-01T00:00:00',
});

const compareData = {
  previous_term: '2025 秋季',
  current_term: '2026 春季',
  previous: [
    { domain_code: 'language', domain_name: '语言', overall_level: 1 },
  ],
  current: [
    { domain_code: 'language', domain_name: '语言', overall_level: 2 },
  ],
};

describe('IEPDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIEPCompare.mockResolvedValue(compareData);
  });

  it('加载失败时提示并显示空状态', async () => {
    mockGetIEP.mockRejectedValueOnce(new Error('404'));
    render(<IEPDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('未找到该 IEP')).toBeInTheDocument()
    );
    expect(mockMessage.error).toHaveBeenCalledWith('加载 IEP 失败');
  });

  it('草稿态渲染基本信息、达成率统计、未评估条目与状态化操作按钮', async () => {
    mockGetIEP.mockResolvedValue(makeIep('draft'));
    render(<IEPDetailPage />);

    await waitFor(() =>
      expect(
        screen.getByText('小明 · 2026 春季学期')
      ).toBeInTheDocument()
    );

    expect(screen.getByText('草稿')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(
      screen.getByText('自闭症谱系，语言表达较弱。')
    ).toBeInTheDocument();
    expect(screen.getByText('每周一次自然观察。')).toBeInTheDocument();

    // 3 个短期目标：1 达成 / 1 进行中 / 1 未开始 -> 达成率 33%
    expect(screen.getByText('已达成 1')).toBeInTheDocument();
    expect(screen.getByText('进行中 1')).toBeInTheDocument();
    expect(screen.getByText('未开始 1')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();

    // 领域条目 null 级别 + 短期目标 null 支持级别
    expect(screen.getAllByText('未评估').length).toBe(2);

    // 支持措施
    expect(screen.getByText('视觉时间表')).toBeInTheDocument();
    expect(screen.getByText('语言治疗每周2次')).toBeInTheDocument();
    expect(screen.getByText('家中使用图片交换')).toBeInTheDocument();

    // 草稿态按钮
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '提交审定' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '删除' })
    ).toBeInTheDocument();
  });

  it('提交审定后调用 API、提示并重新加载', async () => {
    mockGetIEP.mockResolvedValue(makeIep('draft'));
    mockSubmitIEP.mockResolvedValue(undefined);
    render(<IEPDetailPage />);
    await waitFor(() => expect(screen.getByText('草稿')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '提交审定' }));

    await waitFor(() => expect(mockSubmitIEP).toHaveBeenCalledWith('iep-1'));
    expect(mockMessage.success).toHaveBeenCalledWith('已提交审定');
    await waitFor(() => expect(mockGetIEP).toHaveBeenCalledTimes(2));
  });

  it('删除确认后调用 API、提示并返回列表', async () => {
    mockGetIEP.mockResolvedValue(makeIep('draft'));
    mockDeleteIEP.mockResolvedValue(undefined);
    render(<IEPDetailPage />);
    await waitFor(() => expect(screen.getByText('草稿')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    const opts = mockConfirm.mock.calls[0][0];

    await opts.onOk();

    expect(mockDeleteIEP).toHaveBeenCalledWith('iep-1');
    expect(mockMessage.success).toHaveBeenCalledWith('已删除');
    expect(mockNavigate).toHaveBeenCalledWith('/iep');
  });

  it('待审定态支持退回草稿与定稿', async () => {
    mockGetIEP.mockResolvedValue(makeIep('review'));
    mockBackIEPToDraft.mockResolvedValue(undefined);
    mockLockIEP.mockResolvedValue(undefined);
    render(<IEPDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('待审定')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: '退回草稿' }));
    await waitFor(() =>
      expect(mockBackIEPToDraft).toHaveBeenCalledWith('iep-1')
    );
    expect(mockMessage.success).toHaveBeenCalledWith('已退回草稿');

    fireEvent.click(screen.getByRole('button', { name: '定稿' }));
    await waitFor(() => expect(mockLockIEP).toHaveBeenCalledWith('iep-1'));
    expect(mockMessage.success).toHaveBeenCalledWith('已定稿');
  });

  it('待审定态生成 AI 成长报告并在弹窗中展示', async () => {
    mockGetIEP.mockResolvedValue(makeIep('review'));
    mockGenerateGrowthReport.mockResolvedValue({
      overview: '本学期进步明显。',
      needs_review: [],
    });
    render(<IEPDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('待审定')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'AI 成长报告' }));

    await waitFor(() =>
      expect(screen.getByText('本学期进步明显。')).toBeInTheDocument()
    );
    expect(mockGenerateGrowthReport).toHaveBeenCalledWith('iep-1');
  });

  it('AI 报告生成失败时展示错误提示', async () => {
    mockGetIEP.mockResolvedValue(makeIep('review'));
    mockGenerateGrowthReport.mockRejectedValue(new Error('模型超时'));
    render(<IEPDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('待审定')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'AI 成长报告' }));

    await waitFor(() =>
      expect(mockMessage.error).toHaveBeenCalledWith('模型超时')
    );
  });

  it('定稿态支持修订跳转、PDF 导出与期初/期末对比雷达', async () => {
    mockGetIEP.mockResolvedValue(makeIep('locked'));
    mockReviseIEP.mockResolvedValue({ id: 'iep-2' });
    mockExportIEP.mockResolvedValue(undefined);
    render(<IEPDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('已定稿')).toBeInTheDocument()
    );

    // 修订版本加载对比数据
    await waitFor(() =>
      expect(
        screen.getByText('期初 / 期末领域对比')
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: '修订（新一轮）' }));
    await waitFor(() => expect(mockReviseIEP).toHaveBeenCalledWith('iep-1'));
    expect(mockMessage.success).toHaveBeenCalledWith('已创建新一轮草稿');
    expect(mockNavigate).toHaveBeenCalledWith('/iep/iep-2/edit');

    fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));
    await waitFor(() => expect(mockExportIEP).toHaveBeenCalled());
    expect(mockMessage.success).toHaveBeenCalledWith('PDF 已导出');
  });

  it('导出失败时提示错误', async () => {
    mockGetIEP.mockResolvedValue(makeIep('locked'));
    mockExportIEP.mockRejectedValue(new Error('磁盘满'));
    render(<IEPDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('已定稿')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));

    await waitFor(() =>
      expect(mockMessage.error).toHaveBeenCalledWith('导出失败')
    );
  });
});

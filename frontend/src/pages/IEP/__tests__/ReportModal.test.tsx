import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// 局部覆盖全局 antd mock：Divider 需要承载 children（全局 mock 为 void hr）
vi.mock('antd', () => {
  const h = React.createElement;
  return {
    Modal: ({ open, title, children, footer, zIndex }: any) =>
      open
        ? h(
            'div',
            {
              'data-testid': 'modal',
              role: 'dialog',
              'data-zindex': String(zIndex),
            },
            title,
            children,
            footer
          )
        : null,
    Button: ({ children, onClick, disabled }: any) =>
      h('button', { type: 'button', onClick, disabled }, children),
    Alert: ({ message, description }: any) =>
      h('div', { 'data-testid': 'alert' }, message, description),
    Tag: ({ children }: any) => h('span', null, children),
    Space: ({ children }: any) => h('div', null, children),
    Divider: ({ children }: any) =>
      h('div', { 'data-testid': 'divider' }, children),
    Empty: ({ description }: any) => h('div', null, description),
  };
});

import ReportModal, { buildReportMarkdown } from '../ReportModal';
import type { GrowthReportAI } from '../../../services/iep';

const fullReport: GrowthReportAI = {
  ai_disclaimer: '本报告由 AI 生成草稿',
  needs_review: ['认知领域证据不足', '缺少三月观察记录'],
  overview: '本学期学生在沟通上有明显进步。',
  domain_progress: [
    {
      domain: '语言',
      start_level: 1,
      end_level: 3,
      description: '从单词表达进步到短句表达。',
      evidence_refs: ['观察记录#12', '课堂录像#3'],
    },
    {
      domain: '运动',
      description: '新学期首次评估。',
      evidence_refs: [],
    },
  ],
  goals_summary: {
    achieved: ['能独立穿外套'],
    in_progress: ['能连续拍球5次'],
    next_term_focus: ['握笔姿势'],
  },
  highlights: ['主动帮助同学'],
  family_suggestions: ['每天亲子共读15分钟'],
  generation_log_id: 'log-1',
};

describe('ReportModal', () => {
  it('report 为空时显示空状态', () => {
    render(<ReportModal open report={null} onClose={vi.fn()} />);
    expect(screen.getByText('尚未生成报告')).toBeInTheDocument();
  });

  it('关闭时不渲染弹窗内容', () => {
    render(<ReportModal open={false} report={fullReport} onClose={vi.fn()} />);
    expect(screen.queryByText('尚未生成报告')).not.toBeInTheDocument();
    expect(
      screen.queryByText('本学期学生在沟通上有明显进步。')
    ).toBeNull();
  });

  it('完整报告渲染免责声明、待核实项、领域证据与各小结区块', () => {
    render(<ReportModal open report={fullReport} onClose={vi.fn()} />);

    expect(screen.getByText('本报告由 AI 生成草稿')).toBeInTheDocument();
    expect(screen.getByText('认知领域证据不足')).toBeInTheDocument();
    expect(screen.getByText('缺少三月观察记录')).toBeInTheDocument();
    expect(
      screen.getByText('本学期学生在沟通上有明显进步。')
    ).toBeInTheDocument();

    // 领域卡片
    expect(screen.getByText('语言')).toBeInTheDocument();
    expect(
      screen.getByText('从单词表达进步到短句表达。')
    ).toBeInTheDocument();
    expect(screen.getByText('期初：1 大量辅助')).toBeInTheDocument();
    expect(screen.getByText('期末：3 独立完成')).toBeInTheDocument();
    expect(screen.getByText('观察记录#12')).toBeInTheDocument();
    expect(screen.getByText('课堂录像#3')).toBeInTheDocument();

    // 未评的领域级别（运动领域期初、期末均未评）
    expect(screen.getByText('期初：未评')).toBeInTheDocument();
    expect(screen.getByText('期末：未评')).toBeInTheDocument();

    // 目标小结
    expect(screen.getByText('能独立穿外套')).toBeInTheDocument();
    expect(screen.getByText('能连续拍球5次')).toBeInTheDocument();
    expect(screen.getByText('握笔姿势')).toBeInTheDocument();

    // 亮点与家长建议
    expect(screen.getByText('主动帮助同学')).toBeInTheDocument();
    expect(screen.getByText('每天亲子共读15分钟')).toBeInTheDocument();
  });

  it('列表项被 AI 写成 {description, evidence_refs} 对象时也能安全渲染', () => {
    const messy = {
      ...fullReport,
      needs_review: [{ description: '缺三月记录', evidence_refs: ['n1'] }],
      highlights: [{ description: '能追视5秒', evidence_refs: ['obs-1'] }],
      family_suggestions: [{ description: '在家练习追视' }],
      goals_summary: {
        achieved: [{ description: '追视达成', evidence_refs: ['stg-1'] }],
        in_progress: [],
        next_term_focus: [],
      },
      domain_progress: [
        {
          domain: '感知',
          start_level: 1,
          end_level: 2,
          description: '追视延长',
          evidence_refs: [{ description: 'obs-1' }],
        },
      ],
    } as unknown as GrowthReportAI;

    render(<ReportModal open report={messy} onClose={vi.fn()} />);

    expect(screen.getByText('缺三月记录 （依据：n1）')).toBeInTheDocument();
    expect(screen.getByText('能追视5秒 （依据：obs-1）')).toBeInTheDocument();
    expect(screen.getByText('在家练习追视')).toBeInTheDocument();
    expect(screen.getByText(/追视达成 （依据：stg-1）/)).toBeInTheDocument();
    expect(screen.getByText('obs-1')).toBeInTheDocument();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<ReportModal open report={fullReport} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('弹窗层级置于最上层（zIndex 1050），避免被侧边栏遮挡', () => {
    render(<ReportModal open report={fullReport} onClose={vi.fn()} />);
    expect(screen.getByTestId('modal')).toHaveAttribute('data-zindex', '1050');
  });

  it('导出 Markdown 覆盖概述、领域、目标、亮点与建议', () => {
    const md = buildReportMarkdown(fullReport, '小明 2026 第一学期');
    expect(md).toContain('# 小明 2026 第一学期 学期成长报告（草稿）');
    expect(md).toContain('本报告由 AI 生成草稿');
    expect(md).toContain('## 总体概述');
    expect(md).toContain('## 领域变化');
    expect(md).toContain('### 语言');
    expect(md).toContain('- 证据：观察记录#12、课堂录像#3');
    expect(md).toContain('## 目标小结');
    expect(md).toContain('## 亮点事例');
    expect(md).toContain('## 给家长的建议');
  });

  it('对象的列表项也能安全导出为可读文本', () => {
    const messy = {
      ...fullReport,
      highlights: [{ description: '能追视5秒', evidence_refs: ['obs-1'] }],
    } as unknown as GrowthReportAI;
    const md = buildReportMarkdown(messy);
    expect(md).toContain('能追视5秒 （依据：obs-1）');
  });

  it('点击「导出为 Markdown」触发文件下载', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<ReportModal open report={fullReport} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '导出为 Markdown' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });
});

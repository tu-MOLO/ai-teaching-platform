import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// 局部覆盖全局 antd mock：Divider 需要承载 children（全局 mock 为 void hr）
vi.mock('antd', () => {
  const h = React.createElement;
  return {
    Modal: ({ open, title, children, onCancel }: any) =>
      open
        ? h(
            'div',
            { 'data-testid': 'modal', role: 'dialog' },
            h('button', { type: 'button', onClick: onCancel }, '关闭'),
            title,
            children
          )
        : null,
    Alert: ({ message, description }: any) =>
      h('div', { 'data-testid': 'alert' }, message, description),
    Tag: ({ children }: any) => h('span', null, children),
    Space: ({ children }: any) => h('div', null, children),
    Divider: ({ children }: any) =>
      h('div', { 'data-testid': 'divider' }, children),
    Empty: ({ description }: any) => h('div', null, description),
  };
});

import ReportModal from '../ReportModal';
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

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<ReportModal open report={fullReport} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

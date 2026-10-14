import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('antd', () => {
  const DrawerComp = ({ open, title, children, footer }: any) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'drawer' },
          title,
          children,
          footer
        )
      : null;
  return {
    Drawer: DrawerComp,
    Card: ({ title, extra, children }: any) =>
      React.createElement('div', null, title, extra, children),
    Button: ({ children, onClick, disabled }: any) =>
      React.createElement(
        'button',
        { type: 'button', onClick, disabled },
        children
      ),
    Space: ({ children }: any) => React.createElement('div', null, children),
    Tag: ({ children }: any) => React.createElement('span', null, children),
    Alert: ({ message, description }: any) =>
      React.createElement('div', null, message, description),
    Divider: ({ children }: any) =>
      React.createElement('div', null, children),
    Input: Object.assign((props: any) => React.createElement('input', props), {
      TextArea: (props: any) =>
        React.createElement('textarea', {
          value: props.value,
          onChange: props.onChange,
          placeholder: props.placeholder,
        }),
    }),
  };
});

import AIDraftDrawer from '../AIDraftDrawer';
import type { IEPDraftAI, IEPDraftSection } from '../../../services/iep';

const draft: IEPDraftAI = {
  ai_disclaimer: 'AI 草稿声明',
  missing_info: ['需补充家庭情况'],
  student_profile: '喜欢拼图，能用简单句表达',
  domain_summaries: [
    { domain: '感知', current_level: '视觉追踪需少量辅助', priority: 'high' },
  ],
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

const renderDrawer = (section: IEPDraftSection) => {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <AIDraftDrawer
      open
      section={section}
      draft={draft}
      onClose={onClose}
      onApply={onApply}
    />
  );
  return { onApply, onClose };
};

describe('AIDraftDrawer human-in-the-loop（按页生成）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('goals 页：展示声明与待处理状态，采纳后只提交目标', () => {
    const { onApply } = renderDrawer('goals');
    expect(screen.getByText('AI 草稿声明')).toBeInTheDocument();
    expect(screen.getByText('需补充家庭情况')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    expect(screen.getByText('已采纳')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '将已采纳目标加入计划' })
    );
    expect(onApply).toHaveBeenCalledTimes(1);
    const result = onApply.mock.calls[0][0];
    expect(result.section).toBe('goals');
    expect(result.goals[0].domain).toBe('感知');
    expect(result.goals[0].goal).toBe('提升追踪');
    expect(result.goals[0].shortTermGoals[0].behavior).toBe('追视');
  });

  it('goals 页：未采纳时按钮不可用', () => {
    renderDrawer('goals');
    expect(
      screen.getByRole('button', { name: '将已采纳目标加入计划' })
    ).toBeDisabled();
  });

  it('profile 页：只提交学生基本情况与领域小结', () => {
    const { onApply } = renderDrawer('profile');
    expect(screen.getByText('视觉追踪需少量辅助')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('学生基本情况（可修改后采纳）');
    fireEvent.change(textarea, { target: { value: '修改后的基本情况' } });

    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    fireEvent.click(screen.getByRole('button', { name: '采纳并填入本页' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const result = onApply.mock.calls[0][0];
    expect(result.section).toBe('profile');
    expect(result.profile.studentProfile).toBe('修改后的基本情况');
    expect(result.profile.domainSummaries).toEqual([
      { domain: '感知', summary: '视觉追踪需少量辅助' },
    ]);
  });

  it('supports 页：只提交支持措施与评价方式', () => {
    const { onApply } = renderDrawer('supports');
    expect(screen.getByText(/每周观察/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    fireEvent.click(screen.getByRole('button', { name: '采纳并填入本页' }));

    const result = onApply.mock.calls[0][0];
    expect(result.section).toBe('supports');
    expect(result.supports.evaluationPlan).toBe('每周观察');
    expect(result.supports.supports.teaching).toEqual(['视觉提示']);
  });
});

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
    Space: ({ children }: any) =>
      React.createElement('div', null, children),
    Tag: ({ children }: any) =>
      React.createElement('span', null, children),
    Alert: ({ message, description }: any) =>
      React.createElement('div', null, message, description),
    Divider: ({ children }: any) =>
      React.createElement('div', null, children),
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      {
        TextArea: (props: any) =>
          React.createElement('textarea', {
            value: props.value,
            onChange: props.onChange,
            placeholder: props.placeholder,
          }),
      }
    ),
  };
});

import AIDraftDrawer from '../AIDraftDrawer';
import type { IEPDraftAI } from '../../../services/iep';

const draft: IEPDraftAI = {
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

const renderDrawer = () => {
  const onApply = vi.fn();
  const onHandledChange = vi.fn();
  const onClose = vi.fn();
  render(
    <AIDraftDrawer
      open
      draft={draft}
      onClose={onClose}
      onApply={onApply}
      onHandledChange={onHandledChange}
    />
  );
  return { onApply, onHandledChange, onClose };
};

describe('AIDraftDrawer human-in-the-loop', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows disclaimer, missing info and pending decisions', () => {
    renderDrawer();
    expect(screen.getByText('AI 草稿声明')).toBeInTheDocument();
    expect(screen.getByText('需补充家庭情况')).toBeInTheDocument();
    // goal card + extras card both pending
    expect(screen.getAllByText('待处理').length).toBe(2);
  });

  it('requires both goals and extras to be handled before all-handled', () => {
    const { onHandledChange } = renderDrawer();
    const adoptButtons = screen.getAllByRole('button', { name: '采纳' });

    // accept goal only -> extras still pending
    fireEvent.click(adoptButtons[0]);
    const lastAfterGoal =
      onHandledChange.mock.calls[onHandledChange.mock.calls.length - 1][0];
    expect(lastAfterGoal).toBe(false);
    expect(screen.getAllByText('已采纳').length).toBe(1);

    // accept extras too
    fireEvent.click(adoptButtons[1]);
    const lastFinal =
      onHandledChange.mock.calls[onHandledChange.mock.calls.length - 1][0];
    expect(lastFinal).toBe(true);
  });

  it('treats ignore as handled and still allows applying extras', () => {
    const { onHandledChange } = renderDrawer();
    const ignoreButtons = screen.getAllByRole('button', { name: '忽略' });
    const adoptButtons = screen.getAllByRole('button', { name: '采纳' });

    fireEvent.click(ignoreButtons[0]); // ignore goal
    fireEvent.click(adoptButtons[1]); // accept extras
    const last =
      onHandledChange.mock.calls[onHandledChange.mock.calls.length - 1][0];
    expect(last).toBe(true);
  });

  it('applies accepted goals mapped with short-term goals and extras', () => {
    const { onApply } = renderDrawer();
    const adoptButtons = screen.getAllByRole('button', { name: '采纳' });
    fireEvent.click(adoptButtons[0]);
    fireEvent.click(adoptButtons[1]);

    fireEvent.click(
      screen.getByRole('button', { name: '将已采纳内容加入计划' })
    );

    expect(onApply).toHaveBeenCalledTimes(1);
    const [goals, extras] = onApply.mock.calls[0];
    expect(goals[0].domain).toBe('感知');
    expect(goals[0].goal).toBe('提升追踪');
    expect(goals[0].shortTermGoals[0].behavior).toBe('追视');
    expect(goals[0].shortTermGoals[0].support_level).toBe(2);
    expect(extras.evaluationPlan).toBe('每周观察');
    expect(extras.supports.teaching).toEqual(['视觉提示']);
  });
});

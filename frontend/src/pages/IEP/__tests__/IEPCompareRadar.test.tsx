import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// 适配全局 antd mock：Table 默认只输出计数，这里渲染行列以断言变化标签
vi.mock('antd', () => {
  const h = React.createElement;
  const Card = ({ title, children, className }: any) =>
    h('div', { 'data-testid': 'card', className }, title, children);
  const Tag = ({ children, color }: any) =>
    h('span', { 'data-testid': 'tag', 'data-color': color }, children);
  const Table = ({ dataSource = [], columns = [] }: any) =>
    h(
      'table',
      null,
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          columns.map((c: any) => h('th', { key: c.title }, c.title))
        )
      ),
      h(
        'tbody',
        null,
        dataSource.map((row: any, i: number) =>
          h(
            'tr',
            { key: row.key ?? i },
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
  return {
    Card,
    Tag,
    Table,
    Space: ({ children }: any) => h('div', null, children),
  };
});

vi.mock('echarts-for-react', () => ({
  default: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getEchartsInstance: () => ({ resize: vi.fn() }),
    }));
    return React.createElement('div', {
      'data-testid': 'echarts',
      'data-option': JSON.stringify(props.option),
    });
  }),
}));

import IEPCompareRadar from '../IEPCompareRadar';
import type { IEPCompare } from '../../../services/iep';

const compare: IEPCompare = {
  previous_term: '2025 秋季',
  current_term: '2026 春季',
  previous: [
    { domain_code: 'perception', domain_name: '感知觉', overall_level: 1 },
    { domain_code: 'cognition', domain_name: '认知', overall_level: 2 },
    { domain_code: 'language', domain_name: '语言', overall_level: 1 },
    { domain_code: 'self_care', domain_name: '生活自理', overall_level: 1 },
    { domain_code: 'social', domain_name: '社会适应', overall_level: 2 },
  ],
  current: [
    { domain_code: 'perception', domain_name: '感知觉', overall_level: 2 },
    { domain_code: 'cognition', domain_name: '认知', overall_level: 1 },
    { domain_code: 'language', domain_name: '语言', overall_level: 1 },
    { domain_code: 'motor', domain_name: '运动', overall_level: 2 },
    { domain_code: 'self_care', domain_name: '生活自理', overall_level: null },
  ],
};

describe('IEPCompareRadar', () => {
  it('渲染标题、学期列名与口径注释', () => {
    render(<IEPCompareRadar compare={compare} />);
    expect(screen.getByText('期初 / 期末领域对比')).toBeInTheDocument();
    expect(screen.getByText('2025 秋季')).toBeInTheDocument();
    expect(screen.getByText('2026 春季')).toBeInTheDocument();
    expect(
      screen.getByText(/级别 0–3（数字越大越独立）/)
    ).toBeInTheDocument();
  });

  it('表格覆盖进步/退步/持平/新评/未评五种变化', () => {
    render(<IEPCompareRadar compare={compare} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('新评')).toBeInTheDocument();
    // motor 上学期未评、self_care 本学期未评、social 仅上学期有
    expect(screen.getAllByText('未评').length).toBe(3);
  });

  it('领域按固定六领域顺序排列，仅上学期有的领域名称可回退', () => {
    const { getByTestId } = render(<IEPCompareRadar compare={compare} />);
    const option = JSON.parse(
      getByTestId('echarts').getAttribute('data-option')!
    );
    expect(option.radar.indicator.map((i: any) => i.name)).toEqual([
      '感知觉',
      '认知',
      '语言',
      '运动',
      '生活自理',
      '社会适应',
    ]);
    // null 值以 null 传入 echarts，不参与连线
    expect(option.series[0].data[0].value).toEqual([1, 2, 1, null, 1, 2]);
    expect(option.series[0].data[1].value).toEqual([2, 1, 1, 2, null, null]);
    expect(option.legend.data).toEqual(['2025 秋季', '2026 春季']);
  });

  it('学期缺省名回退为 上学期/本学期', () => {
    const fallback = {
      previous_term: null,
      current_term: '',
      previous: [],
      current: [],
    } as unknown as IEPCompare;
    render(<IEPCompareRadar compare={fallback} />);
    expect(screen.getAllByText('上学期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('本学期').length).toBeGreaterThan(0);
  });
});

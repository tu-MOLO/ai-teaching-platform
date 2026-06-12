import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import EvaluationForm from '../EvaluationForm'

vi.mock('antd', () => ({
  Form: Object.assign(
    (props: any) => React.createElement('form', props, props.children),
    {
      Item: ({ children, name, label }: any) =>
        React.createElement('div', { 'data-testid': `form-item-${name?.join?.('.') || name}` }, label, children),
      useFormInstance: () => ({}),
      useWatch: () => ({}),
    }
  ),
  Rate: ({ count, character }: any) =>
    React.createElement('div', { 'data-testid': 'rate', 'data-count': count }, character),
  Space: ({ children, direction }: any) =>
    React.createElement('div', { 'data-testid': `space-${direction || 'horizontal'}` }, children),
  Typography: {
    Text: ({ children }: any) => React.createElement('span', null, children),
  },
  Tooltip: ({ children }: any) => React.createElement('div', null, children),
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Statistic: ({ title, value }: any) =>
    React.createElement('div', { 'data-testid': 'statistic' }, title, value),
  Row: ({ children }: any) => React.createElement('div', { 'data-testid': 'row' }, children),
  Col: ({ children }: any) => React.createElement('div', { 'data-testid': 'col' }, children),
  Collapse: Object.assign(
    ({ children }: any) => React.createElement('div', { 'data-testid': 'collapse' }, children),
    { Panel: ({ children }: any) => React.createElement('div', { 'data-testid': 'collapse-panel' }, children) }
  ),
  theme: { useToken: () => ({ token: {} }) },
  Divider: () => React.createElement('hr'),
}))

vi.mock('@ant-design/icons', () => ({
  InfoCircleOutlined: () => React.createElement('span', null, 'Info'),
  StarOutlined: () => React.createElement('span', null, 'Star'),
  CheckCircleOutlined: () => React.createElement('span', null, 'Check'),
  CalculatorOutlined: () => React.createElement('span', null, 'Calc'),
  BarChartOutlined: () => React.createElement('span', null, 'Chart'),
}))

describe('EvaluationForm', () => {
  it('renders default dimensions', () => {
    render(React.createElement(EvaluationForm))
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('rate').length).toBeGreaterThan(0)
  })

  it('renders with custom dimensions', () => {
    const dimensions = [
      { name: '逻辑思维', description: '逻辑能力' },
      { name: '创新能力', description: '创新能力' },
    ]
    render(React.createElement(EvaluationForm, { dimensions }))
    expect(screen.getAllByTestId('rate').length).toBe(2)
  })

  it('renders statistics by default', () => {
    render(React.createElement(EvaluationForm))
    expect(screen.getAllByTestId('statistic').length).toBeGreaterThan(0)
  })

  it('renders without statistics when showStatistics is false', () => {
    render(React.createElement(EvaluationForm, { showStatistics: false }))
    expect(screen.queryByTestId('statistic')).not.toBeInTheDocument()
  })

  it('renders collapse form when useCollapse is true', () => {
    render(React.createElement(EvaluationForm, { useCollapse: true }))
    expect(screen.getByTestId('collapse')).toBeInTheDocument()
  })
})

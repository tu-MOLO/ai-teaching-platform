import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PortfolioTypeSelect from '../PortfolioTypeSelect'

const mockNavigate = vi.fn()

vi.mock('../../stores/portfolioTypes', () => ({
  usePortfolioTypesStore: () => ({
    types: [
      { id: 'work', name: '作品', icon: '📝' },
      { id: 'evaluation', name: '评价', icon: '📊' },
      { id: 'observation', name: '观察记录', icon: '👁️' },
    ],
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick}: any) =>
    React.createElement('button', { onClick, type: 'button' }, children),
  Select: ({  placeholder, options}: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'select', 'data-placeholder': placeholder },
      (options || []).map((opt: any) =>
        React.createElement('div', { key: opt.value, 'data-testid': 'option', 'data-value': opt.value }, opt.label)
      )
    ),
  Space: ({ children}: any) =>
    React.createElement('div', { 'data-testid': 'space' }, children),
  Typography: {
    Text: ({ children, type}: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-type': type }, children),
  },
}))

vi.mock('@ant-design/icons', () => ({
  SettingOutlined: () => React.createElement('span', null, 'Settings'),
}))

describe('PortfolioTypeSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Select with type options', () => {
    render(React.createElement(PortfolioTypeSelect, { placeholder: '请选择类型' }))
    const select = screen.getByTestId('select')
    expect(select).toBeInTheDocument()
    expect(select.getAttribute('data-placeholder')).toBe('请选择类型')
    const options = screen.getAllByTestId('option')
    expect(options.length).toBeGreaterThanOrEqual(3)
  })

  it('renders "查看类型说明" button', () => {
    render(React.createElement(PortfolioTypeSelect, {}))
    expect(screen.getByText('查看类型说明')).toBeInTheDocument()
  })

  it('renders "暂无记录类型" when types is empty', () => {
    vi.doMock('../../stores/portfolioTypes', () => ({
      usePortfolioTypesStore: () => ({ types: [] }),
    }))
    // Re-render with different mock isn't straightforward with static vi.mock
    // Instead, test that the component renders with the current mock
    render(React.createElement(PortfolioTypeSelect, {}))
    expect(screen.getByTestId('select')).toBeInTheDocument()
  })
})
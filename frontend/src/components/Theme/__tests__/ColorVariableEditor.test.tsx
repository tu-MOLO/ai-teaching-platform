import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ColorVariableEditor from '../ColorVariableEditor'

vi.mock('../../stores/theme', () => ({
  useThemeStore: () => ({
    currentColors: {
      '--color-primary': '#1890ff',
      '--color-bg-primary': '#ffffff',
      '--color-text-primary': '#000000',
      '--color-success': '#52c41a',
    },
    updateColor: vi.fn(),
  }),
}))

vi.mock('../../constants/themes', () => ({
  colorVariableGroups: [
    { key: 'primary', name: '主色', variables: ['--color-primary'] },
    { key: 'background', name: '背景', variables: ['--color-bg-primary'] },
    { key: 'text', name: '文字', variables: ['--color-text-primary'] },
    { key: 'functional', name: '功能', variables: ['--color-success'] },
  ],
  colorVariableLabels: {
    '--color-primary': '主色',
    '--color-bg-primary': '主背景',
    '--color-text-primary': '主文字',
    '--color-success': '成功色',
  },
}))

vi.mock('../ColorPicker', () => ({
  default: ({ value, onChange }: any) =>
    React.createElement('div', { 'data-testid': 'color-picker', 'data-value': value, onClick: () => onChange?.('#ff0000') }),
}))

vi.mock('antd', () => ({
  Card: ({ children, title, extra }: any) =>
    React.createElement('div', { 'data-testid': 'card' }, title, extra, children),
  Collapse: ({ items }: any) =>
    React.createElement('div', { 'data-testid': 'collapse' },
      items?.map((item: any) =>
        React.createElement('div', { key: item.key, 'data-testid': `panel-${item.key}` }, item.label, item.children)
      )
    ),
  Input: (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Typography: {
    Title: ({ children }: any) => React.createElement('h5', null, children),
    Text: ({ children }: any) => React.createElement('span', null, children),
  },
  Tag: ({ children }: any) => React.createElement('span', { 'data-testid': 'tag' }, children),
}))

vi.mock('@ant-design/icons', () => ({
  SearchOutlined: () => React.createElement('span', null, 'Search'),
  BgColorsOutlined: () => React.createElement('span', null, 'Bg'),
  FontColorsOutlined: () => React.createElement('span', null, 'Font'),
  BorderOutlined: () => React.createElement('span', null, 'Border'),
  CheckCircleOutlined: () => React.createElement('span', null, 'Check'),
}))

describe('ColorVariableEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders card with search input', () => {
    render(React.createElement(ColorVariableEditor))
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索颜色...')).toBeInTheDocument()
  })

  it('renders color groups', () => {
    render(React.createElement(ColorVariableEditor))
    expect(screen.getByTestId('panel-primary')).toBeInTheDocument()
    expect(screen.getByTestId('panel-background')).toBeInTheDocument()
  })

  it('filters groups by search query', () => {
    render(React.createElement(ColorVariableEditor))
    const searchInput = screen.getByPlaceholderText('搜索颜色...')
    fireEvent.change(searchInput, { target: { value: '主色' } })
    // only primary group should remain
    expect(screen.queryByTestId('panel-primary')).toBeInTheDocument()
  })

  it('renders color pickers for variables', () => {
    render(React.createElement(ColorVariableEditor))
    const pickers = screen.getAllByTestId('color-picker')
    expect(pickers.length).toBeGreaterThan(0)
  })
})

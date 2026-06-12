import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ContrastWarning, { ContrastDetails } from '../ContrastWarning'

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    currentColors: {
      '--color-text-primary': '#000000',
      '--color-bg-primary': '#ffffff',
      '--color-text-secondary': '#666666',
      '--color-text-inverse': '#ffffff',
      '--color-primary': '#1890ff',
      '--color-bg-sidebar': '#001529',
      '--color-bg-card': '#ffffff',
    },
    updateColor: vi.fn(),
  }),
}))

vi.mock('antd', () => ({
  Alert: ({ message, description, type }: any) =>
    React.createElement('div', { 'data-testid': 'alert', 'data-type': type }, message, description),
  Tooltip: ({ children }: any) => React.createElement('div', null, children),
  Space: ({ children, direction }: any) =>
    React.createElement('div', { 'data-testid': `space-${direction || 'horizontal'}` }, children),
  Typography: {
    Text: ({ children, strong }: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-strong': strong }, children),
  },
  Badge: ({ count }: any) => React.createElement('span', { 'data-testid': 'badge' }, count),
}))

vi.mock('@ant-design/icons', () => ({
  WarningOutlined: () => React.createElement('span', null, 'Warn'),
  CheckCircleOutlined: () => React.createElement('span', null, 'Check'),
  InfoCircleOutlined: () => React.createElement('span', null, 'Info'),
}))

vi.mock('@/utils/color', () => ({
  getContrastRatio: () => 21,
  meetsWCAGAA: () => true,
  formatContrastRatio: (r: number) => `${r}:1`,
  getSuggestedColor: (fg: string) => fg,
}))

describe('ContrastWarning', () => {
  it('renders success alert when all checks pass', () => {
    render(React.createElement(ContrastWarning))
    const alert = screen.getByTestId('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('可访问性检查通过')
  })
})

describe('ContrastDetails', () => {
  it('renders contrast details', () => {
    render(React.createElement(ContrastDetails))
    expect(screen.getByText('对比度详情')).toBeInTheDocument()
    const spaces = screen.getAllByTestId('space-horizontal')
    expect(spaces.length).toBeGreaterThan(0)
  })
})

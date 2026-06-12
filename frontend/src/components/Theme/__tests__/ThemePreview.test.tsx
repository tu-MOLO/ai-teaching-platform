import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ThemePreview from '../ThemePreview'

vi.mock('../../stores/theme', () => ({
  useThemeStore: () => ({
    currentColors: {
      '--color-primary': '#1890ff',
      '--color-bg-primary': '#ffffff',
      '--color-text-primary': '#000000',
      '--color-success': '#52c41a',
      '--color-warning': '#faad14',
      '--color-error': '#ff4d4f',
    },
  }),
}))

vi.mock('antd', () => ({
  Card: ({ children, title, styles, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'card', ...props }, title, children),
  Button: ({ children, icon, ...props }: any) =>
    React.createElement('button', { 'data-testid': 'btn', ...props }, icon, children),
  Input: Object.assign(
    (props: any) => React.createElement('input', props),
    {
      Search: (props: any) => React.createElement('input', { type: 'search', ...props }),
    }
  ),
  Tag: ({ children, color }: any) =>
    React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
  Badge: ({ children, count }: any) =>
    React.createElement('span', { 'data-testid': 'badge', 'data-count': count }, children),
  Space: ({ children, direction, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'space', ...props }, children),
  Typography: {
    Title: ({ children, level, style }: any) =>
      React.createElement(`h${level || 2}`, { 'data-testid': 'title', style }, children),
    Text: ({ children, type, style }: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-type': type, style }, children),
    Paragraph: ({ children }: any) => React.createElement('p', null, children),
  },
  Divider: (props: any) => React.createElement('hr', props),
  Alert: ({ message, type }: any) =>
    React.createElement('div', { 'data-testid': 'alert', 'data-type': type }, message),
}))

vi.mock('@ant-design/icons', () => ({
  CheckCircleOutlined: () => React.createElement('span', null, 'Check'),
  ExclamationCircleOutlined: () => React.createElement('span', null, 'Exclamation'),
  InfoCircleOutlined: () => React.createElement('span', null, 'Info'),
  CloseCircleOutlined: () => React.createElement('span', null, 'Close'),
  DeleteOutlined: () => React.createElement('span', null, 'Delete'),
  SaveOutlined: () => React.createElement('span', null, 'Save'),
}))

describe('ThemePreview', () => {
  it('renders preview card', () => {
    render(React.createElement(ThemePreview))
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0)
  })

  it('renders button styles section', () => {
    render(React.createElement(ThemePreview))
    const buttons = screen.getAllByTestId('btn')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders tags section', () => {
    render(React.createElement(ThemePreview))
    const tags = screen.getAllByTestId('tag')
    expect(tags.length).toBeGreaterThan(0)
  })

  it('renders badges section', () => {
    render(React.createElement(ThemePreview))
    const badges = screen.getAllByTestId('badge')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('renders alerts section', () => {
    render(React.createElement(ThemePreview))
    const alerts = screen.getAllByTestId('alert')
    expect(alerts.length).toBeGreaterThan(0)
  })
})

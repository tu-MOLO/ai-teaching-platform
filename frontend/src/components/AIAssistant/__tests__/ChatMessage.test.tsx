import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ChatMessage from '../ChatMessage'

vi.mock('../../../services/ai', () => ({
  MODULE_OPTIONS: [
    { key: 'lesson_plan', label: '教案设计', color: 'blue' },
    { key: 'evaluation', label: '教学评价', color: 'green' },
  ],
}))

vi.mock('@uiw/react-md-editor', () => ({
  default: {
    Markdown: ({ source }: any) =>
      React.createElement('div', { 'data-testid': 'markdown-content' }, source),
  },
}))

vi.mock('antd', () => ({
  Tag: ({ children, color, className}: any) =>
    React.createElement('span', { 'data-testid': 'tag', 'data-color': color, className }, children),
}))

vi.mock('@ant-design/icons', () => ({
  UserOutlined: () => React.createElement('span', { 'data-testid': 'user-icon' }, 'User'),
  RobotOutlined: () => React.createElement('span', { 'data-testid': 'robot-icon' }, 'Robot'),
}))

describe('ChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders user message with content', () => {
    const message = { role: 'user', content: 'Hello, AI!' } as any
    render(React.createElement(ChatMessage, { message }))
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument()
    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
  })

  it('renders assistant message with markdown', () => {
    const message = { role: 'assistant', content: '## Markdown Content' } as any
    render(React.createElement(ChatMessage, { message }))
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    expect(screen.getByTestId('robot-icon')).toBeInTheDocument()
  })

  it('renders module tag when module_tag is set', () => {
    const message = { role: 'assistant', content: 'Response', module_tag: 'lesson_plan' } as any
    render(React.createElement(ChatMessage, { message }))
    const tag = screen.getByTestId('tag')
    expect(tag).toBeInTheDocument()
    expect(tag.getAttribute('data-color')).toBe('blue')
    expect(tag.textContent).toBe('教案设计')
  })

  it('renders without module tag when module_tag is undefined', () => {
    const message = { role: 'assistant', content: 'Response' } as any
    render(React.createElement(ChatMessage, { message }))
    expect(screen.queryByTestId('tag')).not.toBeInTheDocument()
  })

  it('renders without module tag when module_tag is unknown', () => {
    const message = { role: 'assistant', content: 'Response', module_tag: 'unknown_key' } as any
    render(React.createElement(ChatMessage, { message }))
    expect(screen.queryByTestId('tag')).not.toBeInTheDocument()
  })

  it('renders long content correctly', () => {
    const longText = 'A'.repeat(150)
    const message = { role: 'user', content: longText } as any
    render(React.createElement(ChatMessage, { message }))
    expect(screen.getByText(longText)).toBeInTheDocument()
  })

  it('renders with empty content', () => {
    const message = { role: 'assistant', content: '' } as any
    render(React.createElement(ChatMessage, { message }))
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
  })
})
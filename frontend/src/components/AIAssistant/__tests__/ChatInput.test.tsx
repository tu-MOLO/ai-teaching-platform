import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ChatInput from '../ChatInput'

vi.mock('antd', () => ({
  Input: Object.assign(
    (props: any) => React.createElement('textarea', { ...props, 'data-testid': 'textarea' }),
    { TextArea: (props: any) => React.createElement('textarea', { ...props, 'data-testid': 'textarea' }) }
  ),
  Button: ({ onClick, disabled, icon }: any) =>
    React.createElement('button', { onClick, disabled, 'data-testid': 'send-btn' }, icon, '发送'),
  Tag: ({ children, color, closable, onClose, onClick }: any) =>
    React.createElement('span', { 'data-testid': 'tag', 'data-color': color, onClick }, children, closable ? React.createElement('span', { onClick: onClose, 'data-testid': 'tag-close' }, '×') : null),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
}))

vi.mock('@ant-design/icons', () => ({
  SendOutlined: () => React.createElement('span', null, 'Send'),
}))

const moduleOptions = [
  { key: 'lesson_plan', label: '教案设计', color: 'blue' },
  { key: 'evaluation', label: '教学评价', color: 'green' },
]

describe('ChatInput', () => {
  const mockOnSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea and send button', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, moduleOptions }))
    expect(screen.getByTestId('textarea')).toBeInTheDocument()
    expect(screen.getByTestId('send-btn')).toBeInTheDocument()
  })

  it('renders module tags', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, moduleOptions }))
    const tags = screen.getAllByTestId('tag')
    expect(tags.length).toBe(moduleOptions.length)
  })

  it('selects module on click', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, moduleOptions }))
    const tags = screen.getAllByTestId('tag')
    fireEvent.click(tags[0])
    expect(screen.getByTestId('tag-close')).toBeInTheDocument()
  })

  it('sends message on button click', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, moduleOptions }))
    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByTestId('send-btn'))
    expect(mockOnSend).toHaveBeenCalledWith('Hello', undefined)
  })

  it('sends message with selected module', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, moduleOptions }))
    const tags = screen.getAllByTestId('tag')
    fireEvent.click(tags[0])
    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByTestId('send-btn'))
    expect(mockOnSend).toHaveBeenCalledWith('Hello', 'lesson_plan')
  })

  it('sends on Enter key', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, moduleOptions }))
    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(mockOnSend).toHaveBeenCalled()
  })

  it('does not send when disabled', () => {
    render(React.createElement(ChatInput, { onSend: mockOnSend, disabled: true, moduleOptions }))
    const textarea = screen.getByTestId('textarea')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByTestId('send-btn'))
    expect(mockOnSend).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import ConversationList from '../ConversationList'

vi.mock('antd', () => {
  const ListItem = ({ children, className, onClick, actions}: any) =>
    React.createElement(
      'div',
      { className, onClick, 'data-testid': 'list-item' },
      children,
      actions ? React.createElement('div', { 'data-testid': 'list-item-actions' }, ...actions) : null
    )

  const ListItemMeta = ({  title, description}: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'list-item-meta' },
      React.createElement('span', { 'data-testid': 'meta-title' }, title),
      React.createElement('span', { 'data-testid': 'meta-desc' }, description)
    )

  ListItem.Meta = ListItemMeta

  const ListComp = ({ dataSource, renderItem}: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'list' },
      (dataSource || []).map((item: any, index: number) =>
        renderItem(item, index)
      )
    )
  ListComp.Item = ListItem

  return {
    Button: ({ children, onClick}: any) =>
      React.createElement('button', { onClick, type: 'button' }, children),
    List: ListComp,
    Popconfirm: ({ children, onConfirm}: any) =>
      React.createElement(
        'div',
        {
          'data-testid': 'popconfirm',
          onClick: (e: any) => {
            e.stopPropagation()
            onConfirm?.(e)
          },
        },
        children
      ),
    Input: ({ value, onChange, onPressEnter, onBlur, onKeyDown}: any) =>
      React.createElement('input', {
        value,
        'data-testid': 'rename-input',
        onChange: onChange ? (e: any) => onChange(e) : undefined,
        onKeyDown: (e: any) => {
          if (e.key === 'Enter' && onPressEnter) onPressEnter(e)
          if (e.key === 'Escape' && onKeyDown) onKeyDown(e)
        },
        onBlur,
        type: 'text',
      }),
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

vi.mock('@ant-design/icons', () => ({
  PlusOutlined: () => React.createElement('span', { 'data-testid': 'plus-icon' }, 'Plus'),
  DeleteOutlined: () => React.createElement('span', { 'data-testid': 'delete-icon' }, 'Delete'),
  MessageOutlined: () => React.createElement('span', { 'data-testid': 'message-icon' }, 'Message'),
  EditOutlined: () => React.createElement('span', { 'data-testid': 'edit-icon' }, 'Edit'),
}))

describe('ConversationList', () => {
  const mockOnSelect = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnNew = vi.fn()
  const mockOnRename = vi.fn().mockResolvedValue(undefined)

  const conversations = [
    { id: '1', title: 'Conversation 1', updated_at: '2024-01-01T00:00:00Z', module: null, created_at: '2024-01-01T00:00:00Z' },
    { id: '2', title: 'Conversation 2', updated_at: '2024-01-02T00:00:00Z', module: null, created_at: '2024-01-02T00:00:00Z' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "新建对话" button', () => {
    render(
      React.createElement(ConversationList, {
        conversations,
        currentId: null,
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
      })
    )
    expect(screen.getByText('新建对话')).toBeInTheDocument()
  })

  it('renders conversation list items', () => {
    render(
      React.createElement(ConversationList, {
        conversations,
        currentId: null,
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
      })
    )
    expect(screen.getByText('Conversation 1')).toBeInTheDocument()
    expect(screen.getByText('Conversation 2')).toBeInTheDocument()
  })

  it('active conversation has "active" class', () => {
    render(
      React.createElement(ConversationList, {
        conversations,
        currentId: '1',
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
      })
    )
    const items = screen.getAllByTestId('list-item')
    expect(items[0].className).toContain('active')
  })

  it('calls onNew when "新建对话" is clicked', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(ConversationList, {
        conversations,
        currentId: null,
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
      })
    )
    await user.click(screen.getByText('新建对话'))
    expect(mockOnNew).toHaveBeenCalled()
  })

  it('calls onSelect when conversation item is clicked', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(ConversationList, {
        conversations,
        currentId: null,
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
      })
    )
    const items = screen.getAllByTestId('list-item')
    await user.click(items[0])
    expect(mockOnSelect).toHaveBeenCalledWith('1')
  })

  it('renders empty state when conversations is empty array', () => {
    render(
      React.createElement(ConversationList, {
        conversations: [],
        currentId: null,
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
      })
    )
    expect(screen.getByText('新建对话')).toBeInTheDocument()
  })
})
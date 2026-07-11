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
    Switch: ({ checked, onChange }: any) =>
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange: onChange ? () => onChange(!checked) : undefined,
        'data-testid': 'archive-switch',
      }),
    Tooltip: ({ children }: any) =>
      React.createElement('span', { 'data-testid': 'tooltip' }, children),
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
  InboxOutlined: () => React.createElement('span', { 'data-testid': 'inbox-icon' }, 'Inbox'),
}))

describe('ConversationList', () => {
  const mockOnSelect = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnNew = vi.fn()
  const mockOnRename = vi.fn().mockResolvedValue(undefined)
  const mockOnArchive = vi.fn().mockResolvedValue(undefined)
  const mockOnToggleShowArchived = vi.fn()

  const conversations = [
    { id: '1', title: 'Conversation 1', updated_at: '2024-01-01T00:00:00Z', module: null, created_at: '2024-01-01T00:00:00Z', is_archived: false },
    { id: '2', title: 'Conversation 2', updated_at: '2024-01-02T00:00:00Z', module: null, created_at: '2024-01-02T00:00:00Z', is_archived: false },
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
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
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
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
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
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
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
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
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
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
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
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
      })
    )
    expect(screen.getByText('新建对话')).toBeInTheDocument()
  })
})
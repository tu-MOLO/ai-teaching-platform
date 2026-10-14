import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import ConversationList from '../ConversationList'

const { mockModalConfirm } = vi.hoisted(() => ({ mockModalConfirm: vi.fn() }))

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
    Button: ({ children, onClick, icon}: any) =>
      React.createElement('button', { onClick, type: 'button' }, icon, children),
    List: ListComp,
    Dropdown: ({ children, menu }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown' },
        children,
        React.createElement(
          'div',
          { 'data-testid': 'dropdown-menu' },
          (menu?.items || []).map((it: any) =>
            React.createElement(
              'button',
              {
                key: it.key,
                type: 'button',
                onClick: () =>
                  menu?.onClick?.({ key: it.key, domEvent: { stopPropagation: () => {} } }),
              },
              it.label
            )
          )
        )
      ),
    Modal: Object.assign((props: any) => null, { confirm: mockModalConfirm }),
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
    Checkbox: ({ checked, onChange, children }: any) =>
      React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked, onChange: onChange ? (e: any) => onChange(e) : undefined }), children),
    Empty: Object.assign(
      ({ description }: any) =>
        React.createElement('div', { 'data-testid': 'empty' }, description),
      { PRESENTED_IMAGE_SIMPLE: 'simple' }
    ),
    Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'loading'),
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

vi.mock('@ant-design/icons', () => ({
  PlusOutlined: () => React.createElement('span', { 'data-testid': 'plus-icon' }, 'Plus'),
  DeleteOutlined: () => React.createElement('span', { 'data-testid': 'delete-icon' }),
  MessageOutlined: () => React.createElement('span', { 'data-testid': 'message-icon' }),
  EditOutlined: () => React.createElement('span', { 'data-testid': 'edit-icon' }),
  InboxOutlined: () => React.createElement('span', { 'data-testid': 'inbox-icon' }),
  MoreOutlined: () => React.createElement('span', { 'data-testid': 'more-icon' }),
}))

describe('ConversationList', () => {
  const mockOnSelect = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnNew = vi.fn()
  const mockOnRename = vi.fn().mockResolvedValue(true)
  const mockOnArchive = vi.fn().mockResolvedValue(true)
  const mockOnToggleShowArchived = vi.fn()
  const mockOnBatchDelete = vi.fn().mockResolvedValue(true)

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
        onBatchDelete: mockOnBatchDelete,
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
        onBatchDelete: mockOnBatchDelete,
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
        onBatchDelete: mockOnBatchDelete,
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
        onBatchDelete: mockOnBatchDelete,
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
        onBatchDelete: mockOnBatchDelete,
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
        onBatchDelete: mockOnBatchDelete,
      })
    )
    expect(screen.getByText('新建对话')).toBeInTheDocument()
  })

  const renderList = (items = conversations) =>
    render(
      React.createElement(ConversationList, {
        conversations: items,
        currentId: null,
        onSelect: mockOnSelect,
        onDelete: mockOnDelete,
        onNew: mockOnNew,
        onRename: mockOnRename,
        onArchive: mockOnArchive,
        showArchived: false,
        onToggleShowArchived: mockOnToggleShowArchived,
        onBatchDelete: mockOnBatchDelete,
      })
    )

  it('每个会话卡片只暴露一个三点入口，并展开归档/重命名/删除三项', () => {
    renderList()
    expect(screen.getAllByTestId('more-icon')).toHaveLength(2)
    // 每张卡片一个下拉菜单，菜单内为三项操作（带文本）
    const menus = screen.getAllByTestId('dropdown-menu')
    expect(menus).toHaveLength(2)
    expect(menus[0].textContent).toBe('归档重命名删除')
  })

  it('点击「归档」调用 onArchive', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getAllByText('归档')[0])
    expect(mockOnArchive).toHaveBeenCalledWith('1', true)
  })

  it('点击「重命名」进入编辑态', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getAllByText('重命名')[0])
    const input = screen.getByTestId('rename-input')
    expect(input).toHaveValue('Conversation 1')
  })

  it('点击「删除」弹出确认，确认后调用 onDelete', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getAllByText('删除')[0])
    expect(mockModalConfirm).toHaveBeenCalledTimes(1)
    const confirmOptions = mockModalConfirm.mock.calls[0][0]
    await confirmOptions.onOk()
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

let mockNotificationsResponse = { data: [] as any[] }
const mockGetNotifications = vi.fn().mockImplementation(() => Promise.resolve(mockNotificationsResponse))
const mockDeleteAllRead = vi.fn().mockResolvedValue({})
const mockDeleteNotification = vi.fn().mockResolvedValue({})
const mockMarkAllAsRead = vi.fn().mockResolvedValue({})
const mockMarkAsRead = vi.fn().mockResolvedValue({})

vi.mock('../../../services/notification', () => ({
  getNotifications: (...args: any[]) => mockGetNotifications(...args),
  deleteAllRead: (...args: any[]) => mockDeleteAllRead(...args),
  deleteNotification: (...args: any[]) => mockDeleteNotification(...args),
  markAllAsRead: (...args: any[]) => mockMarkAllAsRead(...args),
  markAsRead: (...args: any[]) => mockMarkAsRead(...args),
  NotificationType: { SYSTEM: 'system', COURSE: 'course', HOMEWORK: 'homework', EXAM: 'exam', MESSAGE: 'message', REMINDER: 'reminder' },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('antd', () => {
  const SelectComp = ({ placeholder, options, onChange, value}: any) =>
    React.createElement('select', { 'data-testid': `select-${placeholder}`, value, onChange: (e: any) => onChange?.(e.target.value) },
      options?.map((opt: any) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)),
    )
  const SpinComp = ({ children }: any) => React.createElement('div', { 'data-testid': 'spin' }, children)
  const EmptyComp = ({ description }: any) =>
    React.createElement('div', { 'data-testid': 'empty' }, description)
  const PopconfirmComp = ({ children, onConfirm, title }: any) =>
    React.createElement('div', { 'data-testid': 'popconfirm', title, onClick: () => onConfirm?.() }, children)

  return {
    Button: ({ children, onClick, disabled, icon, ...props }: any) =>
      React.createElement('button', { onClick, disabled, 'data-testid': `btn-${children}`, ...props }, icon, children),
    Empty: Object.assign(EmptyComp, { PRESENTED_IMAGE_SIMPLE: 'simple' }),
    Popconfirm: PopconfirmComp,
    Select: SelectComp,
    Spin: SpinComp,
    Tag: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
    Typography: {
      Title: ({ children, level }: any) => {
        const TagName = `h${level || 2}` as keyof JSX.IntrinsicElements
        return React.createElement(TagName, null, children)
      },
      Text: ({ children }: any) => React.createElement('span', null, children),
    },
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    BellOutlined: icon('BellOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    ReadOutlined: icon('ReadOutlined'),
  }
})

const NotificationsPage = (await import('../index')).default

describe('Notifications page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotificationsResponse = { data: [] }
  })

  it('should render notifications page', () => {
    render(React.createElement(NotificationsPage))
    expect(screen.getByText('通知中心')).toBeInTheDocument()
  })

  it('should display notification filters', () => {
    render(React.createElement(NotificationsPage))
    expect(screen.getByTestId('select-筛选类型')).toBeInTheDocument()
  })

  it('should display 全部已读 and 清理已读 buttons', () => {
    render(React.createElement(NotificationsPage))
    expect(screen.getByText('全部已读')).toBeInTheDocument()
    expect(screen.getByText('清理已读')).toBeInTheDocument()
  })

  it('should render notification items', async () => {
    mockNotificationsResponse = {
      data: [
        { id: 'n1', title: '通知1', content: '内容1', type: 'system', created_at: new Date().toISOString(), read: false },
        { id: 'n2', title: '通知2', content: '内容2', type: 'course', created_at: new Date().toISOString(), read: true },
      ],
    }
    render(React.createElement(NotificationsPage))
    await waitFor(() => expect(screen.getByText('通知1')).toBeInTheDocument())
    expect(screen.getByText('通知2')).toBeInTheDocument()
    expect(screen.getByText('未读')).toBeInTheDocument()
    expect(screen.getByText('已读')).toBeInTheDocument()
  })

  it('should handle type filter change', () => {
    render(React.createElement(NotificationsPage))
    const select = screen.getByTestId('select-筛选类型')
    fireEvent.change(select, { target: { value: 'system' } })
    expect(select).toBeInTheDocument()
  })

  it('should handle read filter change', () => {
    render(React.createElement(NotificationsPage))
    const select = screen.getByTestId('select-undefined')
    fireEvent.change(select, { target: { value: 'unread' } })
    expect(select).toBeInTheDocument()
  })

  it('should handle mark as read', async () => {
    mockNotificationsResponse = {
      data: [
        { id: 'n1', title: '通知1', content: '内容1', type: 'system', created_at: new Date().toISOString(), read: false },
      ],
    }
    render(React.createElement(NotificationsPage))
    await waitFor(() => expect(screen.getByText('通知1')).toBeInTheDocument())
    fireEvent.click(screen.getByText('标记已读'))
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('n1'))
  })

  it('should handle mark all as read', async () => {
    mockNotificationsResponse = {
      data: [
        { id: 'n1', title: '通知1', content: '内容1', type: 'system', created_at: new Date().toISOString(), read: false },
      ],
    }
    render(React.createElement(NotificationsPage))
    await waitFor(() => expect(screen.getByText('全部已读')).toBeInTheDocument())
    fireEvent.click(screen.getByText('全部已读'))
    await waitFor(() => expect(mockMarkAllAsRead).toHaveBeenCalled())
  })

  it('should handle delete notification', async () => {
    mockNotificationsResponse = {
      data: [
        { id: 'n1', title: '通知1', content: '内容1', type: 'system', created_at: new Date().toISOString(), read: false },
      ],
    }
    render(React.createElement(NotificationsPage))
    await waitFor(() => expect(screen.getByText('通知1')).toBeInTheDocument())
    const deleteBtn = screen.getByText('删除')
    fireEvent.click(deleteBtn)
    await waitFor(() => expect(mockDeleteNotification).toHaveBeenCalledWith('n1'))
  })

  it('should handle delete all read', async () => {
    mockNotificationsResponse = {
      data: [
        { id: 'n1', title: '通知1', content: '内容1', type: 'system', created_at: new Date().toISOString(), read: true },
      ],
    }
    render(React.createElement(NotificationsPage))
    await waitFor(() => expect(screen.getByText('清理已读')).toBeInTheDocument())
    fireEvent.click(screen.getByText('清理已读'))
    await waitFor(() => expect(mockDeleteAllRead).toHaveBeenCalled())
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Header from '../../index'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockClearUser = vi.fn()
const mockGetNotifications = vi.fn().mockResolvedValue({ data: [] })

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))

vi.mock('../../../stores/user', () => ({
  useUserStore: () => ({ user: { username: 'teacher', full_name: '张老师' }, clearUser: mockClearUser }),
}))

vi.mock('../../../services/auth', () => ({
  authService: { logout: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('../../../services/notification', () => ({
  getNotifications: (...args: any[]) => mockGetNotifications(...args),
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllAsRead: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../types/error', () => ({
  BusinessError: class BusinessError extends Error {
    statusCode: number
    constructor(msg: string, code: number) {
      super(msg)
      this.statusCode = code
    }
  },
}))

vi.mock('antd', () => {
  const Layout = ({ children, ...props }: any) =>
    React.createElement('div', props, children)
  Layout.Header = ({ children, className, ...props }: any) =>
    React.createElement('header', { className, 'data-testid': 'header' }, children)

  return {
    Layout,
    Button: ({ children, onClick, ...props }: any) =>
      React.createElement('button', { onClick, 'data-testid': props['data-testid'] }, children),
    Dropdown: ({ children, ...props }: any) =>
      React.createElement('div', null, children),
    Badge: ({ children, count, ...props }: any) =>
      React.createElement('span', { 'data-testid': 'badge', 'data-count': count }, children),
    Tooltip: ({ children, ...props }: any) =>
      React.createElement('div', null, children),
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Search: (props: any) => React.createElement('input', { ...props, type: 'search' }) }
    ),
    Select: Object.assign(
      (props: any) => React.createElement('select', props),
      { Option: (props: any) => React.createElement('option', props) }
    ),
    Modal: ({ children, open, title, footer, ...props }: any) =>
      open
        ? React.createElement(
            'div',
            { 'data-testid': 'modal', role: 'dialog' },
            React.createElement('div', null, title),
            children,
            ...(footer || [])
          )
        : null,
    List: ({ dataSource, renderItem, locale, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'notification-list' },
        dataSource?.length
          ? dataSource.map((item: any, i: number) =>
              React.createElement('div', { key: i }, renderItem?.(item))
            )
          : locale?.emptyText
      ),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    Typography: {
      Title: ({ children, ...props }: any) => React.createElement('h1', props, children),
      Text: ({ children, ...props }: any) => React.createElement('span', props, children),
      Paragraph: ({ children, ...props }: any) => React.createElement('p', props, children),
    },
    Collapse: Object.assign(
      (props: any) => React.createElement('div', { 'data-testid': 'collapse' }, props.children),
      { Panel: (props: any) => React.createElement('div', { 'data-testid': 'collapse-panel' }, props.header, props.children) }
    ),
    theme: { useToken: () => ({ token: {} }) },
  }
})

vi.mock('@ant-design/icons', () => ({
  BellOutlined: () => React.createElement('span', null, 'BellIcon'),
  UserOutlined: () => React.createElement('span', null, 'UserIcon'),
  QuestionCircleOutlined: () => React.createElement('span', null, 'QuestionIcon'),
  SearchOutlined: () => React.createElement('span', null, 'SearchIcon'),
  SettingOutlined: () => React.createElement('span', null, 'SettingIcon'),
  LogoutOutlined: () => React.createElement('span', null, 'LogoutIcon'),
  ProfileOutlined: () => React.createElement('span', null, 'ProfileIcon'),
  MenuOutlined: () => React.createElement('span', null, 'MenuIcon'),
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input with placeholder "搜索课程..." in desktop mode', () => {
    render(React.createElement(Header))

    expect(screen.getByPlaceholderText('搜索课程...')).toBeInTheDocument()
  })

  it('renders user name from store', () => {
    render(React.createElement(Header))

    expect(screen.getByText('teacher')).toBeInTheDocument()
  })

  it('renders role "教师"', () => {
    render(React.createElement(Header))

    expect(screen.getByText('教师')).toBeInTheDocument()
  })

  it('renders help button', () => {
    render(React.createElement(Header))

    expect(screen.getByText('QuestionIcon')).toBeInTheDocument()
  })

  it('renders notification bell', () => {
    render(React.createElement(Header))

    expect(screen.getByText('BellIcon')).toBeInTheDocument()
  })

  it('mobile mode: hides search input', () => {
    render(React.createElement(Header, { isMobile: true }))

    expect(screen.queryByPlaceholderText('搜索课程...')).not.toBeInTheDocument()
  })

  it('calls getNotifications on mount', () => {
    render(React.createElement(Header))

    expect(mockGetNotifications).toHaveBeenCalledWith({ page_size: 20 })
  })
})

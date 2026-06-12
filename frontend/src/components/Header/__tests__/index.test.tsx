import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import Header from '../index'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockClearUser = vi.fn()
const mockGetNotifications = vi.fn().mockResolvedValue({ data: [] })
const mockMarkAsRead = vi.fn().mockResolvedValue(undefined)
const mockMarkAllAsRead = vi.fn().mockResolvedValue(undefined)
const mockAuthLogout = vi.fn().mockResolvedValue(undefined)

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
  authService: { logout: (...args: any[]) => mockAuthLogout(...args) },
}))

vi.mock('../../../services/notification', () => ({
  getNotifications: (...args: any[]) => mockGetNotifications(...args),
  markAsRead: (...args: any[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: any[]) => mockMarkAllAsRead(...args),
}))

vi.mock('../../../types/error', () => ({
  BusinessError: class BusinessError extends Error {
    statusCode: number
    constructor(msg: string, code: string | number) {
      super(msg)
      this.statusCode = typeof code === 'string' ? parseInt(code, 10) || 0 : code
    }
  },
}))

// Using global antd mock from src/test/setup.ts but override List to render items
vi.mock('antd', () => {
  const FormItem = ({ children, name, label, rules: _rules }: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}` }, label ? React.createElement('label', null, label) : null, children)
  const FormComp = ({ children, name, onFinish, initialValues: _initialValues, ...props }: any) => {
    const handleSubmit = (e: any) => { e.preventDefault(); onFinish?.({}) }
    return React.createElement('form', { onSubmit: handleSubmit, name, 'data-testid': `form-${name || 'unnamed'}`, ...props }, children)
  }
  FormComp.Item = FormItem
  FormComp.useForm = () => [{
    validateFields: vi.fn().mockResolvedValue({}),
    getFieldValue: vi.fn().mockReturnValue(''),
    resetFields: vi.fn(),
    setFieldsValue: vi.fn(),
  }]

  const LayoutComp = (props: any) => React.createElement('div', { 'data-testid': 'layout', ...props }, props.children)
  LayoutComp.Header = (props: any) => React.createElement('header', { 'data-testid': 'header', ...props }, props.children)

  const ListComp = ({ dataSource, renderItem, locale, loading, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'list', ...props },
      loading ? React.createElement('span', null, 'loading') : null,
      dataSource?.length
        ? dataSource.map((item: any, i: number) => React.createElement('div', { key: i }, renderItem?.(item)))
        : locale?.emptyText
    )
  ListComp.Item = ({ children, onClick }: any) => React.createElement('div', { 'data-testid': 'list-item', onClick }, children)

  const MenuComp = ({ items, _selectedKeys, _mode, ...props }: any) =>
    React.createElement('nav', { 'data-testid': 'menu', ...props },
      items?.map((item: any) =>
        React.createElement('div', {
          key: item.key,
          'data-testid': `menu-item-${item.key}`,
          onClick: (e: any) => {
            if (item.onClick) item.onClick({ key: item.key, ...e })
          },
        }, item.label)
      )
    )
  MenuComp.Item = (props: any) => React.createElement('div', { 'data-testid': 'menu-item' }, props.children)

  return {
    Layout: LayoutComp,
    Button: ({ children, onClick, loading, icon, htmlType, _type, _size, ...props }: any) =>
      React.createElement('button', { onClick, disabled: loading, type: htmlType || 'button', 'data-testid': `btn-${children}`, ...props }, icon, children),
    Dropdown: ({ children, menu, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'dropdown', ...props },
        children,
        React.createElement('div', { 'data-testid': 'dropdown-menu' },
          menu?.items?.map((item: any) => {
            if (item.type === 'divider') return React.createElement('hr', { key: item.key || 'div' })
            return React.createElement('div', {
              key: item.key,
              'data-testid': `dd-item-${item.key}`,
              onClick: () => menu?.onClick?.({ key: item.key }),
            }, item.label)
          })
        )
      ),
    Badge: ({ children, count, ...props }: any) =>
      React.createElement('span', { 'data-testid': 'badge', 'data-count': count, ...props }, children),
    Tooltip: ({ children, title, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'tooltip', title, ...props }, children),
    Modal: Object.assign(
      ({ children, open, title, footer, _onOk, _onCancel, ...props }: any) =>
        open ? React.createElement('div', { 'data-testid': 'modal', role: 'dialog', ...props },
          React.createElement('div', null, title),
          children,
          ...(footer || [])
        ) : null,
      { confirm: ({ onOk }: any) => onOk?.() }
    ),
    List: ListComp,
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Search: (props: any) => React.createElement('input', { type: 'search', ...props }) }
    ),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => ({
  BellOutlined: () => React.createElement('span', null, 'BellIcon'),
  UserOutlined: () => React.createElement('span', null, 'UserIcon'),
  QuestionCircleOutlined: () => React.createElement('span', null, 'QuestionIcon'),
  SearchOutlined: ({ onClick }: any) => React.createElement('span', { onClick, 'data-testid': 'search-icon' }, 'SearchIcon'),
  SettingOutlined: () => React.createElement('span', null, 'SettingIcon'),
  LogoutOutlined: () => React.createElement('span', null, 'LogoutIcon'),
  ProfileOutlined: () => React.createElement('span', null, 'ProfileIcon'),
  MenuOutlined: () => React.createElement('span', null, 'MenuIcon'),
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNotifications.mockResolvedValue({ data: [] })
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

  it('renders mobile menu button when isMobile', () => {
    render(React.createElement(Header, { isMobile: true }))
    expect(screen.getByText('MenuIcon')).toBeInTheDocument()
  })

  it('opens help modal on help button click', () => {
    render(React.createElement(Header))
    fireEvent.click(screen.getByText('QuestionIcon'))
    expect(screen.getByText('平台使用说明')).toBeInTheDocument()
  })

  it('closes help modal', () => {
    render(React.createElement(Header))
    fireEvent.click(screen.getByText('QuestionIcon'))
    fireEvent.click(screen.getByText('关闭'))
    expect(screen.queryByText('平台使用说明')).not.toBeInTheDocument()
  })

  it('navigates on search enter with value', () => {
    render(React.createElement(Header))
    const input = screen.getByPlaceholderText('搜索课程...')
    fireEvent.change(input, { target: { value: 'math' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(mockNavigate).toHaveBeenCalledWith('/courses?search=math')
  })

  it('does not navigate on search enter with empty value', () => {
    render(React.createElement(Header))
    const input = screen.getByPlaceholderText('搜索课程...')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates on search icon click', () => {
    render(React.createElement(Header))
    const input = screen.getByPlaceholderText('搜索课程...')
    fireEvent.change(input, { target: { value: 'physics' } })
    fireEvent.click(screen.getByTestId('search-icon'))
    expect(mockNavigate).toHaveBeenCalledWith('/courses?search=physics')
  })

  it('marks notification as read on click', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [{ id: 'n1', title: 'T1', content: 'C1', read: false, created_at: new Date().toISOString() }],
    })
    render(React.createElement(Header))
    await waitFor(() => expect(screen.getByTestId('list')).toBeInTheDocument())
    const items = screen.getAllByTestId('list-item')
    fireEvent.click(items[0])
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('n1'))
  })

  it('marks all notifications as read', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        { id: 'n1', title: 'T1', content: 'C1', read: false, created_at: new Date().toISOString() },
      ],
    })
    render(React.createElement(Header))
    await waitFor(() => expect(screen.getByText('全部已读')).toBeInTheDocument())
    fireEvent.click(screen.getByText('全部已读'))
    await waitFor(() => expect(mockMarkAllAsRead).toHaveBeenCalled())
  })

  it('handles logout', async () => {
    render(React.createElement(Header))
    fireEvent.click(screen.getByTestId('dd-item-logout'))
    await waitFor(() => expect(mockAuthLogout).toHaveBeenCalled())
    expect(mockLogout).toHaveBeenCalled()
    expect(mockClearUser).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('navigates to profile on profile menu click', () => {
    render(React.createElement(Header))
    fireEvent.click(screen.getByTestId('dd-item-profile'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('navigates to profile on settings menu click', () => {
    render(React.createElement(Header))
    fireEvent.click(screen.getByTestId('dd-item-settings'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('opens help modal on help menu click', () => {
    render(React.createElement(Header))
    fireEvent.click(screen.getByTestId('dd-item-help'))
    expect(screen.getByText('平台使用说明')).toBeInTheDocument()
  })

  it('handles notification fetch 401 error silently', async () => {
    const { BusinessError } = await import('../../../types/error')
    mockGetNotifications.mockRejectedValueOnce(new BusinessError('Unauthorized', '401'))
    render(React.createElement(Header))
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalled())
    expect(screen.queryByText('获取通知失败')).not.toBeInTheDocument()
  })

  it('calls onMenuClick in mobile mode', () => {
    const onMenuClick = vi.fn()
    render(React.createElement(Header, { isMobile: true, onMenuClick }))
    fireEvent.click(screen.getByText('MenuIcon'))
    expect(onMenuClick).toHaveBeenCalled()
  })
})

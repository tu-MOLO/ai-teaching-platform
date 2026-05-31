import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import Sidebar from '../../index'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockClearUser = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}))

vi.mock('../../../stores/auth', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))

vi.mock('../../../stores/user', () => ({
  useUserStore: () => ({ clearUser: mockClearUser }),
}))

vi.mock('../../../services/auth', () => ({
  authService: { logout: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('antd', () => {
  const Layout = ({ children, ...props }: any) =>
    React.createElement('div', props, children)
  Layout.Sider = ({ children, ...props }: any) =>
    React.createElement('aside', { 'data-testid': 'sider' }, children)

  return {
    Layout,
    Menu: ({ items, ...props }: any) =>
      React.createElement('nav', { 'data-testid': 'menu' },
        items?.map((item: any) =>
          React.createElement('div', {
            key: item.key,
            'data-testid': `menu-item-${item.key}`,
            onClick: item.onClick,
          }, item.label)
        )
      ),
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
  DashboardOutlined: () => React.createElement('span', null, 'DashboardIcon'),
  BookOutlined: () => React.createElement('span', null, 'BookIcon'),
  UserOutlined: () => React.createElement('span', null, 'UserIcon'),
  SettingOutlined: () => React.createElement('span', null, 'SettingIcon'),
  LogoutOutlined: () => React.createElement('span', null, 'LogoutIcon'),
  FolderOutlined: () => React.createElement('span', null, 'FolderIcon'),
  FileTextOutlined: () => React.createElement('span', null, 'FileTextIcon'),
  TeamOutlined: () => React.createElement('span', null, 'TeamIcon'),
  MenuFoldOutlined: () => React.createElement('span', null, 'MenuFoldIcon'),
  MenuUnfoldOutlined: () => React.createElement('span', null, 'MenuUnfoldIcon'),
  CloseOutlined: () => React.createElement('span', null, 'CloseIcon'),
  RobotOutlined: () => React.createElement('span', null, 'RobotIcon'),
  BarChartOutlined: () => React.createElement('span', null, 'BarChartIcon'),
  BellOutlined: () => React.createElement('span', null, 'BellIcon'),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders logo title "AI教学平台"', () => {
    render(React.createElement(Sidebar))

    expect(screen.getByText('AI教学平台')).toBeInTheDocument()
  })

  it('renders all 10 menu item labels', () => {
    render(React.createElement(Sidebar))

    const labels = [
      '工作台',
      '课程管理',
      '学生管理',
      '数据报告',
      '学生档案',
      '教案中心',
      '资源中心',
      'AI助手',
      '通知中心',
      '系统设置',
    ]
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('renders logout button with "退出登录" text', () => {
    render(React.createElement(Sidebar))

    expect(screen.getByText('退出登录')).toBeInTheDocument()
  })

  it('renders collapse button with "收起菜单" text in desktop mode', () => {
    render(React.createElement(Sidebar))

    expect(screen.getByText('收起菜单')).toBeInTheDocument()
  })

  it('navigates when clicking a menu item', async () => {
    render(React.createElement(Sidebar))

    const coursesItem = screen.getByTestId('menu-item-/courses')
    await userEvent.click(coursesItem)

    expect(mockNavigate).toHaveBeenCalledWith('/courses')
  })

  it('calls onCollapse when collapse button is clicked', async () => {
    const mockOnCollapse = vi.fn()
    render(React.createElement(Sidebar, { onCollapse: mockOnCollapse }))

    const collapseBtn = screen.getByText('收起菜单').closest('button')
    await userEvent.click(collapseBtn!)

    expect(mockOnCollapse).toHaveBeenCalledWith(true)
  })

  it('mobile mode: renders close button', () => {
    render(React.createElement(Sidebar, { mobile: true }))

    expect(screen.getByText('CloseIcon')).toBeInTheDocument()
  })

  it('mobile mode: calls onClose after logout', async () => {
    const mockOnClose = vi.fn()
    render(React.createElement(Sidebar, { mobile: true, onClose: mockOnClose }))

    const logoutBtn = screen.getByText('退出登录').closest('button')
    await userEvent.click(logoutBtn!)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})

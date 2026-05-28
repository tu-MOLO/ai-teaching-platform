import React, { useState } from 'react'
import { Layout, Menu, Tooltip } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined,
  RobotOutlined,
  BarChartOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import './index.css'

const { Sider } = Layout

interface MenuItem {
  key: string
  icon: React.ReactNode
  label: string
  path: string
}

interface SidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  mobile?: boolean
  onClose?: () => void
}

const menuItems: MenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台', path: '/' },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理', path: '/courses' },
  { key: '/students', icon: <TeamOutlined />, label: '学生管理', path: '/students' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报告', path: '/reports' },
  { key: '/portfolio', icon: <UserOutlined />, label: '学生档案', path: '/portfolio' },
  { key: '/lesson-planner', icon: <FileTextOutlined />, label: '教案中心', path: '/lesson-planner' },
  { key: '/resource-center', icon: <FolderOutlined />, label: '资源中心', path: '/resource-center' },
  { key: '/ai-assistant', icon: <RobotOutlined />, label: 'AI助手', path: '/ai-assistant' },
  { key: '/notifications', icon: <BellOutlined />, label: '通知中心', path: '/notifications' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置', path: '/settings' },
]

const Sidebar: React.FC<SidebarProps> = ({
  collapsed: controlledCollapsed,
  onCollapse,
  mobile = false,
  onClose,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()
  const { clearUser } = useUserStore()

  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed

  const toggleCollapse = () => {
    const nextCollapsed = !collapsed
    if (onCollapse) {
      onCollapse(nextCollapsed)
    } else {
      setInternalCollapsed(nextCollapsed)
    }
  }

  const handleMenuClick = (path: string) => {
    navigate(path)
    if (mobile) {
      onClose?.()
    }
  }

  const handleLogout = () => {
    void (async () => {
      try {
        await authService.logout()
      } catch {
        // ignore
      } finally {
        logout()
        clearUser()
        navigate('/login')
        if (mobile) {
          onClose?.()
        }
      }
    })()
  }

  const selectedKeys = [
    menuItems.find((item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))?.key || '/',
  ]

  const menuConfig = menuItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    onClick: () => handleMenuClick(item.path),
  }))

  if (mobile) {
    return (
      <div className="sidebar-mobile">
        <div className="sidebar-header mobile-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-title">AI教学平台</span>
              <span className="logo-subtitle">教学管理系统</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        <div className="sidebar-menu-wrapper">
          <div className="menu-section-title">主菜单</div>
          <Menu theme="dark" mode="inline" selectedKeys={selectedKeys} className="sidebar-menu" items={menuConfig} />
        </div>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <LogoutOutlined />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <Sider width={240} collapsedWidth={80} collapsed={collapsed} className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} theme="dark">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-title">AI教学平台</span>
            <span className="logo-subtitle">教学管理系统</span>
          </div>
        </div>
      </div>

      <div className="sidebar-menu-wrapper">
        <div className="menu-section-title">主菜单</div>
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={selectedKeys}
          className="sidebar-menu"
          items={menuConfig}
        />
      </div>

      <div className="sidebar-footer">
        <Tooltip title={collapsed ? '展开侧边栏' : '收起侧边栏'} placement="right">
          <button className="collapse-button" onClick={toggleCollapse}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            {!collapsed && <span>收起菜单</span>}
          </button>
        </Tooltip>
        <Tooltip title="退出登录" placement="right">
          <button className="logout-button" onClick={handleLogout}>
            <LogoutOutlined />
            {!collapsed && <span>退出登录</span>}
          </button>
        </Tooltip>
      </div>
    </Sider>
  )
}

export default Sidebar

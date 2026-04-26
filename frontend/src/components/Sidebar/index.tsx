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
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
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

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed: controlledCollapsed, 
  onCollapse, 
  mobile = false,
  onClose 
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()
  const { clearUser } = useUserStore()
  
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed

  const toggleCollapse = () => {
    const newCollapsed = !collapsed
    if (onCollapse) {
      onCollapse(newCollapsed)
    } else {
      setInternalCollapsed(newCollapsed)
    }
  }

  const handleMenuClick = (path: string) => {
    navigate(path)
    if (mobile && onClose) {
      onClose()
    }
  }

  const handleLogout = () => {
    logout()
    clearUser()
    navigate('/login')
    if (mobile && onClose) {
      onClose()
    }
  }

  const menuItems: MenuItem[] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '工作台',
      path: '/',
    },
    {
      key: '/courses',
      icon: <BookOutlined />,
      label: '课程管理',
      path: '/courses',
    },
    {
      key: '/students',
      icon: <TeamOutlined />,
      label: '学生管理',
      path: '/students',
    },
    {
      key: '/resource-center',
      icon: <FolderOutlined />,
      label: '资源中心',
      path: '/resource-center',
    },
    {
      key: '/lesson-planner',
      icon: <FileTextOutlined />,
      label: '教案中心',
      path: '/lesson-planner',
    },
    {
      key: '/ai-assistant',
      icon: <RobotOutlined />,
      label: 'AI助手',
      path: '/ai-assistant',
    },
    {
      key: '/portfolio',
      icon: <UserOutlined />,
      label: '学生档案',
      path: '/portfolio',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      path: '/settings',
    },
  ]

  const getSelectedKey = () => {
    const currentPath = location.pathname
    const matchedItem = menuItems.find(item => 
      currentPath === item.path || currentPath.startsWith(item.path + '/')
    )
    return matchedItem ? [matchedItem.key] : ['/']
  }

  // 移动端模式 - 不使用 Sider，直接渲染内容
  if (mobile) {
    return (
      <div className="sidebar-mobile">
        {/* Logo区域 */}
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
              <span className="logo-subtitle">智慧教育管理系统</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        {/* 菜单区域 */}
        <div className="sidebar-menu-wrapper">
          <div className="menu-section-title">主菜单</div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKey()}
            className="sidebar-menu"
            items={menuItems.map(item => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              onClick: () => handleMenuClick(item.path),
            }))}
          />
        </div>

        {/* 底部退出按钮 */}
        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <LogoutOutlined />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    )
  }

  // 桌面端模式 - 使用 Sider
  return (
    <Sider 
      width={240} 
      collapsedWidth={80}
      collapsed={collapsed}
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} 
      theme="dark"
    >
      {/* Logo区域 */}
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
            <span className="logo-subtitle">智慧教育管理系统</span>
          </div>
        </div>
      </div>

      {/* 菜单区域 */}
      <div className="sidebar-menu-wrapper">
        <div className="menu-section-title">主菜单</div>
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={getSelectedKey()}
          className="sidebar-menu"
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.path),
          }))}
        />
      </div>

      {/* 底部区域 */}
      <div className="sidebar-footer">
        <Tooltip title={collapsed ? '展开侧边栏' : '收起侧边栏'} placement="right">
          <button 
            className="collapse-button" 
            onClick={toggleCollapse}
          >
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

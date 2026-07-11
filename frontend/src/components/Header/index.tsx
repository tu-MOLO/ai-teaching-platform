import React, { useState, useCallback, useEffect } from 'react'
import { Layout, Button, Dropdown, Badge, Tooltip, Modal, List, message } from 'antd'
import {
  BellOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  LogoutOutlined,
  ProfileOutlined,
  MenuOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import { BusinessError } from '../../types/error'
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  type Notification 
} from '../../services/notification'
import './index.css'

const { Header: AntHeader } = Layout

// 格式化时间显示
const formatTime = (dateString: string): string => {
  // 后端返回 UTC 时间，但 SQLite 可能不带时区后缀，追加 Z 确保正确解析为 UTC
  const hasTimezone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(dateString)
  const normalized = hasTimezone ? dateString : dateString + 'Z'
  const date = new Date(normalized)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  // 显示具体日期
  return date.toLocaleDateString('zh-CN')
}

interface HeaderProps {
  onMenuClick?: () => void
  isMobile?: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isMobile = false }) => {
  const navigate = useNavigate()
  const { user, clearUser } = useUserStore()
  const { logout } = useAuthStore()
  const [searchValue, setSearchValue] = useState('')
  const [helpModalVisible, setHelpModalVisible] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 计算未读通知数量
  const unreadCount = notifications.filter(n => !n.read).length

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getNotifications({ page_size: 20 })
      setNotifications(response.data)
    } catch (error) {
      if (!(error instanceof BusinessError && error.statusCode === 401)) {
        console.error('获取通知失败:', error)
      }
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 组件加载时获取通知，并定时轮询（60秒）
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // 打开通知下拉时刷新通知列表
  const handleNotificationOpenChange = useCallback((open: boolean) => {
    setNotificationOpen(open)
    if (open) {
      fetchNotifications()
    }
  }, [fetchNotifications])

  // 搜索处理
  const handleSearch = useCallback(() => {
    if (searchValue.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchValue.trim())}`)
    }
  }, [searchValue, navigate])

  // 搜索框回车事件
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  // 显示帮助Modal
  const showHelpModal = useCallback(() => {
    setHelpModalVisible(true)
  }, [])

  // 关闭帮助Modal
  const closeHelpModal = useCallback(() => {
    setHelpModalVisible(false)
  }, [])

  // 标记通知为已读
  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('标记已读失败:', error)
      message.error('标记已读失败')
    }
  }, [])

  // 标记所有通知为已读
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      message.success('已全部标记为已读')
    } catch (error) {
      console.error('标记全部已读失败:', error)
      message.error('标记全部已读失败')
    }
  }, [])

  // 处理用户菜单点击
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      logout()
      clearUser()
      navigate('/login')
    }
  }, [clearUser, logout, navigate])

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        navigate('/profile')
        break
      case 'settings':
        navigate('/profile')
        break
      case 'help':
        showHelpModal()
        break
      case 'logout':
        void handleLogout()
        break
    }
  }, [handleLogout, navigate, showHelpModal])

  const menuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: '个人资料'
    },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: '个人设置'
      },
    {
      type: 'divider' as const
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录'
    }
  ]

  // 通知菜单项
  const notificationItems = [
    {
      key: 'notification-header',
      label: (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-title">通知</span>
            {unreadCount > 0 && (
              <Button type="link" size="small" onClick={markAllNotificationsAsRead}>
                全部已读
              </Button>
            )}
          </div>
          <List
            dataSource={notifications}
            loading={loading}
            locale={{ emptyText: '暂无通知' }}
            renderItem={item => (
              <List.Item
                className={`notification-item ${item.read ? 'read' : 'unread'}`}
                onClick={() => markNotificationAsRead(item.id)}
              >
                <div className="notification-content">
                  <div className="notification-item-title">
                    {!item.read && <span className="notification-dot" />}
                    {item.title}
                  </div>
                  <div className="notification-item-content">{item.content}</div>
                  <div className="notification-item-time">{formatTime(item.created_at)}</div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ),
      disabled: true
    }
  ]

  return (
    <AntHeader className={`header ${isMobile ? 'header-mobile' : ''}`}>
      {/* 左侧区域 */}
      <div className="header-left">
        {/* 移动端菜单按钮 */}
        {isMobile && (
          <Button 
            type="text" 
            className="header-menu-btn"
            onClick={onMenuClick}
          >
            <MenuOutlined />
          </Button>
        )}
      </div>

      {/* 右侧区域 */}
      <div className="header-right">
        {/* 搜索框 - 移动端隐藏 */}
        {!isMobile && (
          <div className="header-search">
            <SearchOutlined 
              className="header-search-icon" 
              onClick={handleSearch}
              style={{ cursor: 'pointer' }}
            />
            <input 
              type="text" 
              className="header-search-input" 
              placeholder="搜索课程..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        )}

        {/* 帮助按钮 */}
        <Tooltip title="帮助">
          <Button type="text" className="header-btn" onClick={showHelpModal}>
            <QuestionCircleOutlined />
          </Button>
        </Tooltip>

        {/* 通知按钮 */}
        <Dropdown
          menu={{ items: notificationItems }}
          placement="bottomRight"
          trigger={['click']}
          open={notificationOpen}
          onOpenChange={handleNotificationOpenChange}
          overlayClassName="notification-dropdown-wrapper"
        >
          <Tooltip title="通知">
            <Button type="text" className="header-btn">
              <Badge count={unreadCount} overflowCount={99}>
                <BellOutlined />
              </Badge>
            </Button>
          </Tooltip>
        </Dropdown>

        {/* 用户菜单 */}
        <Dropdown 
          menu={{ items: menuItems, onClick: handleMenuClick }} 
          placement="bottomRight"
          overlayClassName="header-dropdown"
        >
          <button className="header-user" data-testid="user-menu">
            <div className="user-avatar">
              <UserOutlined />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username || '用户'}</span>
              <span className="user-role">教师</span>
            </div>
          </button>
        </Dropdown>
      </div>

      {/* 帮助信息Modal */}
      <Modal
        title="平台使用说明"
        open={helpModalVisible}
        onCancel={closeHelpModal}
        footer={[
          <Button key="close" type="primary" onClick={closeHelpModal}>
            关闭
          </Button>
        ]}
        width={600}
        centered={isMobile}
      >
          <div className="help-content">
            <h4>欢迎使用AI教学平台</h4>
            <p>本平台提供以下核心功能：</p>
          <ul>
            <li><strong>课程管理：</strong>创建、编辑和管理您的课程</li>
            <li><strong>教案管理：</strong>创建、整理和复用日常备课内容</li>
            <li><strong>学生管理：</strong>管理学生信息和查看学习进度</li>
            <li><strong>成长档案：</strong>记录学生表现并沉淀过程性材料</li>
            <li><strong>资源中心：</strong>统一管理教学资源与文件预览</li>
          </ul>
          <p>建议先在个人资料中完善信息，再到系统设置维护学校信息、下拉选项和主题方案。</p>
        </div>
      </Modal>
    </AntHeader>
  )
}

export default Header

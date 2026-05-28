import React, { useEffect, useState } from 'react'
import { Spin, Empty } from 'antd'
import {
  BookOutlined,
  UserOutlined,
  RocketOutlined,
  PlusOutlined,
  UserAddOutlined,
  FileTextOutlined,
  GiftOutlined,
  ToolOutlined,
  TrophyOutlined,
  FileTextOutlined as FileTextIcon,
  TrophyOutlined as TrophyIcon,
  CalendarOutlined,
  BellOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  NotificationOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  NotificationType,
  type Notification as APINotification,
} from '../../services/notification'
import { useDashboardStore } from '../../stores/dashboard'
import './index.css'

const iconMapping: Record<string, React.ReactNode> = {
  [NotificationType.SYSTEM]: <InfoCircleOutlined />,
  [NotificationType.COURSE]: <BookOutlined />,
  [NotificationType.HOMEWORK]: <FileTextIcon />,
  [NotificationType.EXAM]: <TrophyIcon />,
  [NotificationType.MESSAGE]: <BellOutlined />,
  [NotificationType.REMINDER]: <CalendarOutlined />,
  'new-feature': <GiftOutlined />,
  'maintenance': <ToolOutlined />,
  'achievement': <TrophyOutlined />,
}

const typeStyleMapping: Record<string, string> = {
  [NotificationType.SYSTEM]: 'maintenance',
  [NotificationType.COURSE]: 'new-feature',
  [NotificationType.HOMEWORK]: 'achievement',
  [NotificationType.EXAM]: 'achievement',
  [NotificationType.MESSAGE]: 'new-feature',
  [NotificationType.REMINDER]: 'maintenance',
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleDateString('zh-CN')
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<APINotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const isMountedRef = React.useRef(true)

  const { stats, loading, fetchStats, refreshStats } = useDashboardStore()

  useEffect(() => {
    isMountedRef.current = true
    fetchStats()
    fetchNotifications()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchStats])

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true)
      const data = await getNotifications({ page_size: 5 })
      if (isMountedRef.current) {
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error('获取通知失败:', error)
    } finally {
      if (isMountedRef.current) {
        setNotificationsLoading(false)
      }
    }
  }

  const statCards = [
    { title: '总课程数', value: stats.totalCourses, icon: <BookOutlined />, color: '#c9a87c', bgColor: 'rgba(201, 168, 124, 0.08)', path: '/courses' },
    { title: '总学生数', value: stats.totalStudents, icon: <UserOutlined />, color: '#6b9b7a', bgColor: 'rgba(107, 155, 122, 0.08)', path: '/students' },
    { title: '本月教案', value: stats.monthlyLessonPlans, icon: <FileTextOutlined />, color: '#7a9ab8', bgColor: 'rgba(122, 154, 184, 0.08)', path: '/lesson-planner' },
    { title: '我的资源', value: stats.totalResources, icon: <RocketOutlined />, color: '#909399', bgColor: 'rgba(144, 147, 153, 0.08)', path: '/resource-center' },
  ]

  const quickActions = [
    { icon: <PlusOutlined />, title: '创建新课程', desc: '开始设计一堂新课', onClick: () => navigate('/courses/create') },
    { icon: <UserAddOutlined />, title: '添加学生', desc: '录入新学生信息', onClick: () => navigate('/students/create') },
    { icon: <FileTextOutlined />, title: '查看报告', desc: '查看教学数据分析', onClick: () => navigate('/reports') },
  ]

  if (loading && !stats.totalCourses && !stats.totalStudents) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <Spin size="large" />
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">
            <DashboardOutlined className="dashboard-title-icon" />
            工作台
          </h1>
          <p className="dashboard-subtitle">欢迎回来，祝您今天教学顺利！</p>
        </div>
        <div className="dashboard-header-right">
          <button className="refresh-btn" onClick={refreshStats} disabled={loading} title="刷新数据">
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      {/* 统计数据 - 行内条 */}
      <div className="stats-strip">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-item" onClick={() => navigate(stat.path)}>
            <div className="stat-item-icon" style={{ background: stat.bgColor, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-item-body">
              <div className="stat-item-value">{stat.value?.toLocaleString?.() || stat.value}</div>
              <div className="stat-item-label">{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="content-section">
        <div className="section-heading">
          <ThunderboltOutlined className="section-heading-icon" />
          <span className="section-heading-text">快捷操作</span>
        </div>
        <div className="quick-actions">
          {quickActions.map((action, index) => (
            <button key={index} className="quick-action-btn" onClick={action.onClick}>
              <div className="quick-action-icon">{action.icon}</div>
              <div className="quick-action-text">
                <div className="quick-action-title">{action.title}</div>
                <div className="quick-action-desc">{action.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 系统通知 */}
      <div className="content-section">
        <div className="section-heading">
          <NotificationOutlined className="section-heading-icon" />
          <span className="section-heading-text">系统通知</span>
          {notifications.length > 0 && (
            <span className="section-heading-extra" onClick={() => navigate('/notifications')}>
              查看全部
            </span>
          )}
        </div>
        <Spin spinning={notificationsLoading}>
          {notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.map((notification, index) => (
                <div key={notification.id || index} className="notification-item">
                  <div className={`notification-type-icon ${typeStyleMapping[notification.type] || 'new-feature'}`}>
                    {iconMapping[notification.type] || <BellOutlined />}
                  </div>
                  <div className="notification-body">
                    <div className="notification-body-title">{notification.title}</div>
                    <div className="notification-body-content">{notification.content}</div>
                  </div>
                  <div className="notification-time">{formatTime(notification.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
          )}
        </Spin>
      </div>
    </div>
  )
}

export default Dashboard

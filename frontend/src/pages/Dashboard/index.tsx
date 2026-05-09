import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Spin, Empty } from 'antd'
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
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getNotifications, type Notification as APINotification } from '../../services/notification'
import { useDashboardStore } from '../../stores/dashboard'
import './index.css'

// 图标映射
const iconMapping: Record<string, React.ReactNode> = {
  'SYSTEM': <InfoCircleOutlined />,
  'COURSE': <BookOutlined />,
  'HOMEWORK': <FileTextIcon />,
  'EXAM': <TrophyIcon />,
  'MESSAGE': <BellOutlined />,
  'REMINDER': <CalendarOutlined />,
  'new-feature': <GiftOutlined />,
  'maintenance': <ToolOutlined />,
  'achievement': <TrophyOutlined />,
}

// 类型样式映射
const typeStyleMapping: Record<string, string> = {
  'SYSTEM': 'maintenance',
  'COURSE': 'new-feature',
  'HOMEWORK': 'achievement',
  'EXAM': 'achievement',
  'MESSAGE': 'new-feature',
  'REMINDER': 'maintenance',
}

// 格式化时间显示
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<APINotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const isMountedRef = React.useRef(true)

  // 使用 Zustand store
  const { stats, loading, fetchStats, refreshStats, startAutoRefresh, stopAutoRefresh } = useDashboardStore()

  // 获取仪表盘数据和启动自动刷新
  useEffect(() => {
    isMountedRef.current = true
    fetchStats()
    fetchNotifications()
    startAutoRefresh()

    return () => {
      isMountedRef.current = false
      stopAutoRefresh()
    }
  }, [fetchStats, startAutoRefresh, stopAutoRefresh])

  // 监听页面可见性变化，当页面重新可见时刷新数据并控制自动刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时立即刷新数据并启动自动刷新
        fetchStats()
        startAutoRefresh()
      } else {
        // 页面不可见时停止自动刷新
        stopAutoRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchStats, startAutoRefresh, stopAutoRefresh])

  // 监听窗口聚焦事件，当用户切换回页面时刷新数据
  useEffect(() => {
    const handleFocus = () => {
      fetchStats()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
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
    {
      title: '总课程数',
      value: stats.totalCourses,
      icon: <BookOutlined />,
      color: '#c9a87c',
      bgColor: 'rgba(201, 168, 124, 0.1)',
      path: '/courses',
    },
    {
      title: '总学生数',
      value: stats.totalStudents,
      icon: <UserOutlined />,
      color: '#6b9b7a',
      bgColor: 'rgba(107, 155, 122, 0.1)',
      path: '/students',
    },
    {
      title: '本月教案',
      value: stats.monthlyLessonPlans,
      icon: <FileTextOutlined />,
      color: '#7a9ab8',
      bgColor: 'rgba(122, 154, 184, 0.1)',
      path: '/lesson-planner',
    },
    {
      title: '我的资源',
      value: stats.totalResources,
      icon: <RocketOutlined />,
      color: '#909399',
      bgColor: 'rgba(144, 147, 153, 0.1)',
      path: '/resource-center',
    },
  ]

  const quickActions = [
    {
      icon: <PlusOutlined />,
      title: '创建新课程',
      desc: '开始设计一堂新课',
      onClick: () => navigate('/courses/create'),
    },
    {
      icon: <UserAddOutlined />,
      title: '添加学生',
      desc: '录入新学生信息',
      onClick: () => navigate('/students/create'),
    },
    {
      icon: <FileTextOutlined />,
      title: '查看报告',
      desc: '查看教学数据分析',
      onClick: () => navigate('/reports'),
    },
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
      {/* 页面标题 */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">工作台</h1>
          <p className="dashboard-subtitle">欢迎回来，祝您今天教学顺利！</p>
        </div>
        <div className="dashboard-header-right">
          <button
            className="refresh-btn"
            onClick={refreshStats}
            disabled={loading}
            title="刷新数据"
          >
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <div
              className={`stat-card stat-card-animate`}
              style={{
                '--stat-color': stat.color,
                '--stat-bg-color': stat.bgColor
              } as React.CSSProperties}
              onClick={() => navigate(stat.path)}
            >
              <div className="stat-card-content">
                <div
                  className="stat-icon-wrapper"
                  style={{ background: stat.bgColor, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div className="stat-info">
                  <div className="stat-value stat-value-animate">{stat.value?.toLocaleString?.() || stat.value}</div>
                  <div className="stat-label">{stat.title}</div>
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 快捷操作和通知 */}
      <Row gutter={[24, 24]} className="actions-row">
        <Col xs={24} lg={8}>
          <Card title="快捷操作" className="action-card">
            <div className="action-list">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="action-button"
                  onClick={action.onClick}
                >
                  <div className="action-icon">{action.icon}</div>
                  <div className="action-text">
                    <div className="action-title">{action.title}</div>
                    <div className="action-desc">{action.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="系统通知"
            className="notification-card"
            extra={notifications.length > 0 && (
              <a onClick={() => navigate('/notifications')}>查看全部</a>
            )}
          >
            <Spin spinning={notificationsLoading}>
              {notifications.length > 0 ? (
                <div className="notification-list">
                  {notifications.map((notification, index) => (
                    <div key={notification.id || index} className="notification-item">
                      <div className={`notification-icon ${typeStyleMapping[notification.type] || 'new-feature'}`}>
                        {iconMapping[notification.type] || <BellOutlined />}
                      </div>
                      <div className="notification-content">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-desc">{notification.content}</div>
                      </div>
                      <div className="notification-time">{formatTime(notification.created_at)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无通知"
                />
              )}
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard

import React, { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Popconfirm, Select, Spin, Tag, Typography, message } from 'antd'
import { BellOutlined, DeleteOutlined, ReadOutlined } from '@ant-design/icons'
import {
  deleteAllRead,
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
  NotificationType,
  type Notification,
} from '../../services/notification'
import './index.css'

const { Title, Text } = Typography

const TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.SYSTEM]: '系统',
  [NotificationType.COURSE]: '课程',
  [NotificationType.HOMEWORK]: '作业',
  [NotificationType.EXAM]: '考试',
  [NotificationType.MESSAGE]: '消息',
  [NotificationType.REMINDER]: '提醒',
}

const formatTime = (dateString: string): string => {
  // 后端返回 UTC 时间，但 SQLite 可能不带时区后缀（如 2026-07-09T01:30:00）
  // 若无时区信息，追加 Z 使 JS 正确解析为 UTC，否则会被当作本地时间导致偏差
  const hasTimezone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(dateString)
  const normalized = hasTimezone ? dateString : dateString + 'Z'
  const date = new Date(normalized)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleString('zh-CN', { hour12: false })
}

const NotificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Notification[]>([])
  const [typeFilter, setTypeFilter] = useState<NotificationType | undefined>(undefined)
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all')

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await getNotifications({
        page_size: 100,
        type: typeFilter,
        read: readFilter === 'all' ? undefined : readFilter === 'read',
      })
      setItems(response.data)
    } catch {
      message.error('获取通知失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadNotifications() }, [typeFilter, readFilter])

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id)
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)))
      message.success('已标记为已读')
    } catch { message.error('标记失败') }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      setItems((prev) => prev.map((item) => ({ ...item, read: true })))
      message.success('已全部标记为已读')
    } catch { message.error('操作失败') }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      message.success('通知已删除')
    } catch { message.error('删除失败') }
  }

  const handleDeleteRead = async () => {
    try {
      await deleteAllRead()
      setItems((prev) => prev.filter((item) => !item.read))
      message.success('已删除全部已读通知')
    } catch { message.error('删除失败') }
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="notifications-header-left">
          <Title level={2} className="notifications-title">
            <BellOutlined className="notifications-title-icon" />
            通知中心
          </Title>
          <Text className="notifications-subtitle">查看系统通知与业务提醒，避免遗漏日常教学事务。</Text>
        </div>
        <div className="notifications-toolbar">
          <Select
            allowClear placeholder="筛选类型" style={{ width: 140 }}
            value={typeFilter} onChange={(value) => setTypeFilter(value)}
            options={Object.values(NotificationType).map((value) => ({ label: TYPE_LABELS[value], value }))}
          />
          <Select style={{ width: 140 }} value={readFilter} onChange={setReadFilter}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '仅未读', value: 'unread' },
              { label: '仅已读', value: 'read' },
            ]}
          />
          <Button icon={<ReadOutlined />} disabled={!unreadCount} onClick={handleMarkAllRead}>全部已读</Button>
          <Popconfirm title="确定删除全部已读通知吗？" onConfirm={handleDeleteRead} disabled={!items.some((item) => item.read)}>
            <Button danger icon={<DeleteOutlined />} disabled={!items.some((item) => item.read)}>清理已读</Button>
          </Popconfirm>
        </div>
      </div>

      <Spin spinning={loading}>
        {items.length ? (
          <div className="notification-list">
            {items.map((item) => (
              <div key={item.id} className={`notification-row ${item.read ? 'is-read' : 'is-unread'}`}>
                <div className="notification-avatar" style={{
                  background: item.read ? 'rgba(122, 154, 184, 0.08)' : 'rgba(84, 140, 168, 0.12)',
                  color: item.read ? 'var(--color-info)' : 'var(--color-primary)'
                }}>
                  <BellOutlined />
                </div>
                <div className="notification-body">
                  <div className="notification-body-header">
                    <div className="notification-body-title">
                      {item.title}
                      <Tag color={item.read ? 'default' : 'processing'} style={{ marginLeft: 8 }}>
                        {item.read ? '已读' : '未读'}
                      </Tag>
                      <Tag style={{ marginLeft: 4 }}>{TYPE_LABELS[item.type]}</Tag>
                    </div>
                    <div className="notification-body-time">{formatTime(item.created_at)}</div>
                  </div>
                  <div className="notification-body-content">{item.content}</div>
                </div>
                <div className="notification-actions">
                  {!item.read && (
                    <Button type="link" size="small" onClick={() => handleMarkRead(item.id)}>标记已读</Button>
                  )}
                  <Popconfirm title="确定删除这条通知吗？" onConfirm={() => handleDelete(item.id)}>
                    <Button type="link" danger size="small">删除</Button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Spin>
    </div>
  )
}

export default NotificationsPage

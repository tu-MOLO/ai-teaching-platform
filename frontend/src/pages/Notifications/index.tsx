import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, List, Popconfirm, Select, Space, Spin, Tag, Typography, message } from 'antd'
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
  const date = new Date(dateString)
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
        limit: 100,
        type: typeFilter,
        read: readFilter === 'all' ? undefined : readFilter === 'read',
      })
      setItems(response.items)
    } catch {
      message.error('获取通知失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [typeFilter, readFilter])

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id)
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)))
      message.success('已标记为已读')
    } catch {
      message.error('标记失败')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      setItems((prev) => prev.map((item) => ({ ...item, read: true })))
      message.success('已全部标记为已读')
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      message.success('通知已删除')
    } catch {
      message.error('删除失败')
    }
  }

  const handleDeleteRead = async () => {
    try {
      await deleteAllRead()
      setItems((prev) => prev.filter((item) => !item.read))
      message.success('已删除全部已读通知')
    } catch {
      message.error('删除失败')
    }
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <Title level={2} className="notifications-title">通知中心</Title>
          <Text className="notifications-subtitle">
            查看系统通知与业务提醒，避免遗漏日常教学事务。
          </Text>
        </div>
        <Space wrap>
          <Select
            allowClear
            placeholder="筛选类型"
            style={{ width: 140 }}
            value={typeFilter}
            onChange={(value) => setTypeFilter(value)}
            options={Object.values(NotificationType).map((value) => ({
              label: TYPE_LABELS[value],
              value,
            }))}
          />
          <Select
            style={{ width: 140 }}
            value={readFilter}
            onChange={setReadFilter}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '仅未读', value: 'unread' },
              { label: '仅已读', value: 'read' },
            ]}
          />
          <Button icon={<ReadOutlined />} disabled={!unreadCount} onClick={handleMarkAllRead}>
            全部已读
          </Button>
          <Popconfirm title="确定删除全部已读通知吗？" onConfirm={handleDeleteRead} disabled={!items.some((item) => item.read)}>
            <Button danger icon={<DeleteOutlined />} disabled={!items.some((item) => item.read)}>
              清理已读
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Card className="notifications-card">
        <Spin spinning={loading}>
          {items.length ? (
            <List
              itemLayout="horizontal"
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  className={`notification-row ${item.read ? 'is-read' : 'is-unread'}`}
                  actions={[
                    !item.read ? (
                      <Button type="link" key="read" onClick={() => handleMarkRead(item.id)}>
                        标记已读
                      </Button>
                    ) : null,
                    <Popconfirm title="确定删除这条通知吗？" onConfirm={() => handleDelete(item.id)} key="delete">
                      <Button type="link" danger>
                        删除
                      </Button>
                    </Popconfirm>,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<div className="notification-avatar"><BellOutlined /></div>}
                    title={
                      <Space wrap>
                        <span>{item.title}</span>
                        <Tag color={item.read ? 'default' : 'processing'}>
                          {item.read ? '已读' : '未读'}
                        </Tag>
                        <Tag>{TYPE_LABELS[item.type]}</Tag>
                      </Space>
                    }
                    description={
                      <div className="notification-meta">
                        <div className="notification-content">{item.content}</div>
                        <div className="notification-time">{formatTime(item.created_at)}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default NotificationsPage

import React, { useEffect, useMemo, useState } from 'react'
import { Button, Empty, List, Popconfirm, Input, Switch, Tooltip, Checkbox, Spin, Dropdown, Modal } from 'antd';
import { message } from '@/utils/feedback';
import { PlusOutlined, DeleteOutlined, EditOutlined, InboxOutlined, MoreOutlined } from '@ant-design/icons'
import type { Conversation } from '../../services/ai'

interface ConversationListProps {
  conversations: Conversation[]
  currentId: string | null
  loading?: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => Promise<boolean>
  onNew: () => void
  onRename: (id: string, title: string) => Promise<boolean>
  onArchive: (id: string, archived: boolean) => Promise<boolean>
  onBatchDelete: (ids: string[]) => Promise<boolean>
  showArchived: boolean
  onToggleShowArchived: () => void
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentId,
  loading = false,
  onSelect,
  onDelete,
  onNew,
  onRename,
  onArchive,
  onBatchDelete,
  showArchived,
  onToggleShowArchived,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)

  // 会话被删除 / 归档后不再出现在当前列表里，同步清掉勾选，避免残留的幽灵选项
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(conversations.map((c) => c.id))
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [conversations])

  const startEditing = (item: Conversation) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
  }

  const confirmRename = async () => {
    if (!editingId) return
    const trimmed = editingTitle.trim()
    if (!trimmed) {
      cancelRename()
      return
    }
    if (trimmed.length > 100) {
      message.warning('会话名称不能超过100个字符')
      return
    }
    const ok = await onRename(editingId, trimmed)
    if (!ok) {
      message.error('重命名失败，请稍后重试')
      return
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleArchive = async (item: Conversation) => {
    const nextArchived = !item.is_archived
    const ok = await onArchive(item.id, nextArchived)
    if (!ok) {
      message.error(nextArchived ? '归档失败，请稍后重试' : '取消归档失败，请稍后重试')
      return
    }
    message.success(nextArchived ? '已归档' : '已取消归档')
  }

  const confirmDelete = (item: Conversation) => {
    Modal.confirm({
      title: '确定删除此对话？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const ok = await onDelete(item.id)
        if (!ok) {
          message.error('删除失败，请稍后重试')
          return
        }
        message.success('已删除该对话')
      },
    })
  }

  const handleMoreAction = (
    item: Conversation,
    { key, domEvent }: { key: string; domEvent: React.MouseEvent | React.KeyboardEvent }
  ) => {
    domEvent.stopPropagation()
    if (key === 'archive') {
      handleArchive(item)
    } else if (key === 'rename') {
      startEditing(item)
    } else if (key === 'delete') {
      confirmDelete(item)
    }
  }

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(conversations.map((c) => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    setBatchDeleting(true)
    try {
      const count = selectedIds.size
      const ok = await onBatchDelete(Array.from(selectedIds))
      if (!ok) {
        message.error('批量删除失败，请稍后重试')
        return
      }
      message.success(`已删除 ${count} 条对话`)
      setSelectedIds(new Set())
    } finally {
      setBatchDeleting(false)
    }
  }

  const cancelBatch = () => {
    setSelectedIds(new Set())
  }

  const isSelecting = selectedIds.size > 0
  const allSelected = useMemo(
    () => conversations.length > 0 && conversations.every((c) => selectedIds.has(c.id)),
    [conversations, selectedIds]
  )

  return (
    <div className="conversation-list">
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={onNew}
          style={{ flex: 1 }}
        >
          新建对话
        </Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {showArchived ? '已归档对话' : '全部对话'}（{conversations.length}）
        </span>
        <Tooltip title={showArchived ? '返回全部对话' : '只看已归档'}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>只看归档</span>
            <Switch
              size="small"
              checked={showArchived}
              onChange={onToggleShowArchived}
              checkedChildren={<InboxOutlined />}
              unCheckedChildren={<InboxOutlined />}
            />
          </span>
        </Tooltip>
      </div>
      {!isSelecting && conversations.length > 0 && (
        <div style={{ padding: '0 4px 8px', fontSize: 12, color: 'var(--color-text-muted)' }}>
          勾选会话前的复选框可批量删除
        </div>
      )}
      {isSelecting && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            padding: '8px 4px',
            background: 'var(--color-bg-secondary)',
            borderRadius: 4,
          }}
        >
          <Checkbox checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)}>
            全选
          </Checkbox>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" onClick={cancelBatch} disabled={batchDeleting}>
              取消
            </Button>
            <Popconfirm
              title={`确定删除选中的 ${selectedIds.size} 条对话？`}
              onConfirm={handleBatchDelete}
            >
              <Button size="small" danger loading={batchDeleting}>
                批量删除
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}
      {loading && conversations.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spin size="small" />
        </div>
      ) : (
        <List
          dataSource={conversations}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={showArchived ? '还没有归档的对话' : '还没有对话，点上方新建开始'}
              />
            ),
          }}
          renderItem={(item) => (
            <List.Item
              className={`conversation-item ${item.id === currentId ? 'active' : ''}`}
              onClick={() => {
                if (editingId !== item.id) onSelect(item.id)
              }}
              actions={[
                <Dropdown
                  key="more"
                  trigger={['click']}
                  menu={{
                    items: [
                      {
                        key: 'archive',
                        icon: <InboxOutlined />,
                        label: item.is_archived ? '取消归档' : '归档',
                      },
                      { key: 'rename', icon: <EditOutlined />, label: '重命名' },
                      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
                    ],
                    onClick: (info) => handleMoreAction(item, info),
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => toggleSelect(item.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                }
                title={
                  editingId === item.id ? (
                    <Input
                      size="small"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onPressEnter={confirmRename}
                      onBlur={confirmRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelRename()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      maxLength={100}
                    />
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {item.title}
                      {item.is_archived && (
                        <span style={{ fontSize: 10, color: 'var(--color-primary)', marginLeft: 4 }}>
                          (已归档)
                        </span>
                      )}
                    </span>
                  )
                }
                description={new Date(item.updated_at).toLocaleString()}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  )
}

export default ConversationList

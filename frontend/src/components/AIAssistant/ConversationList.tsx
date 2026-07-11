import React, { useState } from 'react'
import { Button, List, Popconfirm, Input, message, Switch, Tooltip, Checkbox } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, InboxOutlined } from '@ant-design/icons'
import type { Conversation } from '../../services/ai'

interface ConversationListProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => Promise<void>
  onArchive: (id: string, archived: boolean) => Promise<void>
  onBatchDelete: (ids: string[]) => Promise<void>
  showArchived: boolean
  onToggleShowArchived: () => void
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentId,
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

  const startEditing = (e: React.MouseEvent, item: Conversation) => {
    e.stopPropagation()
    setEditingId(item.id)
    setEditingTitle(item.title)
  }

  const confirmRename = async () => {
    if (!editingId || !editingTitle.trim()) return
    const trimmed = editingTitle.trim()
    if (trimmed.length > 100) {
      message.warning('会话名称不能超过100个字符')
      return
    }
    await onRename(editingId, trimmed)
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleArchive = async (e: React.MouseEvent, item: Conversation) => {
    e.stopPropagation()
    await onArchive(item.id, !item.is_archived)
    message.success(item.is_archived ? '已取消归档' : '已归档')
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
      await onBatchDelete(Array.from(selectedIds))
      message.success(`已删除 ${selectedIds.size} 条对话`)
      setSelectedIds(new Set())
    } finally {
      setBatchDeleting(false)
    }
  }

  const cancelBatch = () => {
    setSelectedIds(new Set())
  }

  const isSelecting = selectedIds.size > 0
  const allSelected = conversations.length > 0 && conversations.every((c) => selectedIds.has(c.id))

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
        <span style={{ fontSize: 12, color: '#666' }}>
          {showArchived ? '已归档' : '全部对话'}
        </span>
        <Tooltip title={showArchived ? '显示全部对话' : '仅显示已归档'}>
          <Switch
            size="small"
            checked={showArchived}
            onChange={onToggleShowArchived}
            checkedChildren={<InboxOutlined />}
            unCheckedChildren={<InboxOutlined />}
          />
        </Tooltip>
      </div>
      {isSelecting && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            padding: '8px 4px',
            background: '#f6ffed',
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
      <List
        dataSource={conversations}
        renderItem={(item) => (
          <List.Item
            className={`conversation-item ${item.id === currentId ? 'active' : ''}`}
            onClick={() => {
              if (editingId !== item.id) onSelect(item.id)
            }}
            actions={[
              <Tooltip key="archive" title={item.is_archived ? '取消归档' : '归档'}>
                <Button
                  type="text"
                  size="small"
                  icon={<InboxOutlined style={{ color: item.is_archived ? '#1890ff' : undefined }} />}
                  onClick={(e) => handleArchive(e, item)}
                />
              </Tooltip>,
              <Button
                key="edit"
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => startEditing(e, item)}
              />,
              <Popconfirm
                key="delete"
                title="确定删除此对话？"
                onConfirm={(e) => {
                  e?.stopPropagation()
                  onDelete(item.id)
                }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  danger
                />
              </Popconfirm>,
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
                      <span style={{ fontSize: 10, color: '#1890ff', marginLeft: 4 }}>
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
    </div>
  )
}

export default ConversationList

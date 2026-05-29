import React, { useState } from 'react'
import { Button, List, Popconfirm, Input, message } from 'antd'
import { PlusOutlined, DeleteOutlined, MessageOutlined, EditOutlined } from '@ant-design/icons'
import type { Conversation } from '../../services/ai'

interface ConversationListProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => Promise<void>
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNew,
  onRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

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

  return (
    <div className="conversation-list">
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onNew}
        block
        style={{ marginBottom: 8 }}
      >
        新建对话
      </Button>
      <List
        dataSource={conversations}
        renderItem={(item) => (
          <List.Item
            className={`conversation-item ${item.id === currentId ? 'active' : ''}`}
            onClick={() => {
              if (editingId !== item.id) onSelect(item.id)
            }}
            actions={[
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
              avatar={<MessageOutlined />}
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
                  item.title
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

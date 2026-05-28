import React from 'react'
import { Button, List, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons'
import type { Conversation } from '../../services/ai'

interface ConversationListProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNew,
}) => {
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
            onClick={() => onSelect(item.id)}
            actions={[
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
              title={item.title}
              description={new Date(item.updated_at).toLocaleDateString()}
            />
          </List.Item>
        )}
      />
    </div>
  )
}

export default ConversationList

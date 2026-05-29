import React from 'react'
import { Tag } from 'antd'
import { UserOutlined, RobotOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import type { Message } from '../../services/ai'
import { MODULE_OPTIONS } from '../../services/ai'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

interface ChatMessageProps {
  message: Message
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const moduleInfo = message.module_tag
    ? MODULE_OPTIONS.find(m => m.key === message.module_tag)
    : null

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-message-avatar">
        {isUser ? <UserOutlined /> : <RobotOutlined />}
      </div>
      <div className="chat-message-body">
        {moduleInfo && (
          <Tag color={moduleInfo.color} className="chat-message-tag">
            {moduleInfo.label}
          </Tag>
        )}
        <div className="chat-message-content">
          {isUser ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
          ) : (
            <div className="markdown-preview-wrapper">
              <MDEditor.Markdown
                source={message.content || ''}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '14px',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage

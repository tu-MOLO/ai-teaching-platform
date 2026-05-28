import React from 'react'
import { Tag } from 'antd'
import { UserOutlined, RobotOutlined } from '@ant-design/icons'
import type { Message } from '../../services/ai'
import { MODULE_OPTIONS } from '../../services/ai'

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
            <p>{message.content}</p>
          ) : (
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
          )}
        </div>
      </div>
    </div>
  )
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  html = html.replace(/\n/g, '<br/>')
  return html
}

export default ChatMessage

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Spin, Tooltip } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useAIStore } from '../../stores/ai'
import { streamChatMessage, deleteConversation, type Message, MODULE_OPTIONS } from '../../services/ai'
import ChatMessage from '../../components/AIAssistant/ChatMessage'
import ChatInput from '../../components/AIAssistant/ChatInput'
import ConversationList from '../../components/AIAssistant/ConversationList'
import './index.css'

const AIAssistant: React.FC = () => {
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    aiConfig,
    configLoaded,
    showArchived,
    loadConversations,
    selectConversation,
    addMessage,
    updateLastAssistantMessage,
    setStreaming,
    setCurrentConversationId,
    loadAIConfig,
    renameConversation,
    archiveConversation,
    batchDeleteConversations,
    toggleShowArchived,
  } = useAIStore()

  useEffect(() => {
    loadConversations()
    loadAIConfig()
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (content: string, module?: string) => {
    if (!content.trim() || isStreaming) return

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: currentConversationId || '',
      role: 'user',
      content,
      tool_calls: null,
      tool_call_id: null,
      module_tag: module || null,
      created_at: new Date().toISOString(),
    }
    addMessage(userMessage)

    const assistantMessage: Message = {
      id: `temp_assistant_${Date.now()}`,
      conversation_id: currentConversationId || '',
      role: 'assistant',
      content: '',
      tool_calls: null,
      tool_call_id: null,
      module_tag: null,
      created_at: new Date().toISOString(),
    }
    addMessage(assistantMessage)
    setStreaming(true)

    let fullContent = ''

    try {
      const stream = streamChatMessage(
        {
          message: content,
          conversation_id: currentConversationId || undefined,
          module: module || undefined,
          stream: true,
        },
        abortControllerRef.current.signal
      )

      for await (const event of stream) {
        if (event.type === 'content' && event.content) {
          fullContent += event.content
          updateLastAssistantMessage(fullContent)
        }
        if (event.type === 'tool_call' && event.tool_name) {
          // Could show tool call indicator
        }
        if (event.type === 'done' && event.conversation_id) {
          if (!currentConversationId) {
            setCurrentConversationId(event.conversation_id)
          }
        }
        if (event.type === 'error') {
          fullContent += `\n\n⚠️ ${event.content || '发生错误'}`
          updateLastAssistantMessage(fullContent)
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      fullContent += '\n\n⚠️ 请求失败，请稍后重试'
      updateLastAssistantMessage(fullContent)
    } finally {
      setStreaming(false)
      loadConversations()
    }
  }

  const handleNewConversation = () => {
    selectConversation(null)
  }

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id)
      if (currentConversationId === id) {
        selectConversation(null)
      }
      loadConversations()
    } catch {
      // ignore
    }
  }

  const hasApiKey = !!aiConfig?.api_key

  if (!configLoaded) {
    return (
      <div className="ai-assistant-page">
        <div className="ai-assistant-loading">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!hasApiKey) {
    return (
      <div className="ai-assistant-page">
        <div className="ai-assistant-no-config">
          <Empty
            description="请先配置 API 密钥以启用 AI 助手功能"
          >
            <Button type="primary" onClick={() => navigate('/settings?tab=ai')}>
              前往设置
            </Button>
          </Empty>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-assistant-page">
      <div className={`ai-assistant-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && <span className="sidebar-title">对话列表</span>}
          <Tooltip title={sidebarCollapsed ? '展开' : '收起'}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              size="small"
            />
          </Tooltip>
        </div>
        {!sidebarCollapsed && (
          <ConversationList
            conversations={conversations}
            currentId={currentConversationId}
            onSelect={(id) => selectConversation(id)}
            onDelete={handleDeleteConversation}
            onNew={handleNewConversation}
            onRename={renameConversation}
            onArchive={archiveConversation}
            onBatchDelete={batchDeleteConversations}
            showArchived={showArchived}
            onToggleShowArchived={toggleShowArchived}
          />
        )}
      </div>
      <div className="ai-assistant-main">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Empty description="开始一段新对话" />
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <ChatInput onSend={handleSendMessage} disabled={isStreaming} moduleOptions={MODULE_OPTIONS} />
      </div>
    </div>
  )
}

export default AIAssistant

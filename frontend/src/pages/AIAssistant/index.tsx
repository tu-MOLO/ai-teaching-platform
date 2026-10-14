import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Spin, Tooltip } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useAIStore } from '../../stores/ai'
import { streamChatMessage, type Message, MODULE_OPTIONS } from '../../services/ai'
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
    listLoading,
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
    deleteConversation,
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
          // 后端已给出面向用户的文案（发生了什么 / 可能原因 / 下一步），原样呈现
          console.error('[AI] 流式响应返回错误事件:', event.content)
          fullContent += `\n\n⚠️ 本次回复未能完成\n${event.content || 'AI 服务未返回结果，请稍后重试。'}`
          updateLastAssistantMessage(fullContent)
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      console.error('[AI] 对话请求失败:', err)
      const offline = err?.name === 'TypeError' || String(err?.message || '').includes('fetch')
      const friendly = offline
        ? '无法连接服务器：请检查本机网络是否正常，并确认后端服务已启动后重试。'
        : '本次请求未能完成，请稍后重试。若持续出现，请到「设置 → AI 助手」检查服务配置。'
      fullContent += `\n\n⚠️ 本次回复未能完成\n${friendly}`
      updateLastAssistantMessage(fullContent)
    } finally {
      setStreaming(false)
      loadConversations()
    }
  }

  const handleNewConversation = () => {
    selectConversation(null)
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

  // 未配置密钥时不再整页替换：会话列表照常可用，主区给出配置引导。
  // 之前整页 early-return 会把会话 CRUD 一起藏掉，表现为"管理功能用不了"。
  const renderMain = () => {
    if (!hasApiKey) {
      return (
        <div className="ai-assistant-no-config">
          <Empty
            description={
              <div className="ai-no-config-guide">
                <p className="ai-no-config-title">AI 助手尚未启用</p>
                <p className="ai-no-config-desc">
                  AI 助手使用您自己的模型 API 密钥，密钥仅保存在本地，用于直接调用模型服务。
                </p>
                <ol className="ai-no-config-steps">
                  <li>点击下方按钮前往「设置」</li>
                  <li>在「AI 助手」中填写服务商与 API 密钥</li>
                  <li>返回本页即可开始对话</li>
                </ol>
              </div>
            }
          >
            <Button type="primary" onClick={() => navigate('/settings?tab=ai')}>
              前往设置
            </Button>
          </Empty>
        </div>
      )
    }

    return (
      <>
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Empty description={currentConversationId ? '这条对话还没有消息' : '开始一段新对话'} />
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          moduleOptions={MODULE_OPTIONS}
        />
      </>
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
            loading={listLoading}
            onSelect={(id) => selectConversation(id)}
            onDelete={deleteConversation}
            onNew={handleNewConversation}
            onRename={renameConversation}
            onArchive={archiveConversation}
            onBatchDelete={batchDeleteConversations}
            showArchived={showArchived}
            onToggleShowArchived={toggleShowArchived}
          />
        )}
      </div>
      <div className="ai-assistant-main">{renderMain()}</div>
    </div>
  )
}

export default AIAssistant

import api from './api'
import { toItem } from './response'

export interface AIConfigResponse {
  provider: string
  api_base: string
  model: string
  api_key: string | null
  is_active: boolean
  is_user_configured: boolean
}

export interface AIConfigUpdate {
  provider?: string
  api_base?: string
  model?: string
  api_key?: string
}

export interface AIConfigTestRequest {
  provider?: string
  api_base?: string
  model?: string
  api_key?: string
}

export interface AIConfigTestResponse {
  success: boolean
  message: string
}

export interface Conversation {
  id: string
  title: string
  module: string | null
  created_at: string
  updated_at: string
}

export interface ConversationListResponse {
  data: Conversation[]
  total: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls: string | null
  tool_call_id: string | null
  module_tag: string | null
  created_at: string
}

export interface MessageListResponse {
  data: Message[]
}

export interface ChatRequest {
  message: string
  conversation_id?: string
  module?: string
  stream?: boolean
}

export interface ChatResponse {
  conversation_id: string
  message: string
  module_tag: string | null
}

export interface SSEEvent {
  type: 'content' | 'tool_call' | 'done' | 'error'
  content?: string
  tool_name?: string
  conversation_id?: string
}

export const getAIConfig = async (): Promise<AIConfigResponse> => {
  const response = await api.get('/ai/config')
  return toItem<AIConfigResponse>(response)
}

export const updateAIConfig = async (data: AIConfigUpdate): Promise<AIConfigResponse> => {
  const response = await api.put('/ai/config', data)
  return toItem<AIConfigResponse>(response)
}

export const testAIConfig = async (data?: AIConfigTestRequest): Promise<AIConfigTestResponse> => {
  const response = await api.post('/ai/config/test', data || {})
  return toItem<AIConfigTestResponse>(response)
}

export const resetAIConfig = async (): Promise<AIConfigResponse> => {
  const response = await api.delete('/ai/config')
  return toItem<AIConfigResponse>(response)
}

export const getConversations = async (): Promise<ConversationListResponse> => {
  const response = await api.get('/ai/conversations')
  return toItem<ConversationListResponse>(response)
}

export const getConversationMessages = async (conversationId: string): Promise<MessageListResponse> => {
  const response = await api.get(`/ai/conversations/${conversationId}`)
  return toItem<MessageListResponse>(response)
}

export const deleteConversation = async (conversationId: string): Promise<void> => {
  await api.delete(`/ai/conversations/${conversationId}`)
}

export const sendChatMessage = async (data: ChatRequest): Promise<ChatResponse> => {
  const response = await api.post('/ai/chat', { ...data, stream: false })
  return toItem<ChatResponse>(response)
}

export const PROVIDER_DEFAULTS: Record<string, { api_base: string; models: string[] }> = {
  zhipu: {
    api_base: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.7-flash', 'glm-4.7-flashx', 'glm-4.5-air', 'glm-4.5-flash'],
  },
}

export const MODULE_OPTIONS = [
  { key: 'course', label: '课程创建', color: '#c9a87c' },
  { key: 'student', label: '学生管理', color: '#6b9b7a' },
  { key: 'data', label: '数据查看', color: '#7a9ab8' },
  { key: 'lesson_plan', label: '教案管理', color: '#d4a574' },
  { key: 'resource', label: '资源管理', color: '#9b8b7a' },
  { key: 'notification', label: '通知管理', color: '#b8a07a' },
] as const

export async function* streamChatMessage(
  data: ChatRequest
): AsyncGenerator<SSEEvent, void, undefined> {
  const baseURL = (api.defaults.baseURL as string) || '/api/v1'
  const url = `${baseURL}/ai/chat`

  const { useAuthStore } = await import('../stores/auth')
  const token = useAuthStore.getState().token

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...data, stream: true }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const detail = errorData.detail || `HTTP ${response.status}`
    yield { type: 'error', content: detail }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', content: '无法读取响应流' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') return
      try {
        const event: SSEEvent = JSON.parse(payload)
        yield event
      } catch {
        // skip malformed data
      }
    }
  }
}

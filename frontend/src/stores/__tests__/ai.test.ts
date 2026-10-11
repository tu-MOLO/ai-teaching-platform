import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetConversations = vi.fn()
const mockGetConversationMessages = vi.fn()
const mockGetAIConfig = vi.fn()
const mockRenameConversationApi = vi.fn()
const mockArchiveConversationApi = vi.fn()
const mockBatchDeleteConversationsApi = vi.fn()

vi.mock('../../services/ai', () => ({
  getConversations: (...args: any[]) => mockGetConversations(...args),
  getConversationMessages: (...args: any[]) => mockGetConversationMessages(...args),
  getAIConfig: (...args: any[]) => mockGetAIConfig(...args),
  renameConversation: (...args: any[]) => mockRenameConversationApi(...args),
  archiveConversation: (...args: any[]) => mockArchiveConversationApi(...args),
  batchDeleteConversations: (...args: any[]) => mockBatchDeleteConversationsApi(...args),
}))

import { useAIStore } from '../ai'

const defaultInitialState = {
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  aiConfig: null,
  configLoaded: false,
}

describe('useAIStore', () => {
  beforeEach(() => {
    useAIStore.setState({ ...defaultInitialState })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has empty conversations', () => {
      expect(useAIStore.getState().conversations).toEqual([])
    })

    it('has null currentConversationId', () => {
      expect(useAIStore.getState().currentConversationId).toBeNull()
    })

    it('has empty messages', () => {
      expect(useAIStore.getState().messages).toEqual([])
    })

    it('has isLoading false', () => {
      expect(useAIStore.getState().isLoading).toBe(false)
    })

    it('has isStreaming false', () => {
      expect(useAIStore.getState().isStreaming).toBe(false)
    })

    it('has null aiConfig', () => {
      expect(useAIStore.getState().aiConfig).toBeNull()
    })

    it('has configLoaded false', () => {
      expect(useAIStore.getState().configLoaded).toBe(false)
    })
  })

  describe('loadConversations', () => {
    it('fetches and sets conversations', async () => {
      const conversations = [
        { id: '1', title: 'Chat 1', module: null, created_at: '', updated_at: '' },
        { id: '2', title: 'Chat 2', module: 'course', created_at: '', updated_at: '' },
      ]
      mockGetConversations.mockResolvedValueOnce({ data: conversations })

      await useAIStore.getState().loadConversations()

      expect(useAIStore.getState().conversations).toEqual(conversations)
    })

    it('handles error gracefully', async () => {
      mockGetConversations.mockRejectedValueOnce(new Error('Network error'))

      await useAIStore.getState().loadConversations()

      expect(useAIStore.getState().conversations).toEqual([])
    })

    it('sets empty array when response has no data', async () => {
      mockGetConversations.mockResolvedValueOnce({ data: null })

      await useAIStore.getState().loadConversations()

      expect(useAIStore.getState().conversations).toEqual([])
    })
  })

  describe('selectConversation', () => {
    it('sets currentConversationId and fetches messages', async () => {
      const messages = [
        { id: 'm1', conversation_id: '1', role: 'user', content: 'Hello', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' },
      ]
      mockGetConversationMessages.mockResolvedValueOnce({ data: messages })

      await useAIStore.getState().selectConversation('1')

      const state = useAIStore.getState()
      expect(state.currentConversationId).toBe('1')
      expect(state.messages).toEqual(messages)
      expect(state.isLoading).toBe(false)
    })

    it('sets isLoading true during fetch, false after', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockGetConversationMessages.mockReturnValueOnce(pendingPromise as never)

      const selectPromise = useAIStore.getState().selectConversation('1')

      expect(useAIStore.getState().isLoading).toBe(true)

      resolvePromise!({ data: [] })

      await selectPromise

      expect(useAIStore.getState().isLoading).toBe(false)
    })

    it('handles null id - clears messages and sets loading false', async () => {
      await useAIStore.getState().selectConversation(null)

      const state = useAIStore.getState()
      expect(state.currentConversationId).toBeNull()
      expect(state.messages).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(mockGetConversationMessages).not.toHaveBeenCalled()
    })

    it('handles error when fetching messages', async () => {
      mockGetConversationMessages.mockRejectedValueOnce(new Error('Not found'))

      await useAIStore.getState().selectConversation('1')

      const state = useAIStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.messages).toEqual([])
    })
  })

  describe('addMessage', () => {
    it('appends message to messages array', () => {
      const msg1 = { id: 'm1', conversation_id: '1', role: 'user' as const, content: 'Hi', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' }
      const msg2 = { id: 'm2', conversation_id: '1', role: 'assistant' as const, content: 'Hello!', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' }

      useAIStore.getState().addMessage(msg1)
      expect(useAIStore.getState().messages).toEqual([msg1])

      useAIStore.getState().addMessage(msg2)
      expect(useAIStore.getState().messages).toEqual([msg1, msg2])
    })
  })

  describe('updateLastAssistantMessage', () => {
    it('updates last assistant message content', () => {
      const msg = { id: 'm1', conversation_id: '1', role: 'assistant' as const, content: 'Partial...', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' }
      useAIStore.setState({ messages: [msg] })

      useAIStore.getState().updateLastAssistantMessage('Full response')

      expect(useAIStore.getState().messages[0].content).toBe('Full response')
    })

    it('does nothing if last message is not assistant', () => {
      const msg = { id: 'm1', conversation_id: '1', role: 'user' as const, content: 'Hello', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' }
      useAIStore.setState({ messages: [msg] })

      useAIStore.getState().updateLastAssistantMessage('Should not change')

      expect(useAIStore.getState().messages[0].content).toBe('Hello')
    })

    it('does nothing if messages is empty', () => {
      useAIStore.getState().updateLastAssistantMessage('Nothing')

      expect(useAIStore.getState().messages).toEqual([])
    })
  })

  describe('setLoading', () => {
    it('sets isLoading', () => {
      useAIStore.getState().setLoading(true)
      expect(useAIStore.getState().isLoading).toBe(true)

      useAIStore.getState().setLoading(false)
      expect(useAIStore.getState().isLoading).toBe(false)
    })
  })

  describe('setStreaming', () => {
    it('sets isStreaming', () => {
      useAIStore.getState().setStreaming(true)
      expect(useAIStore.getState().isStreaming).toBe(true)

      useAIStore.getState().setStreaming(false)
      expect(useAIStore.getState().isStreaming).toBe(false)
    })
  })

  describe('setCurrentConversationId', () => {
    it('sets currentConversationId', () => {
      useAIStore.getState().setCurrentConversationId('conv-123')
      expect(useAIStore.getState().currentConversationId).toBe('conv-123')

      useAIStore.getState().setCurrentConversationId(null)
      expect(useAIStore.getState().currentConversationId).toBeNull()
    })
  })

  describe('loadAIConfig', () => {
    it('fetches config and sets configLoaded', async () => {
      const config = {
        provider: 'openai', provider_name: 'OpenAI', api_base: 'https://api.openai.com/v1',
        model: 'gpt-4o', api_key: null, is_active: true, is_user_configured: false,
      }
      mockGetAIConfig.mockResolvedValueOnce(config)

      await useAIStore.getState().loadAIConfig()

      const state = useAIStore.getState()
      expect(state.aiConfig).toEqual(config)
      expect(state.configLoaded).toBe(true)
    })

    it('handles error - still sets configLoaded', async () => {
      mockGetAIConfig.mockRejectedValueOnce(new Error('Network error'))

      await useAIStore.getState().loadAIConfig()

      const state = useAIStore.getState()
      expect(state.configLoaded).toBe(true)
      expect(state.aiConfig).toBeNull()
    })
  })

  describe('renameConversation', () => {
    it('calls API and updates conversation in state', async () => {
      const conversations = [
        { id: '1', title: 'Old Title', module: null, created_at: '', updated_at: '', is_archived: false },
        { id: '2', title: 'Chat 2', module: 'course', created_at: '', updated_at: '', is_archived: false },
      ]
      useAIStore.setState({ conversations })
      mockRenameConversationApi.mockResolvedValueOnce(undefined)

      await useAIStore.getState().renameConversation('1', 'New Title')

      const state = useAIStore.getState()
      expect(state.conversations[0].title).toBe('New Title')
      expect(state.conversations[1].title).toBe('Chat 2')
    })

    it('handles error gracefully', async () => {
      const conversations = [{ id: '1', title: 'Old Title', module: null, created_at: '', updated_at: '', is_archived: false }]
      useAIStore.setState({ conversations })
      mockRenameConversationApi.mockRejectedValueOnce(new Error('Failed'))

      await useAIStore.getState().renameConversation('1', 'New Title')

      expect(useAIStore.getState().conversations[0].title).toBe('Old Title')
    })
  })

  describe('archiveConversation', () => {
    it('归档当前会话且不显示归档视图时，清空当前会话与消息', async () => {
      mockArchiveConversationApi.mockResolvedValueOnce(undefined)
      mockGetConversations.mockResolvedValueOnce({ data: [] })
      useAIStore.setState({
        currentConversationId: '1',
        messages: [{ id: 'm1' }],
        showArchived: false,
      })

      await useAIStore.getState().archiveConversation('1', true)

      expect(mockArchiveConversationApi).toHaveBeenCalledWith('1', true)
      const state = useAIStore.getState()
      expect(state.currentConversationId).toBeNull()
      expect(state.messages).toEqual([])
    })

    it('归档的不是当前会话时，保留当前会话', async () => {
      mockArchiveConversationApi.mockResolvedValueOnce(undefined)
      mockGetConversations.mockResolvedValueOnce({ data: [] })
      useAIStore.setState({
        currentConversationId: '2',
        messages: [{ id: 'm2' }],
        showArchived: false,
      })

      await useAIStore.getState().archiveConversation('1', true)

      const state = useAIStore.getState()
      expect(state.currentConversationId).toBe('2')
      expect(state.messages).toEqual([{ id: 'm2' }])
    })

    it('处于归档视图时取消归档不清空当前会话', async () => {
      mockArchiveConversationApi.mockResolvedValueOnce(undefined)
      mockGetConversations.mockResolvedValueOnce({ data: [] })
      useAIStore.setState({
        currentConversationId: '1',
        messages: [{ id: 'm1' }],
        showArchived: true,
      })

      await useAIStore.getState().archiveConversation('1', false)

      const state = useAIStore.getState()
      expect(state.currentConversationId).toBe('1')
      expect(state.messages).toEqual([{ id: 'm1' }])
    })

    it('API 失败时静默处理且不清空', async () => {
      mockArchiveConversationApi.mockRejectedValueOnce(new Error('fail'))
      useAIStore.setState({
        currentConversationId: '1',
        messages: [{ id: 'm1' }],
        showArchived: false,
      })

      await useAIStore.getState().archiveConversation('1', true)

      const state = useAIStore.getState()
      expect(state.currentConversationId).toBe('1')
      expect(state.messages).toEqual([{ id: 'm1' }])
    })
  })

  describe('batchDeleteConversations', () => {
    it('空 id 列表直接返回，不调用 API', async () => {
      await useAIStore.getState().batchDeleteConversations([])
      expect(mockBatchDeleteConversationsApi).not.toHaveBeenCalled()
    })

    it('批量删除包含当前会话时清空当前会话', async () => {
      mockBatchDeleteConversationsApi.mockResolvedValueOnce(undefined)
      mockGetConversations.mockResolvedValueOnce({ data: [] })
      useAIStore.setState({
        currentConversationId: '1',
        messages: [{ id: 'm1' }],
      })

      await useAIStore.getState().batchDeleteConversations(['1', '2'])

      expect(mockBatchDeleteConversationsApi).toHaveBeenCalledWith(['1', '2'])
      const state = useAIStore.getState()
      expect(state.currentConversationId).toBeNull()
      expect(state.messages).toEqual([])
    })

    it('批量删除不含当前会话时保留状态', async () => {
      mockBatchDeleteConversationsApi.mockResolvedValueOnce(undefined)
      mockGetConversations.mockResolvedValueOnce({ data: [] })
      useAIStore.setState({
        currentConversationId: '9',
        messages: [{ id: 'm9' }],
      })

      await useAIStore.getState().batchDeleteConversations(['1', '2'])

      const state = useAIStore.getState()
      expect(state.currentConversationId).toBe('9')
      expect(state.messages).toEqual([{ id: 'm9' }])
    })

    it('API 失败时静默处理', async () => {
      mockBatchDeleteConversationsApi.mockRejectedValueOnce(new Error('fail'))
      useAIStore.setState({ currentConversationId: '1', messages: [{ id: 'm1' }] })

      await useAIStore.getState().batchDeleteConversations(['1'])

      expect(useAIStore.getState().currentConversationId).toBe('1')
    })
  })

  describe('toggleShowArchived', () => {
    it('在归档/常规视图间切换并重新加载会话', async () => {
      mockGetConversations.mockResolvedValue({ data: [] })
      expect(useAIStore.getState().showArchived).toBe(false)

      useAIStore.getState().toggleShowArchived()
      expect(useAIStore.getState().showArchived).toBe(true)

      useAIStore.getState().toggleShowArchived()
      expect(useAIStore.getState().showArchived).toBe(false)
      expect(mockGetConversations).toHaveBeenCalledTimes(2)
    })
  })

  describe('reset', () => {
    it('clears conversations, currentConversationId, messages, loading, streaming', () => {
      useAIStore.setState({
        conversations: [{ id: '1', title: 'Chat', module: null, created_at: '', updated_at: '', is_archived: false }],
        currentConversationId: '1',
        messages: [{ id: 'm1', conversation_id: '1', role: 'user', content: 'Hi', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' }],
        isLoading: true,
        isStreaming: true,
      })

      useAIStore.getState().reset()

      const state = useAIStore.getState()
      expect(state.conversations).toEqual([])
      expect(state.currentConversationId).toBeNull()
      expect(state.messages).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.isStreaming).toBe(false)
    })
  })
})
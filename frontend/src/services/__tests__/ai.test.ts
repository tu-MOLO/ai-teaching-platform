import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockPatch = vi.fn()

vi.mock('../api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
    patch: (...args: any[]) => mockPatch(...args),
    defaults: { baseURL: '/api/v1' },
  }
}))

vi.mock('../response', () => ({
  toItem: (response: any) => response,
}))

const mockGetState = vi.fn().mockReturnValue({ token: 'test-token' })

vi.mock('../../stores/auth', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}))

describe('ai service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAIConfig', () => {
    it('calls api.get with /ai/config', async () => {
      const { getAIConfig } = await import('../ai')

      mockGet.mockResolvedValue({ data: { provider: 'openai', is_active: true } })

      await getAIConfig()

      expect(mockGet).toHaveBeenCalledWith('/ai/config')
    })

    it('returns AI config', async () => {
      const { getAIConfig } = await import('../ai')
      const config = { provider: 'openai', provider_name: null, api_base: 'https://api.openai.com/v1', model: 'gpt-4o', api_key: null, is_active: true, is_user_configured: false }

      mockGet.mockResolvedValue(config)

      const result = await getAIConfig()

      expect(result).toBe(config)
    })
  })

  describe('updateAIConfig', () => {
    it('calls api.put with /ai/config and data', async () => {
      const { updateAIConfig } = await import('../ai')
      const data = { provider: 'openai', api_base: 'https://api.openai.com/v1', model: 'gpt-4o' }

      mockPut.mockResolvedValue({ data: { ...data, is_active: true } })

      await updateAIConfig(data)

      expect(mockPut).toHaveBeenCalledWith('/ai/config', data)
    })

    it('returns updated config', async () => {
      const { updateAIConfig } = await import('../ai')
      const config = { provider: 'openai', provider_name: 'OpenAI', api_base: 'https://api.openai.com/v1', model: 'gpt-4o', api_key: 'sk-xxx', is_active: true, is_user_configured: true }

      mockPut.mockResolvedValue(config)

      const result = await updateAIConfig({ provider: 'openai' })

      expect(result).toBe(config)
    })
  })

  describe('testAIConfig', () => {
    it('calls api.post with /ai/config/test and data with timeout', async () => {
      const { testAIConfig } = await import('../ai')
      const data = { provider: 'openai', api_key: 'sk-xxx' }

      mockPost.mockResolvedValue({ data: { success: true, message: 'OK' } })

      await testAIConfig(data)

      expect(mockPost).toHaveBeenCalledWith('/ai/config/test', data, { timeout: 30000 })
    })

    it('calls api.post with empty object when no data provided', async () => {
      const { testAIConfig } = await import('../ai')

      mockPost.mockResolvedValue({ data: { success: true, message: 'OK' } })

      await testAIConfig()

      expect(mockPost).toHaveBeenCalledWith('/ai/config/test', {}, { timeout: 30000 })
    })

    it('returns test response', async () => {
      const { testAIConfig } = await import('../ai')
      const testResponse = { success: false, message: 'Invalid API key' }

      mockPost.mockResolvedValue(testResponse)

      const result = await testAIConfig({ provider: 'openai' })

      expect(result).toBe(testResponse)
    })
  })

  describe('resetAIConfig', () => {
    it('calls api.delete with /ai/config', async () => {
      const { resetAIConfig } = await import('../ai')

      mockDelete.mockResolvedValue({ data: { provider: 'zhipu', is_active: false } })

      await resetAIConfig()

      expect(mockDelete).toHaveBeenCalledWith('/ai/config')
    })

    it('returns reset config', async () => {
      const { resetAIConfig } = await import('../ai')
      const config = { provider: 'zhipu', provider_name: null, api_base: '', model: '', api_key: null, is_active: false, is_user_configured: false }

      mockDelete.mockResolvedValue(config)

      const result = await resetAIConfig()

      expect(result).toBe(config)
    })
  })

  describe('getConversations', () => {
    it('calls api.get with /ai/conversations', async () => {
      const { getConversations } = await import('../ai')

      mockGet.mockResolvedValue({ data: { data: [], total: 0 } })

      await getConversations()

      expect(mockGet).toHaveBeenCalledWith('/ai/conversations')
    })

    it('returns conversation list', async () => {
      const { getConversations } = await import('../ai')
      const list = { data: [{ id: '1', title: 'Chat 1', module: null, created_at: '', updated_at: '' }], total: 1 }

      mockGet.mockResolvedValue(list)

      const result = await getConversations()

      expect(result).toBe(list)
    })
  })

  describe('getConversationMessages', () => {
    it('calls api.get with /ai/conversations/{conversationId}', async () => {
      const { getConversationMessages } = await import('../ai')

      mockGet.mockResolvedValue({ data: { data: [] } })

      await getConversationMessages('conv-123')

      expect(mockGet).toHaveBeenCalledWith('/ai/conversations/conv-123')
    })

    it('returns message list', async () => {
      const { getConversationMessages } = await import('../ai')
      const messages = { data: [{ id: '1', conversation_id: 'conv-123', role: 'user', content: 'Hello', tool_calls: null, tool_call_id: null, module_tag: null, created_at: '' }] }

      mockGet.mockResolvedValue(messages)

      const result = await getConversationMessages('conv-123')

      expect(result).toBe(messages)
    })
  })

  describe('deleteConversation', () => {
    it('calls api.delete with /ai/conversations/{conversationId}', async () => {
      const { deleteConversation } = await import('../ai')

      mockDelete.mockResolvedValue(undefined)

      await deleteConversation('conv-123')

      expect(mockDelete).toHaveBeenCalledWith('/ai/conversations/conv-123')
    })
  })

  describe('renameConversation', () => {
    it('calls api.patch with /ai/conversations/{conversationId} and {title}', async () => {
      const { renameConversation } = await import('../ai')

      mockPatch.mockResolvedValue(undefined)

      await renameConversation('conv-123', 'New Title')

      expect(mockPatch).toHaveBeenCalledWith('/ai/conversations/conv-123', { title: 'New Title' })
    })
  })

  describe('sendChatMessage', () => {
    it('calls api.post with /ai/chat and data including stream:false', async () => {
      const { sendChatMessage } = await import('../ai')
      const data = { message: 'Hello', conversation_id: 'conv-1', module: 'course' }

      mockPost.mockResolvedValue({ data: { conversation_id: 'conv-1', message: 'Hi!', module_tag: null } })

      await sendChatMessage(data)

      expect(mockPost).toHaveBeenCalledWith('/ai/chat', { ...data, stream: false })
    })

    it('returns chat response', async () => {
      const { sendChatMessage } = await import('../ai')
      const chatResponse = { conversation_id: 'conv-1', message: 'Hi!', module_tag: 'course' }

      mockPost.mockResolvedValue(chatResponse)

      const result = await sendChatMessage({ message: 'Hello' })

      expect(result).toBe(chatResponse)
    })
  })

  describe('streamChatMessage', () => {
    it('streams content events', async () => {
      const { streamChatMessage } = await import('../ai')

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"content","content":"Hello"}\n\n') })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      const events = []
      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({ type: 'content', content: 'Hello' })
    })

    it('handles HTTP error', async () => {
      const { streamChatMessage } = await import('../ai')

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ detail: 'Server error' }),
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      const events = []
      for await (const event of generator) {
        events.push(event)
      }

      expect(events[0]).toEqual({ type: 'error', content: 'Server error' })
    })

    it('handles HTTP error without detail', async () => {
      const { streamChatMessage } = await import('../ai')

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('fail')),
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      const events = []
      for await (const event of generator) {
        events.push(event)
      }

      expect(events[0]).toEqual({ type: 'error', content: 'HTTP 500' })
    })

    it('handles missing reader', async () => {
      const { streamChatMessage } = await import('../ai')

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      const events = []
      for await (const event of generator) {
        events.push(event)
      }

      expect(events[0]).toEqual({ type: 'error', content: '无法读取响应流' })
    })

    it('skips malformed data lines', async () => {
      const { streamChatMessage } = await import('../ai')

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: invalid json\n\ndata: [DONE]\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      const events = []
      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(0)
    })

    it('respects abort signal', async () => {
      const { streamChatMessage } = await import('../ai')

      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true }),
        releaseLock: vi.fn(),
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      }) as any

      const controller = new AbortController()
      controller.abort()

      const generator = streamChatMessage({ message: 'hi' }, controller.signal)
      for await (const _event of generator) {
        // should not reach here or handle gracefully
      }

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      )
    })

    it('includes authorization header when token exists', async () => {
      const { streamChatMessage } = await import('../ai')

      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true }),
        releaseLock: vi.fn(),
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      for await (const _event of generator) {
        void _event
      }

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('handles tool_call event', async () => {
      const { streamChatMessage } = await import('../ai')

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"tool_call","tool_name":"search"}\n\ndata: [DONE]\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      }) as any

      const generator = streamChatMessage({ message: 'hi' })
      const events = []
      for await (const event of generator) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({ type: 'tool_call', tool_name: 'search' })
    })
  })

  describe('PROVIDER_DEFAULTS', () => {
    it('has expected provider keys', async () => {
      const { PROVIDER_DEFAULTS } = await import('../ai')

      expect(PROVIDER_DEFAULTS).toHaveProperty('zhipu')
      expect(PROVIDER_DEFAULTS).toHaveProperty('openai')
      expect(PROVIDER_DEFAULTS).toHaveProperty('deepseek')
      expect(PROVIDER_DEFAULTS).toHaveProperty('moonshot')
      expect(PROVIDER_DEFAULTS).toHaveProperty('qwen')
      expect(PROVIDER_DEFAULTS).toHaveProperty('custom')
    })

    it('each provider has api_base, models, and name', async () => {
      const { PROVIDER_DEFAULTS } = await import('../ai')

      for (const [_key, provider] of Object.entries(PROVIDER_DEFAULTS)) {
        expect(provider).toHaveProperty('api_base')
        expect(provider).toHaveProperty('models')
        expect(provider).toHaveProperty('name')
        expect(Array.isArray(provider.models)).toBe(true)
        expect(typeof provider.name).toBe('string')
        expect(typeof provider.api_base).toBe('string')
      }
    })
  })

  describe('MODULE_OPTIONS', () => {
    it('is an array of module options', async () => {
      const { MODULE_OPTIONS } = await import('../ai')

      expect(Array.isArray(MODULE_OPTIONS)).toBe(true)
      expect(MODULE_OPTIONS.length).toBeGreaterThan(0)
    })

    it('each option has key, label, and color', async () => {
      const { MODULE_OPTIONS } = await import('../ai')

      for (const option of MODULE_OPTIONS) {
        expect(option).toHaveProperty('key')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('color')
        expect(typeof option.key).toBe('string')
        expect(typeof option.label).toBe('string')
        expect(typeof option.color).toBe('string')
      }
    })
  })
})

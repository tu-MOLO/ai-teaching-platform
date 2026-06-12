import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const mockNavigate = vi.fn()
const mockLoadConversations = vi.fn()
const mockLoadAIConfig = vi.fn()
const mockSelectConversation = vi.fn()
const mockAddMessage = vi.fn()
const mockUpdateLastAssistantMessage = vi.fn()
const mockSetStreaming = vi.fn()
const mockSetCurrentConversationId = vi.fn()
const mockRenameConversation = vi.fn()

const createMockStore = (overrides: any = {}) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  aiConfig: { api_key: 'test-key', provider: 'zhipu', model: 'glm-4' },
  configLoaded: true,
  loadConversations: mockLoadConversations,
  selectConversation: mockSelectConversation,
  addMessage: mockAddMessage,
  updateLastAssistantMessage: mockUpdateLastAssistantMessage,
  setStreaming: mockSetStreaming,
  setCurrentConversationId: mockSetCurrentConversationId,
  loadAIConfig: mockLoadAIConfig,
  renameConversation: mockRenameConversation,
  ...overrides,
})

let mockStore = createMockStore()

vi.mock('../../../stores/ai', () => ({
  useAIStore: () => mockStore,
}))

const mockStreamChatMessage = vi.fn()
const mockDeleteConversationApi = vi.fn()

vi.mock('../../../services/ai', () => ({
  streamChatMessage: (...args: any[]) => mockStreamChatMessage(...args),
  deleteConversation: (...args: any[]) => mockDeleteConversationApi(...args),
  MODULE_OPTIONS: [],
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    MenuFoldOutlined: icon('MenuFoldOutlined'),
    MenuUnfoldOutlined: icon('MenuUnfoldOutlined'),
  }
})

vi.mock('../../../components/AIAssistant/ChatMessage', () => ({
  default: ({ message }: any) => React.createElement('div', { 'data-testid': 'chat-message' }, message.content),
}))

vi.mock('../../../components/AIAssistant/ChatInput', () => ({
  default: ({ onSend, disabled }: any) =>
    React.createElement('div', { 'data-testid': 'chat-input' },
      React.createElement('button', {
        'data-testid': 'chat-send-btn',
        disabled,
        onClick: () => onSend('hello'),
      }, 'Send')
    ),
}))

vi.mock('../../../components/AIAssistant/ConversationList', () => ({
  default: ({ onNew, onDelete, onSelect }: any) =>
    React.createElement('div', { 'data-testid': 'conversation-list' },
      React.createElement('button', { 'data-testid': 'new-conv-btn', onClick: onNew }, 'New'),
      React.createElement('button', { 'data-testid': 'delete-conv-btn', onClick: () => onDelete('c1') }, 'Delete'),
      React.createElement('button', { 'data-testid': 'select-conv-btn', onClick: () => onSelect('c1') }, 'Select')
    ),
}))

const AIAssistant = (await import('../index')).default

describe('AIAssistant page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = createMockStore()
  })

  it('should render AI assistant page', () => {
    render(React.createElement(AIAssistant))
    expect(screen.getByText('对话列表')).toBeInTheDocument()
  })

  it('should display chat interface shell', () => {
    render(React.createElement(AIAssistant))
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument()
  })

  it('should render with messages', () => {
    mockStore = createMockStore({
      conversations: [{ id: 'c1', title: '对话1' }],
      currentConversationId: 'c1',
      messages: [{ id: 'm1', role: 'user', content: '你好' }],
    })
    render(React.createElement(AIAssistant))
    expect(screen.getByText('对话列表')).toBeInTheDocument()
    expect(screen.getByTestId('chat-message')).toBeInTheDocument()
  })

  it('should show loading when config not loaded', () => {
    mockStore = createMockStore({ configLoaded: false })
    render(React.createElement(AIAssistant))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })

  it('should show no config prompt when no api key', () => {
    mockStore = createMockStore({ aiConfig: { api_key: '' } })
    render(React.createElement(AIAssistant))
    expect(screen.getByText('请先配置 API 密钥以启用 AI 助手功能')).toBeInTheDocument()
    fireEvent.click(screen.getByText('前往设置'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings?tab=ai')
  })

  it('should toggle sidebar collapse', () => {
    render(React.createElement(AIAssistant))
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument()
    const toggleBtn = screen.getByTestId('btn-undefined')
    fireEvent.click(toggleBtn)
    expect(screen.queryByTestId('conversation-list')).not.toBeInTheDocument()
    fireEvent.click(toggleBtn)
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument()
  })

  it('should handle new conversation', () => {
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('new-conv-btn'))
    expect(mockSelectConversation).toHaveBeenCalledWith(null)
  })

  it('should handle delete conversation', async () => {
    mockStore = createMockStore({ currentConversationId: 'c1' })
    mockDeleteConversationApi.mockResolvedValue(undefined)
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('delete-conv-btn'))
    await waitFor(() => expect(mockDeleteConversationApi).toHaveBeenCalledWith('c1'))
    expect(mockSelectConversation).toHaveBeenCalledWith(null)
  })

  it('should handle send message with stream content', async () => {
    async function* mockStream() {
      yield { type: 'content', content: 'Hello' }
      yield { type: 'done', conversation_id: 'new-conv' }
    }
    mockStreamChatMessage.mockReturnValue(mockStream())
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('chat-send-btn'))
    await waitFor(() => expect(mockSetStreaming).toHaveBeenCalledWith(true))
    await waitFor(() => expect(mockSetStreaming).toHaveBeenCalledWith(false))
    expect(mockLoadConversations).toHaveBeenCalled()
  })

  it('should handle stream error event', async () => {
    async function* mockStream() {
      yield { type: 'error', content: 'Something went wrong' }
    }
    mockStreamChatMessage.mockReturnValue(mockStream())
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('chat-send-btn'))
    await waitFor(() => expect(mockUpdateLastAssistantMessage).toHaveBeenCalledWith(expect.stringContaining('⚠️')))
  })

  it('should handle stream exception (non-abort)', async () => {
    // eslint-disable-next-line require-yield
    async function* mockStream() {
      throw new Error('Network error')
    }
    mockStreamChatMessage.mockReturnValue(mockStream())
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('chat-send-btn'))
    await waitFor(() => expect(mockUpdateLastAssistantMessage).toHaveBeenCalledWith(expect.stringContaining('请求失败')))
  })

  it('should handle abort error silently', async () => {
    const abortError = new Error('AbortError')
    abortError.name = 'AbortError'
    // eslint-disable-next-line require-yield
    async function* mockStream() {
      throw abortError
    }
    mockStreamChatMessage.mockReturnValue(mockStream())
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('chat-send-btn'))
    await waitFor(() => expect(mockSetStreaming).toHaveBeenCalledWith(false))
  })

  it('should abort previous request on new send', async () => {
    const abortMock = vi.fn()
    class MockAbortController {
      abort = abortMock
      signal = { aborted: false } as any
    }
    globalThis.AbortController = MockAbortController as any

    async function* mockStream() {
      yield { type: 'content', content: 'Hello' }
    }
    mockStreamChatMessage.mockReturnValue(mockStream())
    render(React.createElement(AIAssistant))
    fireEvent.click(screen.getByTestId('chat-send-btn'))
    await waitFor(() => expect(mockStreamChatMessage).toHaveBeenCalled())
  })
})

import { create } from 'zustand'
import {
  getConversations,
  getConversationMessages,
  getAIConfig,
  renameConversation as renameConversationApi,
  archiveConversation as archiveConversationApi,
  batchDeleteConversations as batchDeleteConversationsApi,
  deleteConversation as deleteConversationApi,
  type Conversation,
  type Message,
  type AIConfigResponse,
} from '../services/ai'

interface AIState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  isLoading: boolean
  listLoading: boolean
  isStreaming: boolean
  aiConfig: AIConfigResponse | null
  configLoaded: boolean
  showArchived: boolean

  loadConversations: () => Promise<void>
  selectConversation: (id: string | null) => Promise<void>
  addMessage: (message: Message) => void
  updateLastAssistantMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setCurrentConversationId: (id: string | null) => void
  loadAIConfig: () => Promise<void>
  renameConversation: (id: string, title: string) => Promise<boolean>
  archiveConversation: (id: string, archived: boolean) => Promise<boolean>
  deleteConversation: (id: string) => Promise<boolean>
  batchDeleteConversations: (ids: string[]) => Promise<boolean>
  toggleShowArchived: () => void
  reset: () => void
}

export const useAIStore = create<AIState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  listLoading: false,
  isStreaming: false,
  aiConfig: null,
  configLoaded: false,
  showArchived: false,

  loadConversations: async () => {
    set({ listLoading: true })
    try {
      const { showArchived } = get()
      const response = await getConversations(showArchived)
      set({ conversations: response?.data || [], listLoading: false })
    } catch {
      set({ listLoading: false })
    }
  },

  selectConversation: async (id: string | null) => {
    set({ currentConversationId: id, messages: [], isLoading: true })
    if (id) {
      try {
        const response = await getConversationMessages(id)
        set({ messages: response.data || [], isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },

  updateLastAssistantMessage: (content: string) => {
    set((state) => {
      const messages = [...state.messages]
      const lastIdx = messages.length - 1
      if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content }
      }
      return { messages }
    })
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
  setCurrentConversationId: (id: string | null) => set({ currentConversationId: id }),

  loadAIConfig: async () => {
    try {
      const config = await getAIConfig()
      set({ aiConfig: config, configLoaded: true })
    } catch {
      set({ configLoaded: true })
    }
  },

  renameConversation: async (id: string, title: string) => {
    try {
      await renameConversationApi(id, title)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      }))
      return true
    } catch {
      return false
    }
  },

  archiveConversation: async (id: string, archived: boolean) => {
    const { loadConversations, currentConversationId } = get()
    try {
      await archiveConversationApi(id, archived)
      await loadConversations()
      // 归档会把会话移出"全部对话"列表，此时清空选中态，避免主区停在一个列表里已不存在的会话上；
      // 取消归档只是把它放回主列表，用户多半还想继续看，因此保留当前选中。
      const stillVisible = get().conversations.some((c) => c.id === id)
      if (archived && currentConversationId === id && !stillVisible) {
        set({ currentConversationId: null, messages: [] })
      }
      return true
    } catch {
      return false
    }
  },

  deleteConversation: async (id: string) => {
    const { loadConversations, currentConversationId } = get()
    try {
      await deleteConversationApi(id)
      await loadConversations()
      if (currentConversationId === id) {
        set({ currentConversationId: null, messages: [] })
      }
      return true
    } catch {
      return false
    }
  },

  batchDeleteConversations: async (ids: string[]) => {
    if (ids.length === 0) return false
    const { loadConversations, currentConversationId } = get()
    try {
      await batchDeleteConversationsApi(ids)
      await loadConversations()
      if (currentConversationId && ids.includes(currentConversationId)) {
        set({ currentConversationId: null, messages: [] })
      }
      return true
    } catch {
      return false
    }
  },

  toggleShowArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }))
    get().loadConversations()
  },

  reset: () => {
    set({
      conversations: [],
      currentConversationId: null,
      messages: [],
      isLoading: false,
      listLoading: false,
      isStreaming: false,
      showArchived: false,
    })
  },
}))

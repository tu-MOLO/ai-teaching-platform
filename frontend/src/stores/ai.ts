import { create } from 'zustand'
import {
  getConversations,
  getConversationMessages,
  getAIConfig,
  renameConversation as renameConversationApi,
  archiveConversation as archiveConversationApi,
  batchDeleteConversations as batchDeleteConversationsApi,
  type Conversation,
  type Message,
  type AIConfigResponse,
} from '../services/ai'

interface AIState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  isLoading: boolean
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
  renameConversation: (id: string, title: string) => Promise<void>
  archiveConversation: (id: string, archived: boolean) => Promise<void>
  batchDeleteConversations: (ids: string[]) => Promise<void>
  toggleShowArchived: () => void
  reset: () => void
}

export const useAIStore = create<AIState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  aiConfig: null,
  configLoaded: false,
  showArchived: false,

  loadConversations: async () => {
    try {
      const { showArchived } = get()
      const response = await getConversations(showArchived)
      set({ conversations: response.data || [] })
    } catch {
      // ignore
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
    } catch {
      // ignore
    }
  },

  archiveConversation: async (id: string, archived: boolean) => {
    try {
      await archiveConversationApi(id, archived)
      const { showArchived, loadConversations } = get()
      await loadConversations()
      // 如果当前会话被归档且不在归档视图，清空当前会话
      if (!showArchived && archived) {
        const { currentConversationId } = get()
        if (currentConversationId === id) {
          set({ currentConversationId: null, messages: [] })
        }
      }
    } catch {
      // ignore
    }
  },

  batchDeleteConversations: async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      await batchDeleteConversationsApi(ids)
      const { currentConversationId, loadConversations } = get()
      await loadConversations()
      if (currentConversationId && ids.includes(currentConversationId)) {
        set({ currentConversationId: null, messages: [] })
      }
    } catch {
      // ignore
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
      isStreaming: false,
      showArchived: false,
    })
  },
}))

import { create } from 'zustand'
import {
  getConversations,
  getConversationMessages,
  getAIConfig,
  renameConversation as renameConversationApi,
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

  loadConversations: () => Promise<void>
  selectConversation: (id: string | null) => Promise<void>
  addMessage: (message: Message) => void
  updateLastAssistantMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setCurrentConversationId: (id: string | null) => void
  loadAIConfig: () => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  reset: () => void
}

export const useAIStore = create<AIState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  aiConfig: null,
  configLoaded: false,

  loadConversations: async () => {
    try {
      const response = await getConversations()
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

  reset: () => {
    set({
      conversations: [],
      currentConversationId: null,
      messages: [],
      isLoading: false,
      isStreaming: false,
    })
  },
}))

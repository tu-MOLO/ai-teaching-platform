/**
 * 主题状态管理 Store
 * 支持主题切换、自定义配色、撤销/重做、本地持久化
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  type ThemeColors,
  defaultThemeColors,
  presetThemes,
  getPresetThemeById,
} from '../constants/themes'
import { setCssVariables } from '../utils/color'

// Storage Keys
const THEME_STORAGE_KEY = 'ai-teaching-platform-theme'
const CUSTOM_THEMES_KEY = 'ai-teaching-platform-custom-themes'

// 最大历史记录数
const MAX_HISTORY_LENGTH = 20

// 自定义主题方案
export interface CustomTheme {
  id: string
  name: string
  colors: ThemeColors
  createdAt: string
}

// 历史记录条目
interface HistoryEntry {
  colors: ThemeColors
  timestamp: number
}

// 主题状态接口
interface ThemeState {
  // 当前状态
  currentThemeId: string // 'warm' | 'ocean' | 'macaron' | 'spring' | 'custom'
  currentColors: ThemeColors
  isCustom: boolean

  // 历史记录
  history: HistoryEntry[]
  historyIndex: number

  // 自定义方案列表
  customThemes: CustomTheme[]

  // Actions
  setThemeByPreset: (presetId: string) => void
  updateColor: (variableName: keyof ThemeColors, value: string) => void
  updateColors: (colors: Partial<ThemeColors>) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  resetToDefault: () => void
  saveCustomTheme: (name: string) => void
  deleteCustomTheme: (id: string) => void
  loadCustomTheme: (id: string) => void
  applyThemeToDom: () => void
}

// 从 localStorage 读取自定义方案
const loadCustomThemes = (): CustomTheme[] => {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(CUSTOM_THEMES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// 保存自定义方案到 localStorage
const saveCustomThemes = (themes: CustomTheme[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
  } catch (error) {
    console.error('Failed to save custom themes:', error)
  }
}

// 创建初始历史记录
const createInitialHistory = (colors: ThemeColors): HistoryEntry[] => [
  {
    colors: { ...colors },
    timestamp: Date.now(),
  },
]

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentThemeId: 'warm',
      currentColors: { ...defaultThemeColors },
      isCustom: false,
      history: createInitialHistory(defaultThemeColors),
      historyIndex: 0,
      customThemes: loadCustomThemes(),

      // 应用预设主题
      setThemeByPreset: (presetId: string) => {
        const preset = getPresetThemeById(presetId)
        if (!preset) return

        const newColors = { ...preset.colors }
        const newHistory = createInitialHistory(newColors)

        set({
          currentThemeId: presetId,
          currentColors: newColors,
          isCustom: false,
          history: newHistory,
          historyIndex: 0,
        })

        // 应用到 DOM
        setCssVariables(newColors as Record<string, string>)
      },

      // 更新单个颜色
      updateColor: (variableName: keyof ThemeColors, value: string) => {
        const state = get()
        const newColors = { ...state.currentColors, [variableName]: value }

        // 添加到历史记录
        const newEntry: HistoryEntry = {
          colors: { ...newColors },
          timestamp: Date.now(),
        }

        // 截取当前索引之后的历史，添加新记录
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        newHistory.push(newEntry)

        // 限制历史记录长度
        if (newHistory.length > MAX_HISTORY_LENGTH) {
          newHistory.shift()
        }

        set({
          currentThemeId: 'custom',
          currentColors: newColors,
          isCustom: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })

        // 应用到 DOM
        setCssVariables({ [variableName]: value })
      },

      // 批量更新颜色
      updateColors: (colors: Partial<ThemeColors>) => {
        const state = get()
        const newColors = { ...state.currentColors, ...colors }

        const newEntry: HistoryEntry = {
          colors: { ...newColors },
          timestamp: Date.now(),
        }

        const newHistory = state.history.slice(0, state.historyIndex + 1)
        newHistory.push(newEntry)

        if (newHistory.length > MAX_HISTORY_LENGTH) {
          newHistory.shift()
        }

        set({
          currentThemeId: 'custom',
          currentColors: newColors,
          isCustom: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })

        setCssVariables(colors as Record<string, string>)
      },

      // 撤销
      undo: () => {
        const state = get()
        if (state.historyIndex <= 0) return

        const newIndex = state.historyIndex - 1
        const previousColors = state.history[newIndex].colors

        set({
          currentColors: previousColors,
          historyIndex: newIndex,
          isCustom: true,
          currentThemeId: 'custom',
        })

        setCssVariables(previousColors as unknown as Record<string, string>)
      },

      // 重做
      redo: () => {
        const state = get()
        if (state.historyIndex >= state.history.length - 1) return

        const newIndex = state.historyIndex + 1
        const nextColors = state.history[newIndex].colors

        set({
          currentColors: nextColors,
          historyIndex: newIndex,
          isCustom: true,
          currentThemeId: 'custom',
        })

        setCssVariables(nextColors as unknown as Record<string, string>)
      },

      // 是否可以撤销
      canUndo: () => {
        const state = get()
        return state.historyIndex > 0
      },

      // 是否可以重做
      canRedo: () => {
        const state = get()
        return state.historyIndex < state.history.length - 1
      },

      // 重置为默认
      resetToDefault: () => {
        const defaultTheme = presetThemes[0]
        const newHistory = createInitialHistory(defaultTheme.colors)

        set({
          currentThemeId: defaultTheme.id,
          currentColors: { ...defaultTheme.colors },
          isCustom: false,
          history: newHistory,
          historyIndex: 0,
        })

        setCssVariables(defaultTheme.colors as unknown as Record<string, string>)
      },

      // 保存自定义方案
      saveCustomTheme: (name: string) => {
        const state = get()
        const newTheme: CustomTheme = {
          id: `custom-${Date.now()}`,
          name: name.trim() || '自定义方案',
          colors: { ...state.currentColors },
          createdAt: new Date().toISOString(),
        }

        const updatedThemes = [...state.customThemes, newTheme]

        // 限制最多10个自定义方案
        if (updatedThemes.length > 10) {
          updatedThemes.shift()
        }

        set({ customThemes: updatedThemes })
        saveCustomThemes(updatedThemes)
      },

      // 删除自定义方案
      deleteCustomTheme: (id: string) => {
        const state = get()
        const updatedThemes = state.customThemes.filter((t) => t.id !== id)
        set({ customThemes: updatedThemes })
        saveCustomThemes(updatedThemes)
      },

      // 加载自定义方案
      loadCustomTheme: (id: string) => {
        const state = get()
        const theme = state.customThemes.find((t) => t.id === id)
        if (!theme) return

        const newHistory = createInitialHistory(theme.colors)

        set({
          currentThemeId: 'custom',
          currentColors: { ...theme.colors },
          isCustom: true,
          history: newHistory,
          historyIndex: 0,
        })

        setCssVariables(theme.colors as unknown as Record<string, string>)
      },

      // 应用主题到 DOM
      applyThemeToDom: () => {
        const state = get()
        setCssVariables(state.currentColors as unknown as Record<string, string>)
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 只持久化必要的状态
      partialize: (state) => ({
        currentThemeId: state.currentThemeId,
        currentColors: state.currentColors,
        isCustom: state.isCustom,
        // 不持久化历史记录，只保存当前状态
      }),
    }
  )
)

// 初始化主题 - 在应用启动时调用
export const initTheme = () => {
  const store = useThemeStore.getState()
  store.applyThemeToDom()
}

// 订阅主题变化（用于调试或其他副作用）
export const subscribeToThemeChanges = (callback: (state: ThemeState) => void) => {
  return useThemeStore.subscribe(callback)
}

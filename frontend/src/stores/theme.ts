import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  defaultThemeColors,
  getPresetThemeById,
  presetThemes,
  type ThemeColors,
} from '../constants/themes'
import { setCssVariables } from '../utils/color'

const THEME_STORAGE_KEY = 'ai-teaching-platform-theme'
const CUSTOM_THEMES_KEY = 'ai-teaching-platform-custom-themes'
const MAX_HISTORY_LENGTH = 20
const MAX_CUSTOM_THEMES = 10

export interface CustomTheme {
  id: string
  name: string
  colors: ThemeColors
  createdAt: string
}

interface HistoryEntry {
  colors: ThemeColors
  timestamp: number
}

interface ThemeState {
  currentThemeId: string
  currentColors: ThemeColors
  isCustom: boolean
  history: HistoryEntry[]
  historyIndex: number
  customThemes: CustomTheme[]
  setThemeByPreset: (presetId: string) => void
  updateColor: (variableName: keyof ThemeColors, value: string) => void
  updateColors: (colors: Partial<ThemeColors>) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  resetToDefault: () => void
  saveCustomTheme: (name: string) => void
  renameCustomTheme: (id: string, name: string) => void
  deleteCustomTheme: (id: string) => void
  loadCustomTheme: (id: string) => void
  applyThemeToDom: () => void
}

const createInitialHistory = (colors: ThemeColors): HistoryEntry[] => [
  {
    colors: { ...colors },
    timestamp: Date.now(),
  },
]

const loadCustomThemes = (): CustomTheme[] => {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(CUSTOM_THEMES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const saveCustomThemes = (themes: CustomTheme[]) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
  } catch (error) {
    console.error('Failed to save custom themes:', error)
  }
}

const pushHistory = (
  history: HistoryEntry[],
  historyIndex: number,
  colors: ThemeColors
): { nextHistory: HistoryEntry[]; nextIndex: number } => {
  const nextHistory = history.slice(0, historyIndex + 1)
  nextHistory.push({
    colors: { ...colors },
    timestamp: Date.now(),
  })

  if (nextHistory.length > MAX_HISTORY_LENGTH) {
    nextHistory.shift()
  }

  return {
    nextHistory,
    nextIndex: nextHistory.length - 1,
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentThemeId: 'warm',
      currentColors: { ...defaultThemeColors },
      isCustom: false,
      history: createInitialHistory(defaultThemeColors),
      historyIndex: 0,
      customThemes: loadCustomThemes(),

      setThemeByPreset: (presetId: string) => {
        const preset = getPresetThemeById(presetId)
        if (!preset) return

        const newColors = { ...preset.colors }
        set({
          currentThemeId: presetId,
          currentColors: newColors,
          isCustom: false,
          history: createInitialHistory(newColors),
          historyIndex: 0,
        })

        setCssVariables(newColors as Record<string, string>)
      },

      updateColor: (variableName: keyof ThemeColors, value: string) => {
        const state = get()
        const newColors = { ...state.currentColors, [variableName]: value }
        const { nextHistory, nextIndex } = pushHistory(
          state.history,
          state.historyIndex,
          newColors
        )

        set({
          currentThemeId: 'custom',
          currentColors: newColors,
          isCustom: true,
          history: nextHistory,
          historyIndex: nextIndex,
        })

        setCssVariables({ [variableName]: value })
      },

      updateColors: (colors: Partial<ThemeColors>) => {
        const state = get()
        const newColors = { ...state.currentColors, ...colors }
        const { nextHistory, nextIndex } = pushHistory(
          state.history,
          state.historyIndex,
          newColors
        )

        set({
          currentThemeId: 'custom',
          currentColors: newColors,
          isCustom: true,
          history: nextHistory,
          historyIndex: nextIndex,
        })

        setCssVariables(colors as Record<string, string>)
      },

      undo: () => {
        const state = get()
        if (state.historyIndex <= 0) return

        const nextIndex = state.historyIndex - 1
        const previousColors = state.history[nextIndex].colors

        set({
          currentColors: previousColors,
          historyIndex: nextIndex,
          isCustom: true,
          currentThemeId: 'custom',
        })

        setCssVariables(previousColors as unknown as Record<string, string>)
      },

      redo: () => {
        const state = get()
        if (state.historyIndex >= state.history.length - 1) return

        const nextIndex = state.historyIndex + 1
        const nextColors = state.history[nextIndex].colors

        set({
          currentColors: nextColors,
          historyIndex: nextIndex,
          isCustom: true,
          currentThemeId: 'custom',
        })

        setCssVariables(nextColors as unknown as Record<string, string>)
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      resetToDefault: () => {
        const defaultTheme = presetThemes[0]
        const newColors = { ...defaultTheme.colors }

        set({
          currentThemeId: defaultTheme.id,
          currentColors: newColors,
          isCustom: false,
          history: createInitialHistory(newColors),
          historyIndex: 0,
        })

        setCssVariables(newColors as Record<string, string>)
      },

      saveCustomTheme: (name: string) => {
        const state = get()
        const newTheme: CustomTheme = {
          id: `custom-${Date.now()}`,
          name: name.trim() || '自定义方案',
          colors: { ...state.currentColors },
          createdAt: new Date().toISOString(),
        }

        const updatedThemes = [...state.customThemes, newTheme].slice(-MAX_CUSTOM_THEMES)
        set({ customThemes: updatedThemes })
        saveCustomThemes(updatedThemes)
      },

      renameCustomTheme: (id: string, name: string) => {
        const trimmedName = name.trim()
        if (!trimmedName) return

        const state = get()
        const updatedThemes = state.customThemes.map((theme) =>
          theme.id === id ? { ...theme, name: trimmedName } : theme
        )

        set({ customThemes: updatedThemes })
        saveCustomThemes(updatedThemes)
      },

      deleteCustomTheme: (id: string) => {
        const state = get()
        const updatedThemes = state.customThemes.filter((theme) => theme.id !== id)
        set({ customThemes: updatedThemes })
        saveCustomThemes(updatedThemes)
      },

      loadCustomTheme: (id: string) => {
        const state = get()
        const theme = state.customThemes.find((item) => item.id === id)
        if (!theme) return

        set({
          currentThemeId: 'custom',
          currentColors: { ...theme.colors },
          isCustom: true,
          history: createInitialHistory(theme.colors),
          historyIndex: 0,
        })

        setCssVariables(theme.colors as unknown as Record<string, string>)
      },

      applyThemeToDom: () => {
        const state = get()
        setCssVariables(state.currentColors as unknown as Record<string, string>)
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentThemeId: state.currentThemeId,
        currentColors: state.currentColors,
        isCustom: state.isCustom,
      }),
    }
  )
)

export const initTheme = () => {
  useThemeStore.getState().applyThemeToDom()
}

export const subscribeToThemeChanges = (callback: (state: ThemeState) => void) => {
  return useThemeStore.subscribe(callback)
}

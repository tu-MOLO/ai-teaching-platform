import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useThemeStore } from '../theme'
import { defaultThemeColors } from '../../constants/themes'

vi.mock('../../utils/color', () => ({
  setCssVariables: vi.fn(),
}))

import { setCssVariables } from '../../utils/color'

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      currentThemeId: 'blue',
      currentColors: { ...defaultThemeColors },
      isCustom: false,
      history: [{ colors: { ...defaultThemeColors }, timestamp: Date.now() }],
      historyIndex: 0,
      customThemes: [],
    })
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should have blue as default theme id', () => {
      expect(useThemeStore.getState().currentThemeId).toBe('blue')
    })

    it('should have default colors', () => {
      const state = useThemeStore.getState()
      expect(state.currentColors['--color-primary']).toBe('#548CA8')
    })

    it('should not be custom theme', () => {
      expect(useThemeStore.getState().isCustom).toBe(false)
    })

    it('should have history index at 0', () => {
      expect(useThemeStore.getState().historyIndex).toBe(0)
    })

    it('should have empty custom themes', () => {
      expect(useThemeStore.getState().customThemes).toEqual([])
    })
  })

  describe('setThemeByPreset', () => {
    it('should switch to morandi theme', () => {
      useThemeStore.getState().setThemeByPreset('morandi')

      const state = useThemeStore.getState()
      expect(state.currentThemeId).toBe('morandi')
      expect(state.isCustom).toBe(false)
      expect(state.currentColors['--color-primary']).toBe('#657166')
    })

    it('should switch to neutral theme', () => {
      useThemeStore.getState().setThemeByPreset('neutral')

      const state = useThemeStore.getState()
      expect(state.currentThemeId).toBe('neutral')
      expect(state.currentColors['--color-primary']).toBe('#4A5C6A')
    })

    it('should switch to violet theme', () => {
      useThemeStore.getState().setThemeByPreset('violet')

      const state = useThemeStore.getState()
      expect(state.currentThemeId).toBe('violet')
      expect(state.currentColors['--color-primary']).toBe('#3F5BBD')
    })

    it('should not change state for invalid preset id', () => {
      useThemeStore.getState().setThemeByPreset('nonexistent')

      expect(useThemeStore.getState().currentThemeId).toBe('blue')
    })

    it('should reset history when switching preset', () => {
      useThemeStore.getState().setThemeByPreset('morandi')

      const state = useThemeStore.getState()
      expect(state.history.length).toBe(1)
      expect(state.historyIndex).toBe(0)
    })

    it('should call setCssVariables', () => {
      useThemeStore.getState().setThemeByPreset('morandi')

      expect(setCssVariables).toHaveBeenCalled()
    })
  })

  describe('updateColor', () => {
    it('should update a single color', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')

      expect(useThemeStore.getState().currentColors['--color-primary']).toBe('#ff0000')
    })

    it('should mark theme as custom', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')

      expect(useThemeStore.getState().isCustom).toBe(true)
      expect(useThemeStore.getState().currentThemeId).toBe('custom')
    })

    it('should add to history', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')

      const state = useThemeStore.getState()
      expect(state.history.length).toBe(2)
      expect(state.historyIndex).toBe(1)
    })
  })

  describe('updateColors', () => {
    it('should update multiple colors', () => {
      useThemeStore.getState().updateColors({
        '--color-primary': '#ff0000',
        '--color-error': '#00ff00',
      })

      const state = useThemeStore.getState()
      expect(state.currentColors['--color-primary']).toBe('#ff0000')
      expect(state.currentColors['--color-error']).toBe('#00ff00')
    })

    it('should mark theme as custom', () => {
      useThemeStore.getState().updateColors({ '--color-primary': '#ff0000' })

      expect(useThemeStore.getState().isCustom).toBe(true)
    })
  })

  describe('undo/redo', () => {
    it('should undo color change', () => {
      const originalPrimary = useThemeStore.getState().currentColors['--color-primary']

      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().undo()

      expect(useThemeStore.getState().currentColors['--color-primary']).toBe(originalPrimary)
    })

    it('should redo undone color change', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().undo()
      useThemeStore.getState().redo()

      expect(useThemeStore.getState().currentColors['--color-primary']).toBe('#ff0000')
    })

    it('canUndo should return false when no history', () => {
      expect(useThemeStore.getState().canUndo()).toBe(false)
    })

    it('canUndo should return true after change', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')

      expect(useThemeStore.getState().canUndo()).toBe(true)
    })

    it('canRedo should return false when no undone changes', () => {
      expect(useThemeStore.getState().canRedo()).toBe(false)
    })

    it('canRedo should return true after undo', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().undo()

      expect(useThemeStore.getState().canRedo()).toBe(true)
    })
  })

  describe('resetToDefault', () => {
    it('should reset to first preset theme', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().resetToDefault()

      const state = useThemeStore.getState()
      expect(state.currentThemeId).toBe('blue')
      expect(state.isCustom).toBe(false)
      expect(state.currentColors['--color-primary']).toBe('#548CA8')
    })
  })

  describe('custom themes', () => {
    it('should save a custom theme', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().saveCustomTheme('My Theme')

      const state = useThemeStore.getState()
      expect(state.customThemes.length).toBe(1)
      expect(state.customThemes[0].name).toBe('My Theme')
      expect(state.customThemes[0].colors['--color-primary']).toBe('#ff0000')
    })

    it('should delete a custom theme', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().saveCustomTheme('My Theme')

      const themeId = useThemeStore.getState().customThemes[0].id
      useThemeStore.getState().deleteCustomTheme(themeId)

      expect(useThemeStore.getState().customThemes.length).toBe(0)
    })

    it('should rename a custom theme', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().saveCustomTheme('Old Name')

      const themeId = useThemeStore.getState().customThemes[0].id
      useThemeStore.getState().renameCustomTheme(themeId, 'New Name')

      expect(useThemeStore.getState().customThemes[0].name).toBe('New Name')
    })

    it('should not rename with empty name', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().saveCustomTheme('Old Name')

      const themeId = useThemeStore.getState().customThemes[0].id
      useThemeStore.getState().renameCustomTheme(themeId, '   ')

      expect(useThemeStore.getState().customThemes[0].name).toBe('Old Name')
    })

    it('should load a custom theme', () => {
      useThemeStore.getState().updateColor('--color-primary', '#ff0000')
      useThemeStore.getState().saveCustomTheme('My Theme')

      useThemeStore.getState().setThemeByPreset('blue')
      const themeId = useThemeStore.getState().customThemes[0].id
      useThemeStore.getState().loadCustomTheme(themeId)

      const state = useThemeStore.getState()
      expect(state.currentColors['--color-primary']).toBe('#ff0000')
      expect(state.isCustom).toBe(true)
      expect(state.currentThemeId).toBe('custom')
    })
  })

  describe('applyThemeToDom', () => {
    it('should call setCssVariables with current colors', () => {
      useThemeStore.getState().applyThemeToDom()

      expect(setCssVariables).toHaveBeenCalled()
    })
  })
})

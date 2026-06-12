import { describe, it, expect, vi, beforeEach } from 'vitest'

const STORAGE_KEY = 'ai-teaching-platform-basic-settings'

describe('localSettings service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  describe('getBasicSettings', () => {
    it('returns default settings when localStorage is empty', async () => {
      const { localSettingsService } = await import('../localSettings')

      const result = localSettingsService.getBasicSettings()

      expect(result).toEqual({
        schoolName: '',
        contactEmail: '',
        contactPhone: '',
      })
    })

    it('returns saved settings from localStorage', async () => {
      const savedSettings = { schoolName: 'My School', contactEmail: 'admin@school.com', contactPhone: '123456789' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings))

      const { localSettingsService } = await import('../localSettings')

      const result = localSettingsService.getBasicSettings()

      expect(result).toEqual(savedSettings)
    })

    it('returns partial saved settings with defaults for missing fields', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schoolName: 'Partial School' }))

      const { localSettingsService } = await import('../localSettings')

      const result = localSettingsService.getBasicSettings()

      expect(result).toEqual({
        schoolName: 'Partial School',
        contactEmail: '',
        contactPhone: '',
      })
    })

    it('handles corrupt JSON gracefully by returning defaults', async () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json')

      const { localSettingsService } = await import('../localSettings')

      const result = localSettingsService.getBasicSettings()

      expect(result).toEqual({
        schoolName: '',
        contactEmail: '',
        contactPhone: '',
      })
    })

    it('returns defaults when window is undefined (SSR safety)', async () => {
      const originalWindow = globalThis.window
      // @ts-expect-error testing SSR scenario
      delete globalThis.window

      // Need to re-import after removing window since module caches
      vi.resetModules()

      const { localSettingsService } = await import('../localSettings')

      const result = localSettingsService.getBasicSettings()

      expect(result).toEqual({
        schoolName: '',
        contactEmail: '',
        contactPhone: '',
      })

      globalThis.window = originalWindow
    })
  })

  describe('saveBasicSettings', () => {
    it('saves to localStorage', async () => {
      const { localSettingsService } = await import('../localSettings')
      const values = { schoolName: 'New School', contactEmail: 'email@school.com', contactPhone: '111111' }

      localSettingsService.saveBasicSettings(values)

      const stored = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(stored!)).toEqual(values)
    })

    it('overwrites existing settings', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schoolName: 'Old School', contactEmail: 'old@school.com', contactPhone: '000' }))

      const { localSettingsService } = await import('../localSettings')

      localSettingsService.saveBasicSettings({ schoolName: 'Updated School', contactEmail: 'new@school.com', contactPhone: '999' })

      const stored = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(stored!)).toEqual({
        schoolName: 'Updated School',
        contactEmail: 'new@school.com',
        contactPhone: '999',
      })
    })

    it('does not throw when window is undefined', async () => {
      const originalWindow = globalThis.window
      // @ts-expect-error testing SSR scenario
      delete globalThis.window

      vi.resetModules()

      const { localSettingsService } = await import('../localSettings')

      expect(() => {
        localSettingsService.saveBasicSettings({ schoolName: 'Test', contactEmail: '', contactPhone: '' })
      }).not.toThrow()

      globalThis.window = originalWindow
    })
  })
})
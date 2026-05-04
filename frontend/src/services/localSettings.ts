import type { BasicSettingsFormData } from '../types/forms'

const LOCAL_SETTINGS_KEY = 'ai-teaching-platform-basic-settings'

const DEFAULT_SETTINGS: BasicSettingsFormData = {
  schoolName: '',
  contactEmail: '',
  contactPhone: '',
}

export const localSettingsService = {
  getBasicSettings(): BasicSettingsFormData {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS }
    }

    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY)
      if (!raw) {
        return { ...DEFAULT_SETTINGS }
      }

      const parsed = JSON.parse(raw) as Partial<BasicSettingsFormData>
      return {
        schoolName: parsed.schoolName ?? '',
        contactEmail: parsed.contactEmail ?? '',
        contactPhone: parsed.contactPhone ?? '',
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  },

  saveBasicSettings(values: BasicSettingsFormData): void {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(values))
  },
}

export default localSettingsService

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const PORTFOLIO_TYPES_KEY = 'ai-teaching-portfolio-types'
const BACKEND_SUPPORTED_TYPE_IDS = ['work', 'evaluation', 'observation', 'milestone'] as const

export interface PortfolioType {
  id: string
  name: string
  icon: string
  isDefault?: boolean
}

export const defaultPortfolioTypes: PortfolioType[] = [
  { id: 'work', name: '作品', icon: '📝', isDefault: true },
  { id: 'evaluation', name: '评价', icon: '📋', isDefault: true },
  { id: 'observation', name: '观察记录', icon: '👀', isDefault: true },
  { id: 'milestone', name: '里程碑', icon: '🏆', isDefault: true },
]

export const availableIcons = ['📝', '📋', '👀', '🏆', '📚', '🎯', '🌟', '🎨', '🔬', '🎵']

interface PortfolioTypesState {
  types: PortfolioType[]
  getAllTypes: () => PortfolioType[]
  getTypeById: (id: string) => PortfolioType | undefined
  getTypeByName: (name: string) => PortfolioType | undefined
  addType: (name: string, icon?: string) => PortfolioType | null
  updateType: (id: string, updates: Partial<Omit<PortfolioType, 'id' | 'isDefault'>>) => boolean
  deleteType: (id: string) => boolean
  resetToDefault: () => void
  getIconForType: (id: string) => string
  getNameForType: (id: string) => string
}

const defaultTypeMap = new Map(defaultPortfolioTypes.map((type) => [type.id, type]))

const sanitizePortfolioTypes = (input: unknown): PortfolioType[] => {
  const storedTypes = Array.isArray(input) ? input : []
  const mergedTypes = defaultPortfolioTypes.map((defaultType) => {
    const storedType = storedTypes.find(
      (item): item is PortfolioType =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        (item as PortfolioType).id === defaultType.id
    )

    if (!storedType) {
      return defaultType
    }

    return {
      ...defaultType,
      name: typeof storedType.name === 'string' && storedType.name.trim() ? storedType.name.trim() : defaultType.name,
      icon: typeof storedType.icon === 'string' && storedType.icon.trim() ? storedType.icon : defaultType.icon,
    }
  })

  return mergedTypes.filter((type) =>
    BACKEND_SUPPORTED_TYPE_IDS.includes(type.id as (typeof BACKEND_SUPPORTED_TYPE_IDS)[number])
  )
}

export const usePortfolioTypesStore = create<PortfolioTypesState>()(
  persist(
    (set, get) => ({
      types: [...defaultPortfolioTypes],
      getAllTypes: () => get().types,
      getTypeById: (id: string) => get().types.find((type) => type.id === id),
      getTypeByName: (name: string) => get().types.find((type) => type.name === name),
      addType: () => null,
      updateType: (id, updates) => {
        if (!defaultTypeMap.has(id)) {
          return false
        }

        const nextTypes = get().types.map((type) => {
          if (type.id !== id) {
            return type
          }

          return {
            ...type,
            name: typeof updates.name === 'string' && updates.name.trim() ? updates.name.trim() : type.name,
            icon: typeof updates.icon === 'string' && updates.icon.trim() ? updates.icon : type.icon,
          }
        })

        set({ types: nextTypes })
        return true
      },
      deleteType: () => false,
      resetToDefault: () => {
        set({ types: [...defaultPortfolioTypes] })
      },
      getIconForType: (id: string) => get().getTypeById(id)?.icon || '🗂️',
      getNameForType: (id: string) => get().getTypeById(id)?.name || '记录',
    }),
    {
      name: PORTFOLIO_TYPES_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<PortfolioTypesState> | undefined
        return {
          ...currentState,
          ...(state || {}),
          types: sanitizePortfolioTypes(state?.types),
        }
      },
    }
  )
)

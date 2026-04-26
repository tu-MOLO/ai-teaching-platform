/**
 * 成长档案记录类型管理 Store
 * 支持自定义记录类型和图标，本地持久化存储
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Storage Keys
const PORTFOLIO_TYPES_KEY = 'ai-teaching-portfolio-types'

// 默认记录类型配置
export const defaultPortfolioTypes: PortfolioType[] = [
  { id: 'work', name: '作品', icon: '🎨', isDefault: true },
  { id: 'evaluation', name: '评价', icon: '📝', isDefault: true },
  { id: 'observation', name: '观察记录', icon: '👁️', isDefault: true },
  { id: 'milestone', name: '里程碑', icon: '📊', isDefault: true },
]

// 可选图标列表
export const availableIcons = [
  '🎨', '📝', '👁️', '📊', '📚', '🎯', '🏆', '⭐', '💡', '🔬',
  '🎭', '🎵', '🎪', '🎬', '📷', '🎮', '🧩', '🎲', '🏃', '⚽',
  '🎹', '🎸', '🎺', '🎻', '📐', '🧮', '🌍', '🌱', '🔭', '⚗️',
  '💻', '📱', '✏️', '🖍️', '📒', '📋', '📌', '🔖', '🏷️', '✨',
]

// 记录类型接口
export interface PortfolioType {
  id: string
  name: string
  icon: string
  isDefault?: boolean // 是否为系统默认，默认类型不可删除
}

// 状态接口
interface PortfolioTypesState {
  // 自定义类型列表
  types: PortfolioType[]

  // Actions
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

export const usePortfolioTypesStore = create<PortfolioTypesState>()(
  persist(
    (set, get) => ({
      // 初始状态使用默认类型
      types: [...defaultPortfolioTypes],

      // 获取所有类型（包括默认和自定义）
      getAllTypes: () => {
        return get().types
      },

      // 根据ID获取类型
      getTypeById: (id: string) => {
        return get().types.find((t) => t.id === id)
      },

      // 根据名称获取类型
      getTypeByName: (name: string) => {
        return get().types.find((t) => t.name === name)
      },

      // 添加新类型
      addType: (name: string, icon?: string) => {
        const state = get()

        // 检查名称是否已存在
        if (state.getTypeByName(name)) {
          return null
        }

        const newType: PortfolioType = {
          id: `custom-${Date.now()}`,
          name: name.trim(),
          icon: icon || '📄', // 默认图标
          isDefault: false,
        }

        set({ types: [...state.types, newType] })
        return newType
      },

      // 更新类型
      updateType: (id: string, updates: Partial<Omit<PortfolioType, 'id' | 'isDefault'>>) => {
        const state = get()
        const typeIndex = state.types.findIndex((t) => t.id === id)

        if (typeIndex === -1) return false

        // 检查新名称是否与其他类型冲突
        if (updates.name) {
          const existingType = state.types.find(
            (t) => t.name === updates.name && t.id !== id
          )
          if (existingType) return false
        }

        const updatedTypes = [...state.types]
        updatedTypes[typeIndex] = { ...updatedTypes[typeIndex], ...updates }

        set({ types: updatedTypes })
        return true
      },

      // 删除类型（只能删除非默认类型）
      deleteType: (id: string) => {
        const state = get()
        const type = state.types.find((t) => t.id === id)

        // 默认类型不能删除
        if (!type || type.isDefault) return false

        set({ types: state.types.filter((t) => t.id !== id) })
        return true
      },

      // 重置为默认类型
      resetToDefault: () => {
        set({ types: [...defaultPortfolioTypes] })
      },

      // 获取类型的图标
      getIconForType: (id: string) => {
        const type = get().getTypeById(id)
        return type?.icon || '📄'
      },

      // 获取类型的名称
      getNameForType: (id: string) => {
        const type = get().getTypeById(id)
        return type?.name || '记录'
      },
    }),
    {
      name: PORTFOLIO_TYPES_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

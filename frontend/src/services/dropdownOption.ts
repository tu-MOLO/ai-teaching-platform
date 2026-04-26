import api from './api'
import { toItem, toListResponse } from './response'

export interface DropdownOption {
  id: string
  group_key: string
  label: string
  value: string
  description?: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDropdownOptionData {
  group_key: string
  label: string
  value: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdateDropdownOptionData {
  label?: string
  value?: string
  description?: string | null
  sort_order?: number
  is_active?: boolean
}

export const getDropdownOptions = async (
  groupKey?: string,
  activeOnly: boolean = true
): Promise<DropdownOption[]> => {
  const response = await api.get('/dropdown-options', {
    params: {
      group_key: groupKey,
      active_only: activeOnly,
    },
  })
  return toListResponse<DropdownOption>(response).data
}

export const createDropdownOption = async (
  data: CreateDropdownOptionData
): Promise<DropdownOption> => {
  const response = await api.post('/dropdown-options', data)
  return toItem<DropdownOption>(response)
}

export const updateDropdownOption = async (
  id: string,
  data: UpdateDropdownOptionData
): Promise<DropdownOption> => {
  const response = await api.put(`/dropdown-options/${id}`, data)
  return toItem<DropdownOption>(response)
}

export const deleteDropdownOption = async (id: string): Promise<void> => {
  await api.delete(`/dropdown-options/${id}`)
}

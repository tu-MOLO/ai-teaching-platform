import { useCallback, useEffect, useState } from 'react'
import {
  createDropdownOption,
  getDropdownOptions,
  type CreateDropdownOptionData,
  type DropdownOption,
} from '../services/dropdownOption'

export function useDropdownOptions(groupKey: string, activeOnly: boolean = true) {
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const nextOptions = await getDropdownOptions(groupKey, activeOnly)
      setOptions(nextOptions)
    } finally {
      setLoading(false)
    }
  }, [activeOnly, groupKey])

  const quickCreate = useCallback(
    async (label: string, value?: string) => {
      const payload: CreateDropdownOptionData = {
        group_key: groupKey,
        label,
        value: value || label,
        sort_order: options.length,
        is_active: true,
      }
      const created = await createDropdownOption(payload)
      setOptions((prev) => [...prev, created])
      return created
    },
    [groupKey, options.length]
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    options,
    loading,
    refresh,
    quickCreate,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDropdownOption,
  getDropdownOptions,
  type CreateDropdownOptionData,
  type DropdownOption,
} from '../services/dropdownOption'

export function useDropdownOptions(groupKey: string, activeOnly: boolean = true) {
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(false)
  const isMountedRef = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const nextOptions = await getDropdownOptions(groupKey, activeOnly)
      if (isMountedRef.current) {
        setOptions(nextOptions)
      }
    } catch (error) {
      console.error('Failed to fetch dropdown options:', error)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
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
    isMountedRef.current = true
    refresh()
    return () => {
      isMountedRef.current = false
    }
  }, [refresh])

  return {
    options,
    loading,
    refresh,
    quickCreate,
  }
}

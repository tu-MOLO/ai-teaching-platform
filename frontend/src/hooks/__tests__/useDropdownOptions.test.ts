import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDropdownOptions } from '../useDropdownOptions'

const mockGetDropdownOptions = vi.fn()
const mockCreateDropdownOption = vi.fn()

vi.mock('../../services/dropdownOption', () => ({
  getDropdownOptions: (...args: any[]) => mockGetDropdownOptions(...args),
  createDropdownOption: (...args: any[]) => mockCreateDropdownOption(...args),
}))

describe('useDropdownOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch options on mount', async () => {
    const mockOptions = [
      { id: '1', group_key: 'test', label: 'Option 1', value: 'opt1', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
    ]
    mockGetDropdownOptions.mockResolvedValueOnce(mockOptions)

    const { result } = renderHook(() => useDropdownOptions('test-group'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetDropdownOptions).toHaveBeenCalledWith('test-group', true)
    expect(result.current.options).toEqual(mockOptions)
  })

  it('should return loading state while fetching', () => {
    mockGetDropdownOptions.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useDropdownOptions('test-group'))

    expect(result.current.loading).toBe(true)
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetDropdownOptions.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDropdownOptions('test-group'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.options).toEqual([])
    consoleSpy.mockRestore()
  })

  it('should pass activeOnly parameter correctly', async () => {
    mockGetDropdownOptions.mockResolvedValueOnce([])

    renderHook(() => useDropdownOptions('test-group', false))

    await waitFor(() => {
      expect(mockGetDropdownOptions).toHaveBeenCalledWith('test-group', false)
    })
  })

  it('should refresh options', async () => {
    mockGetDropdownOptions.mockResolvedValueOnce([])
    mockGetDropdownOptions.mockResolvedValueOnce([
      { id: '2', group_key: 'test', label: 'Option 2', value: 'opt2', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
    ])

    const { result } = renderHook(() => useDropdownOptions('test-group'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetDropdownOptions).toHaveBeenCalledTimes(2)
  })

  it('should create a new option via quickCreate', async () => {
    const createdOption = { id: '3', group_key: 'test', label: 'New', value: 'new', sort_order: 0, is_active: true, created_at: '', updated_at: '' }
    mockGetDropdownOptions.mockResolvedValueOnce([])
    mockCreateDropdownOption.mockResolvedValueOnce(createdOption)

    const { result } = renderHook(() => useDropdownOptions('test-group'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let created: any
    await act(async () => {
      created = await result.current.quickCreate('New')
    })

    expect(mockCreateDropdownOption).toHaveBeenCalledWith(
      expect.objectContaining({
        group_key: 'test-group',
        label: 'New',
        value: 'New',
        is_active: true,
      })
    )
    expect(created).toEqual(createdOption)
    expect(result.current.options).toContainEqual(createdOption)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('../api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  }
}))

vi.mock('../response', () => ({
  toItem: (response: any) => response,
  toListResponse: (response: any) => response,
}))

describe('dropdownOption service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDropdownOptions', () => {
    it('calls api.get with /dropdown-options and params', async () => {
      const { getDropdownOptions } = await import('../dropdownOption')

      mockGet.mockResolvedValue({ data: [{ id: '1', group_key: 'grades', label: 'Grade 1', value: 'g1' }] })

      await getDropdownOptions('grades', true)

      expect(mockGet).toHaveBeenCalledWith('/dropdown-options', {
        params: { group_key: 'grades', active_only: true }
      })
    })

    it('calls api.get with activeOnly=false', async () => {
      const { getDropdownOptions } = await import('../dropdownOption')

      mockGet.mockResolvedValue({ data: [] })

      await getDropdownOptions('subjects', false)

      expect(mockGet).toHaveBeenCalledWith('/dropdown-options', {
        params: { group_key: 'subjects', active_only: false }
      })
    })

    it('calls api.get with undefined groupKey', async () => {
      const { getDropdownOptions } = await import('../dropdownOption')

      mockGet.mockResolvedValue({ data: [] })

      await getDropdownOptions()

      expect(mockGet).toHaveBeenCalledWith('/dropdown-options', {
        params: { group_key: undefined, active_only: true }
      })
    })

    it('returns extracted data from list response', async () => {
      const { getDropdownOptions } = await import('../dropdownOption')
      const options = [{ id: '1', group_key: 'grades', label: 'Grade 1', value: 'g1', sort_order: 1, is_active: true, created_at: '', updated_at: '' }]

      mockGet.mockResolvedValue({ data: options })

      const result = await getDropdownOptions()

      expect(result).toEqual(options)
    })
  })

  describe('createDropdownOption', () => {
    it('calls api.post with /dropdown-options and data', async () => {
      const { createDropdownOption } = await import('../dropdownOption')
      const data = { group_key: 'grades', label: 'Grade 1', value: 'g1' }

      mockPost.mockResolvedValue({ data: { id: '1', ...data } })

      await createDropdownOption(data)

      expect(mockPost).toHaveBeenCalledWith('/dropdown-options', data)
    })

    it('returns created option', async () => {
      const { createDropdownOption } = await import('../dropdownOption')
      const createdOption = { id: '1', group_key: 'grades', label: 'Grade 1', value: 'g1' }

      mockPost.mockResolvedValue(createdOption)

      const result = await createDropdownOption({ group_key: 'grades', label: 'Grade 1', value: 'g1' })

      expect(result).toBe(createdOption)
    })
  })

  describe('updateDropdownOption', () => {
    it('calls api.put with /dropdown-options/{id} and data', async () => {
      const { updateDropdownOption } = await import('../dropdownOption')
      const id = '123'
      const data = { label: 'Updated Label' }

      mockPut.mockResolvedValue({ data: { id: '123', ...data } })

      await updateDropdownOption(id, data)

      expect(mockPut).toHaveBeenCalledWith('/dropdown-options/123', data)
    })

    it('returns updated option', async () => {
      const { updateDropdownOption } = await import('../dropdownOption')
      const updatedOption = { id: '123', label: 'Updated Label' }

      mockPut.mockResolvedValue(updatedOption)

      const result = await updateDropdownOption('123', { label: 'Updated Label' })

      expect(result).toBe(updatedOption)
    })
  })

  describe('deleteDropdownOption', () => {
    it('calls api.delete with /dropdown-options/{id}', async () => {
      const { deleteDropdownOption } = await import('../dropdownOption')

      mockDelete.mockResolvedValue(undefined)

      await deleteDropdownOption('123')

      expect(mockDelete).toHaveBeenCalledWith('/dropdown-options/123')
    })
  })

  describe('error handling', () => {
    it('rejects with Network Error when getDropdownOptions fails', async () => {
      const { getDropdownOptions } = await import('../dropdownOption')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getDropdownOptions()).rejects.toThrow('Network Error')
    })
  })
})
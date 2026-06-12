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

describe('tag service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTags', () => {
    it('calls api.get with /tags', async () => {
      const { getTags } = await import('../tag')

      mockGet.mockResolvedValue({ data: [{ id: '1', name: 'Tag A' }], total: 1 })

      const result = await getTags()

      expect(mockGet).toHaveBeenCalledWith('/tags')
      expect(result).toEqual([{ id: '1', name: 'Tag A' }])
    })

    it('returns empty array when no tags', async () => {
      const { getTags } = await import('../tag')

      mockGet.mockResolvedValue({ data: [], total: 0 })

      const result = await getTags()

      expect(result).toEqual([])
    })
  })

  describe('createTag', () => {
    it('calls api.post with /tags and tag data', async () => {
      const { createTag } = await import('../tag')
      const tag = { name: 'New Tag', description: 'A test tag' }

      mockPost.mockResolvedValue({ id: '1', ...tag })

      const result = await createTag(tag)

      expect(mockPost).toHaveBeenCalledWith('/tags', tag)
      expect(result).toEqual({ id: '1', name: 'New Tag', description: 'A test tag' })
    })
  })

  describe('updateTag', () => {
    it('calls api.put with /tags/{id} and data', async () => {
      const { updateTag } = await import('../tag')
      const id = '123'
      const tag = { name: 'Updated Tag' }

      mockPut.mockResolvedValue({ id: '123', name: 'Updated Tag' })

      const result = await updateTag(id, tag)

      expect(mockPut).toHaveBeenCalledWith('/tags/123', tag)
      expect(result).toEqual({ id: '123', name: 'Updated Tag' })
    })
  })

  describe('deleteTag', () => {
    it('calls api.delete with /tags/{id}', async () => {
      const { deleteTag } = await import('../tag')
      const id = '123'

      mockDelete.mockResolvedValue(undefined)

      await deleteTag(id)

      expect(mockDelete).toHaveBeenCalledWith('/tags/123')
    })
  })

  describe('error handling', () => {
    it('rejects with Network Error when getTags fails', async () => {
      const { getTags } = await import('../tag')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getTags()).rejects.toThrow('Network Error')
    })
  })
})
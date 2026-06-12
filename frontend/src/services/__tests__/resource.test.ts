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

describe('resource service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getResources', () => {
    it('calls api.get with /resources and params', async () => {
      const { getResources } = await import('../resource')
      const params = { page: 1, page_size: 10 }

      mockGet.mockResolvedValue({ data: [], total: 0 })

      await getResources(params)

      expect(mockGet).toHaveBeenCalledWith('/resources', { params })
    })

    it('returns list response data', async () => {
      const { getResources } = await import('../resource')
      const responseData = { data: [{ id: '1', name: 'Resource A' }], total: 1 }

      mockGet.mockResolvedValue(responseData)

      const result = await getResources()

      expect(result).toBe(responseData)
    })
  })

  describe('getResource', () => {
    it('calls api.get with /resources/{id}', async () => {
      const { getResource } = await import('../resource')
      const id = '123'

      mockGet.mockResolvedValue({ id: '123', name: 'Resource A' })

      const result = await getResource(id)

      expect(mockGet).toHaveBeenCalledWith('/resources/123')
      expect(result).toEqual({ id: '123', name: 'Resource A' })
    })
  })

  describe('uploadResource', () => {
    it('calls api.post with /resources, formData, multipart headers and onUploadProgress', async () => {
      const { uploadResource } = await import('../resource')
      const formData = new FormData()
      const onProgress = vi.fn()

      mockPost.mockResolvedValue({ id: '1', name: 'uploaded.pdf' })

      const result = await uploadResource(formData, onProgress)

      expect(mockPost).toHaveBeenCalledWith('/resources', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: onProgress,
      })
      expect(result).toEqual({ id: '1', name: 'uploaded.pdf' })
    })
  })

  describe('updateResource', () => {
    it('calls api.put with /resources/{id} and data', async () => {
      const { updateResource } = await import('../resource')
      const id = '123'
      const data = { name: 'Updated Resource' }

      mockPut.mockResolvedValue({ id: '123', name: 'Updated Resource' })

      const result = await updateResource(id, data)

      expect(mockPut).toHaveBeenCalledWith('/resources/123', data)
      expect(result).toEqual({ id: '123', name: 'Updated Resource' })
    })
  })

  describe('deleteResource', () => {
    it('calls api.delete with /resources/{id}', async () => {
      const { deleteResource } = await import('../resource')
      const id = '123'

      mockDelete.mockResolvedValue(undefined)

      await deleteResource(id)

      expect(mockDelete).toHaveBeenCalledWith('/resources/123')
    })
  })

  describe('fetchResourceFileBlob', () => {
    it('calls api.get with /resources/{resourceId}/file and responseType blob', async () => {
      const { fetchResourceFileBlob } = await import('../resource')
      const resourceId = 'res-123'

      mockGet.mockResolvedValue(new Blob())

      await fetchResourceFileBlob(resourceId)

      expect(mockGet).toHaveBeenCalledWith('/resources/res-123/file', {
        responseType: 'blob',
      })
    })
  })

  describe('extractResourceIdFromFileUrl', () => {
    it('returns the extracted resource id from URL', async () => {
      const { extractResourceIdFromFileUrl } = await import('../resource')

      const url = 'https://example.com/resources/abc123/file?token=xyz'

      const result = extractResourceIdFromFileUrl(url)

      expect(result).toBe('abc123')
    })

    it('returns null for null input', async () => {
      const { extractResourceIdFromFileUrl } = await import('../resource')

      const result = extractResourceIdFromFileUrl(null)

      expect(result).toBeNull()
    })

    it('returns null for undefined input', async () => {
      const { extractResourceIdFromFileUrl } = await import('../resource')

      const result = extractResourceIdFromFileUrl(undefined)

      expect(result).toBeNull()
    })

    it('returns null for invalid URL', async () => {
      const { extractResourceIdFromFileUrl } = await import('../resource')

      const result = extractResourceIdFromFileUrl('not-a-valid-url')

      expect(result).toBeNull()
    })
  })

  describe('resourceService object', () => {
    it('has all 5 methods', async () => {
      const { resourceService } = await import('../resource')

      expect(resourceService).toHaveProperty('getResources')
      expect(resourceService).toHaveProperty('getResource')
      expect(resourceService).toHaveProperty('uploadResource')
      expect(resourceService).toHaveProperty('updateResource')
      expect(resourceService).toHaveProperty('deleteResource')
      expect(typeof resourceService.getResources).toBe('function')
      expect(typeof resourceService.getResource).toBe('function')
      expect(typeof resourceService.uploadResource).toBe('function')
      expect(typeof resourceService.updateResource).toBe('function')
      expect(typeof resourceService.deleteResource).toBe('function')
    })
  })

  describe('error handling', () => {
    it('getResources rejects with error on network failure', async () => {
      const { getResources } = await import('../resource')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getResources()).rejects.toThrow('Network Error')
    })

    it('uploadResource rejects with error on network failure', async () => {
      const { uploadResource } = await import('../resource')
      const formData = new FormData()

      mockPost.mockRejectedValue(new Error('Network Error'))

      await expect(uploadResource(formData)).rejects.toThrow('Network Error')
    })
  })
})
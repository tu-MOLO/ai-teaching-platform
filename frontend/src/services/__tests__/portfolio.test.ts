import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('../api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  }
}))

vi.mock('../response', () => ({
  toItem: (response: any) => response,
  toListResponse: (response: any) => response,
  toBlob: (response: any) => response,
}))

describe('portfolio service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPortfolios', () => {
    it('calls api.get with /portfolios and params', async () => {
      const { portfolioService } = await import('../portfolio')
      const params = { student_id: 's1', type: 'work', page: 1, page_size: 10 }

      mockGet.mockResolvedValue({ data: { items: [], total: 0 } })

      await portfolioService.getPortfolios(params)

      expect(mockGet).toHaveBeenCalledWith('/portfolios', { params })
    })

    it('calls api.get with /portfolios without params', async () => {
      const { portfolioService } = await import('../portfolio')

      mockGet.mockResolvedValue({ data: { items: [], total: 0 } })

      await portfolioService.getPortfolios()

      expect(mockGet).toHaveBeenCalledWith('/portfolios', { params: undefined })
    })

    it('returns list response data', async () => {
      const { portfolioService } = await import('../portfolio')
      const responseData = { data: [{ id: '1', name: 'Test' }], total: 1 }

      mockGet.mockResolvedValue(responseData)

      const result = await portfolioService.getPortfolios()

      expect(result).toBe(responseData)
    })
  })

  describe('getPortfolioItem', () => {
    it('calls api.get with /portfolios/{itemId}', async () => {
      const { portfolioService } = await import('../portfolio')

      mockGet.mockResolvedValue({ data: { id: '123', name: 'Item' } })

      await portfolioService.getPortfolioItem('123')

      expect(mockGet).toHaveBeenCalledWith('/portfolios/123')
    })

    it('returns the item', async () => {
      const { portfolioService } = await import('../portfolio')
      const itemData = { id: '123', name: 'Item' }

      mockGet.mockResolvedValue(itemData)

      const result = await portfolioService.getPortfolioItem('123')

      expect(result).toBe(itemData)
    })
  })

  describe('createPortfolioItem', () => {
    it('calls api.post with /portfolios and data', async () => {
      const { portfolioService } = await import('../portfolio')
      const data = { student_id: 's1', type: 'work' as const, title: 'New Item', description: 'desc', content: '', attachments: '' }

      mockPost.mockResolvedValue({ data: { id: '1', ...data } })

      await portfolioService.createPortfolioItem(data)

      expect(mockPost).toHaveBeenCalledWith('/portfolios', data)
    })

    it('returns created item', async () => {
      const { portfolioService } = await import('../portfolio')
      const createdItem = { id: '1', title: 'New Item' }

      mockPost.mockResolvedValue(createdItem)

      const result = await portfolioService.createPortfolioItem({
        student_id: 's1', type: 'work' as const, title: 'New Item', content: '', attachments: ''
      })

      expect(result).toBe(createdItem)
    })
  })

  describe('updatePortfolioItem', () => {
    it('calls api.put with /portfolios/{itemId} and data', async () => {
      const { portfolioService } = await import('../portfolio')
      const id = '123'
      const data = { title: 'Updated Item', description: 'new desc' }

      mockPut.mockResolvedValue({ data: { id: '123', ...data } })

      await portfolioService.updatePortfolioItem(id, data)

      expect(mockPut).toHaveBeenCalledWith('/portfolios/123', data)
    })

    it('returns updated item', async () => {
      const { portfolioService } = await import('../portfolio')
      const updatedItem = { id: '123', title: 'Updated Item' }

      mockPut.mockResolvedValue(updatedItem)

      const result = await portfolioService.updatePortfolioItem('123', { title: 'Updated Item' })

      expect(result).toBe(updatedItem)
    })
  })

  describe('deletePortfolioItem', () => {
    it('calls api.delete with /portfolios/{itemId}', async () => {
      const { portfolioService } = await import('../portfolio')

      mockDelete.mockResolvedValue(undefined)

      await portfolioService.deletePortfolioItem('123')

      expect(mockDelete).toHaveBeenCalledWith('/portfolios/123')
    })
  })

  describe('exportPortfolioReport', () => {
    it('calls api.get with /students/{studentId}/export and responseType blob', async () => {
      const { portfolioService } = await import('../portfolio')

      mockGet.mockResolvedValue(new Blob())

      await portfolioService.exportPortfolioReport('s1')

      expect(mockGet).toHaveBeenCalledWith('/students/s1/export', { responseType: 'blob' })
    })

    it('returns Blob', async () => {
      const { portfolioService } = await import('../portfolio')
      const blob = new Blob(['test'])

      mockGet.mockResolvedValue(blob)

      const result = await portfolioService.exportPortfolioReport('s1')

      expect(result).toBe(blob)
    })
  })

  describe('error handling', () => {
    it('getPortfolios rejects with error on network failure', async () => {
      const { portfolioService } = await import('../portfolio')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(portfolioService.getPortfolios()).rejects.toThrow('Network Error')
    })

    it('createPortfolioItem rejects with error on network failure', async () => {
      const { portfolioService } = await import('../portfolio')
      const data = { student_id: 's1', type: 'work' as const, title: 'Test', content: '', attachments: '' }

      mockPost.mockRejectedValue(new Error('Network Error'))

      await expect(portfolioService.createPortfolioItem(data)).rejects.toThrow('Network Error')
    })
  })
})
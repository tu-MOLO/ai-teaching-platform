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

describe('lessonTemplate service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLessonTemplates', () => {
    it('calls api.get with /lesson-templates and params', async () => {
      const { getLessonTemplates } = await import('../lessonTemplate')
      const params = { page: 1, page_size: 10 }

      mockGet.mockResolvedValue({ data: [], total: 0 })

      await getLessonTemplates(params)

      expect(mockGet).toHaveBeenCalledWith('/lesson-templates', { params })
    })

    it('returns list response data', async () => {
      const { getLessonTemplates } = await import('../lessonTemplate')
      const responseData = { data: [{ id: '1', name: 'Template A' }], total: 1 }

      mockGet.mockResolvedValue(responseData)

      const result = await getLessonTemplates()

      expect(result).toBe(responseData)
    })

    it('works without params', async () => {
      const { getLessonTemplates } = await import('../lessonTemplate')

      mockGet.mockResolvedValue({ data: [], total: 0 })

      await getLessonTemplates()

      expect(mockGet).toHaveBeenCalledWith('/lesson-templates', { params: undefined })
    })
  })

  describe('getLessonTemplate', () => {
    it('calls api.get with /lesson-templates/{id}', async () => {
      const { getLessonTemplate } = await import('../lessonTemplate')
      const id = 'tpl-1'

      mockGet.mockResolvedValue({ id: 'tpl-1', name: 'Template A' })

      const result = await getLessonTemplate(id)

      expect(mockGet).toHaveBeenCalledWith('/lesson-templates/tpl-1')
      expect(result).toEqual({ id: 'tpl-1', name: 'Template A' })
    })
  })

  describe('error handling', () => {
    it('getLessonTemplates throws on network error', async () => {
      const { getLessonTemplates } = await import('../lessonTemplate')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getLessonTemplates()).rejects.toThrow('Network Error')
    })
  })
})
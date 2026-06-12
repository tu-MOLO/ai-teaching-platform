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

describe('lessonPlan service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLessonPlans', () => {
    it('calls api.get with /lesson-plans and params', async () => {
      const { getLessonPlans } = await import('../lessonPlan')
      const params = { page: 1, page_size: 10 }

      mockGet.mockResolvedValue({ data: [], total: 0 })

      await getLessonPlans(params)

      expect(mockGet).toHaveBeenCalledWith('/lesson-plans', { params: { page: 1, page_size: 10 } })
    })

    it('maps status to status_filter', async () => {
      const { getLessonPlans } = await import('../lessonPlan')
      const params = { page: 1, page_size: 10, status: 'draft' }

      mockGet.mockResolvedValue({ data: [], total: 0 })

      await getLessonPlans(params)

      expect(mockGet).toHaveBeenCalledWith('/lesson-plans', {
        params: { page: 1, page_size: 10, status_filter: 'draft' }
      })
    })
  })

  describe('getLessonPlan', () => {
    it('calls api.get with /lesson-plans/{id}', async () => {
      const { getLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'

      mockGet.mockResolvedValue({ id: 'lp-1', title: 'Plan A' })

      const result = await getLessonPlan(id)

      expect(mockGet).toHaveBeenCalledWith('/lesson-plans/lp-1')
      expect(result).toEqual({ id: 'lp-1', title: 'Plan A' })
    })
  })

  describe('createLessonPlan', () => {
    it('calls api.post with /lesson-plans and data', async () => {
      const { createLessonPlan } = await import('../lessonPlan')
      const data = { title: 'New Plan', subject: 'Math' } as any

      mockPost.mockResolvedValue({ id: '1', title: 'New Plan' })

      const result = await createLessonPlan(data)

      expect(mockPost).toHaveBeenCalledWith('/lesson-plans', data)
      expect(result).toEqual({ id: '1', title: 'New Plan' })
    })

    it('includes status in data when status provided', async () => {
      const { createLessonPlan } = await import('../lessonPlan')
      const data = { title: 'New Plan' } as any

      mockPost.mockResolvedValue({ id: '1', title: 'New Plan', status: 'published' })

      const result = await createLessonPlan(data, 'published')

      expect(mockPost).toHaveBeenCalledWith('/lesson-plans', { title: 'New Plan', status: 'published' })
      expect(result).toEqual({ id: '1', title: 'New Plan', status: 'published' })
    })
  })

  describe('updateLessonPlan', () => {
    it('calls api.put with /lesson-plans/{id} and data', async () => {
      const { updateLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'
      const data = { title: 'Updated Plan' } as any

      mockPut.mockResolvedValue({ id: 'lp-1', title: 'Updated Plan' })

      const result = await updateLessonPlan(id, data)

      expect(mockPut).toHaveBeenCalledWith('/lesson-plans/lp-1', data)
      expect(result).toEqual({ id: 'lp-1', title: 'Updated Plan' })
    })

    it('includes status in data when status provided', async () => {
      const { updateLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'
      const data = { title: 'Updated Plan' } as any

      mockPut.mockResolvedValue({ id: 'lp-1', title: 'Updated Plan', status: 'archived' })

      const result = await updateLessonPlan(id, data, 'archived')

      expect(mockPut).toHaveBeenCalledWith('/lesson-plans/lp-1', { title: 'Updated Plan', status: 'archived' })
      expect(result).toEqual({ id: 'lp-1', title: 'Updated Plan', status: 'archived' })
    })
  })

  describe('deleteLessonPlan', () => {
    it('calls api.delete with /lesson-plans/{id}', async () => {
      const { deleteLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'

      mockDelete.mockResolvedValue(undefined)

      await deleteLessonPlan(id)

      expect(mockDelete).toHaveBeenCalledWith('/lesson-plans/lp-1')
    })
  })

  describe('publishLessonPlan', () => {
    it('calls api.post with /lesson-plans/{id}/publish', async () => {
      const { publishLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'

      mockPost.mockResolvedValue({ id: 'lp-1', status: 'published' })

      const result = await publishLessonPlan(id)

      expect(mockPost).toHaveBeenCalledWith('/lesson-plans/lp-1/publish')
      expect(result).toEqual({ id: 'lp-1', status: 'published' })
    })
  })

  describe('unpublishLessonPlan', () => {
    it('calls api.post with /lesson-plans/{id}/unpublish', async () => {
      const { unpublishLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'

      mockPost.mockResolvedValue({ id: 'lp-1', status: 'draft' })

      const result = await unpublishLessonPlan(id)

      expect(mockPost).toHaveBeenCalledWith('/lesson-plans/lp-1/unpublish')
      expect(result).toEqual({ id: 'lp-1', status: 'draft' })
    })
  })

  describe('archiveLessonPlan', () => {
    it('calls api.post with /lesson-plans/{id}/archive', async () => {
      const { archiveLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'

      mockPost.mockResolvedValue({ id: 'lp-1', status: 'archived' })

      const result = await archiveLessonPlan(id)

      expect(mockPost).toHaveBeenCalledWith('/lesson-plans/lp-1/archive')
      expect(result).toEqual({ id: 'lp-1', status: 'archived' })
    })
  })

  describe('restoreLessonPlan', () => {
    it('calls api.post with /lesson-plans/{id}/restore', async () => {
      const { restoreLessonPlan } = await import('../lessonPlan')
      const id = 'lp-1'

      mockPost.mockResolvedValue({ id: 'lp-1', status: 'draft' })

      const result = await restoreLessonPlan(id)

      expect(mockPost).toHaveBeenCalledWith('/lesson-plans/lp-1/restore')
      expect(result).toEqual({ id: 'lp-1', status: 'draft' })
    })
  })

  describe('getMonthlyStats', () => {
    it('calls api.get with /lesson-plans/stats/monthly and params', async () => {
      const { getMonthlyStats } = await import('../lessonPlan')

      const statsData = { year: 2025, month: 6, monthly_count: 10, draft_count: 2 }
      mockGet.mockResolvedValue(statsData)

      const result = await getMonthlyStats(2025, 6)

      expect(mockGet).toHaveBeenCalledWith('/lesson-plans/stats/monthly', {
        params: { year: 2025, month: 6 }
      })
      expect(result).toEqual(statsData)
    })
  })

  describe('error handling', () => {
    it('getLessonPlans throws on network error', async () => {
      const { getLessonPlans } = await import('../lessonPlan')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getLessonPlans()).rejects.toThrow('Network Error')
    })

    it('createLessonPlan throws on network error', async () => {
      const { createLessonPlan } = await import('../lessonPlan')

      mockPost.mockRejectedValue(new Error('Network Error'))

      await expect(createLessonPlan({ title: 'Test' } as any)).rejects.toThrow('Network Error')
    })
  })
})
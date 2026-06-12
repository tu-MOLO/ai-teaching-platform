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

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('calls api.get with proper URL query params including type, read, page, page_size', async () => {
      const { getNotifications } = await import('../notification')
      const params = { type: 'course' as any, read: true, page: 2, page_size: 10 }

      mockGet.mockResolvedValue({ data: { data: [], total: 0 } })

      await getNotifications(params)

      expect(mockGet).toHaveBeenCalledWith('/notifications?type=course&read=true&page=2&page_size=10')
    })

    it('calls api.get with default page and page_size when not provided', async () => {
      const { getNotifications } = await import('../notification')

      mockGet.mockResolvedValue({ data: { data: [], total: 0 } })

      await getNotifications()

      expect(mockGet).toHaveBeenCalledWith('/notifications?page=1&page_size=20')
    })

    it('handles params without type and read', async () => {
      const { getNotifications } = await import('../notification')

      mockGet.mockResolvedValue({ data: { data: [], total: 0 } })

      await getNotifications({ page: 3, page_size: 5 })

      expect(mockGet).toHaveBeenCalledWith('/notifications?page=3&page_size=5')
    })
  })

  describe('getUnreadCount', () => {
    it('calls api.get with /notifications/unread-count', async () => {
      const { getUnreadCount } = await import('../notification')

      mockGet.mockResolvedValue({ unread_count: 5 })

      const result = await getUnreadCount()

      expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count')
      expect(result).toBe(5)
    })
  })

  describe('getNotificationStats', () => {
    it('calls api.get with /notifications/stats', async () => {
      const { getNotificationStats } = await import('../notification')

      const statsData = { total: 100, unread: 5, read: 95, by_type: {} }
      mockGet.mockResolvedValue(statsData)

      const result = await getNotificationStats()

      expect(mockGet).toHaveBeenCalledWith('/notifications/stats')
      expect(result).toBe(statsData)
    })
  })

  describe('getNotificationDetail', () => {
    it('calls api.get with /notifications/{id}', async () => {
      const { getNotificationDetail } = await import('../notification')
      const id = 'notif-1'

      const notifData = { id: 'notif-1', title: 'Test' }
      mockGet.mockResolvedValue(notifData)

      const result = await getNotificationDetail(id)

      expect(mockGet).toHaveBeenCalledWith('/notifications/notif-1')
      expect(result).toBe(notifData)
    })
  })

  describe('markAsRead', () => {
    it('calls api.put with /notifications/{id}/read', async () => {
      const { markAsRead } = await import('../notification')
      const id = 'notif-1'

      const notifData = { id: 'notif-1', title: 'Test' }
      mockPut.mockResolvedValue(notifData)

      const result = await markAsRead(id)

      expect(mockPut).toHaveBeenCalledWith('/notifications/notif-1/read')
      expect(result).toBe(notifData)
    })
  })

  describe('markAllAsRead', () => {
    it('calls api.put with /notifications/read-all', async () => {
      const { markAllAsRead } = await import('../notification')

      const responseData = { message: 'success', code: 'OK' }
      mockPut.mockResolvedValue(responseData)

      const result = await markAllAsRead()

      expect(mockPut).toHaveBeenCalledWith('/notifications/read-all')
      expect(result).toBe(responseData)
    })
  })

  describe('markBatchAsRead', () => {
    it('calls api.put with /notifications/read-batch and {ids}', async () => {
      const { markBatchAsRead } = await import('../notification')
      const ids = ['id1', 'id2', 'id3']

      const responseData = { message: 'success', code: 'OK' }
      mockPut.mockResolvedValue(responseData)

      const result = await markBatchAsRead(ids)

      expect(mockPut).toHaveBeenCalledWith('/notifications/read-batch', { ids })
      expect(result).toBe(responseData)
    })
  })

  describe('deleteNotification', () => {
    it('calls api.delete with /notifications/{id}', async () => {
      const { deleteNotification } = await import('../notification')
      const id = 'notif-1'

      const responseData = { message: 'deleted', code: 'OK' }
      mockDelete.mockResolvedValue(responseData)

      const result = await deleteNotification(id)

      expect(mockDelete).toHaveBeenCalledWith('/notifications/notif-1')
      expect(result).toBe(responseData)
    })
  })

  describe('deleteAllRead', () => {
    it('calls api.delete with /notifications/read/all', async () => {
      const { deleteAllRead } = await import('../notification')

      const responseData = { message: 'deleted', code: 'OK' }
      mockDelete.mockResolvedValue(responseData)

      const result = await deleteAllRead()

      expect(mockDelete).toHaveBeenCalledWith('/notifications/read/all')
      expect(result).toBe(responseData)
    })
  })

  describe('error handling', () => {
    it('getNotifications throws on network error', async () => {
      const { getNotifications } = await import('../notification')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getNotifications()).rejects.toThrow('Network Error')
    })
  })
})
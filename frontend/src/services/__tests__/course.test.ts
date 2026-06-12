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

describe('course service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCourses', () => {
    it('calls api.get with /courses and params', async () => {
      const { getCourses } = await import('../course')
      const params = { page: 1, page_size: 10 }

      mockGet.mockResolvedValue({ data: { items: [], total: 0 } })

      await getCourses(params)

      expect(mockGet).toHaveBeenCalledWith('/courses', { params })
    })

    it('returns list response data', async () => {
      const { getCourses } = await import('../course')
      const responseData = { data: [{ id: '1', name: 'Math' }], total: 1 }

      mockGet.mockResolvedValue(responseData)

      const result = await getCourses()

      expect(result).toBe(responseData)
    })
  })

  describe('getCourse', () => {
    it('calls api.get with /courses/{id}', async () => {
      const { getCourse } = await import('../course')
      const id = '123'

      mockGet.mockResolvedValue({ data: { id: '123', name: 'Math' } })

      await getCourse(id)

      expect(mockGet).toHaveBeenCalledWith('/courses/123')
    })

    it('returns single course', async () => {
      const { getCourse } = await import('../course')
      const courseData = { id: '123', name: 'Math' }

      mockGet.mockResolvedValue(courseData)

      const result = await getCourse('123')

      expect(result).toBe(courseData)
    })
  })

  describe('createCourse', () => {
    it('calls api.post with /courses and data', async () => {
      const { createCourse } = await import('../course')
      const data = { name: 'New Course', subject: 'Math', grade: '5' }

      mockPost.mockResolvedValue({ data: { id: '1', ...data } })

      await createCourse(data)

      expect(mockPost).toHaveBeenCalledWith('/courses', data)
    })

    it('returns created course', async () => {
      const { createCourse } = await import('../course')
      const createdCourse = { id: '1', name: 'New Course' }

      mockPost.mockResolvedValue(createdCourse)

      const result = await createCourse({ name: 'New Course', subject: 'Math', grade: '5' })

      expect(result).toBe(createdCourse)
    })
  })

  describe('updateCourse', () => {
    it('calls api.put with /courses/{id} and data', async () => {
      const { updateCourse } = await import('../course')
      const id = '123'
      const data = { name: 'Updated Course' }

      mockPut.mockResolvedValue({ data: { id: '123', name: 'Updated Course' } })

      await updateCourse(id, data)

      expect(mockPut).toHaveBeenCalledWith('/courses/123', data)
    })

    it('returns updated course', async () => {
      const { updateCourse } = await import('../course')
      const updatedCourse = { id: '123', name: 'Updated Course' }

      mockPut.mockResolvedValue(updatedCourse)

      const result = await updateCourse('123', { name: 'Updated Course' })

      expect(result).toBe(updatedCourse)
    })
  })

  describe('deleteCourse', () => {
    it('calls api.delete with /courses/{id}', async () => {
      const { deleteCourse } = await import('../course')
      const id = '123'

      mockDelete.mockResolvedValue(undefined)

      await deleteCourse(id)

      expect(mockDelete).toHaveBeenCalledWith('/courses/123')
    })
  })

  describe('error handling', () => {
    it('getCourses throws on network error', async () => {
      const { getCourses } = await import('../course')
      mockGet.mockRejectedValue(new Error('Network Error'))
      await expect(getCourses()).rejects.toThrow('Network Error')
    })

    it('createCourse throws on network error', async () => {
      const { createCourse } = await import('../course')
      mockPost.mockRejectedValue(new Error('Network Error'))
      await expect(createCourse({ name: 'New Course', subject: 'Math', grade: '5' })).rejects.toThrow('Network Error')
    })
  })
})

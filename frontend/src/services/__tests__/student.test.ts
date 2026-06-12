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
  toBlob: (response: any) => response,
}))

describe('student service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStudents', () => {
    it('calls api.get with /students and params', async () => {
      const { default: studentService } = await import('../student')
      const params = { page: 1, page_size: 10 }

      mockGet.mockResolvedValue({ data: { items: [], total: 0 } })

      await studentService.getStudents(params)

      expect(mockGet).toHaveBeenCalledWith('/students', { params })
    })

    it('returns list response data', async () => {
      const { default: studentService } = await import('../student')
      const responseData = { data: [{ id: '1', name: 'Student A' }], total: 1 }

      mockGet.mockResolvedValue(responseData)

      const result = await studentService.getStudents()

      expect(result).toBe(responseData)
    })

    it('passes query params with keyword, grade, class_name', async () => {
      const { default: studentService } = await import('../student')
      const params = { page: 1, page_size: 10, keyword: 'test', grade: '5', class_name: 'A班' }

      mockGet.mockResolvedValue({ data: [], total: 0 })

      await studentService.getStudents(params)

      expect(mockGet).toHaveBeenCalledWith('/students', { params })
    })
  })

  describe('getStudent', () => {
    it('calls api.get with /students/{id}', async () => {
      const { default: studentService } = await import('../student')
      const id = '123'

      mockGet.mockResolvedValue({ data: { id: '123', name: 'Student A' } })

      await studentService.getStudent(id)

      expect(mockGet).toHaveBeenCalledWith('/students/123')
    })

    it('returns single student via toItem', async () => {
      const { default: studentService } = await import('../student')
      const studentData = { id: '123', name: 'Student A' }

      mockGet.mockResolvedValue(studentData)

      const result = await studentService.getStudent('123')

      expect(result).toBe(studentData)
    })
  })

  describe('createStudent', () => {
    it('calls api.post with /students and data', async () => {
      const { default: studentService } = await import('../student')
      const data = { name: 'New Student', gender: 'male', birth_date: '2020-01-01', grade: '5', class_name: 'A班' }

      mockPost.mockResolvedValue({ data: { id: '1', ...data } })

      await studentService.createStudent(data)

      expect(mockPost).toHaveBeenCalledWith('/students', data)
    })

    it('returns created student via toItem', async () => {
      const { default: studentService } = await import('../student')
      const created = { id: '1', name: 'New Student' }

      mockPost.mockResolvedValue(created)

      const result = await studentService.createStudent({ name: 'New Student', gender: 'male', birth_date: '2020-01-01', grade: '5', class_name: 'A班' })

      expect(result).toBe(created)
    })
  })

  describe('updateStudent', () => {
    it('calls api.put with /students/{id} and data', async () => {
      const { default: studentService } = await import('../student')
      const id = '123'
      const data = { name: 'Updated Student' }

      mockPut.mockResolvedValue({ data: { id: '123', name: 'Updated Student' } })

      await studentService.updateStudent(id, data)

      expect(mockPut).toHaveBeenCalledWith('/students/123', data)
    })

    it('returns updated student via toItem', async () => {
      const { default: studentService } = await import('../student')
      const updated = { id: '123', name: 'Updated Student' }

      mockPut.mockResolvedValue(updated)

      const result = await studentService.updateStudent('123', { name: 'Updated Student' })

      expect(result).toBe(updated)
    })
  })

  describe('deleteStudent', () => {
    it('calls api.delete with /students/{id}', async () => {
      const { default: studentService } = await import('../student')
      const id = '123'

      mockDelete.mockResolvedValue(undefined)

      await studentService.deleteStudent(id)

      expect(mockDelete).toHaveBeenCalledWith('/students/123')
    })
  })

  describe('exportStudentPortfolio', () => {
    it('calls api.get with /students/{id}/export and responseType blob', async () => {
      const { default: studentService } = await import('../student')
      const id = '123'

      mockGet.mockResolvedValue(new Blob())

      await studentService.exportStudentPortfolio(id)

      expect(mockGet).toHaveBeenCalledWith('/students/123/export', {
        responseType: 'blob'
      })
    })
  })

  describe('error handling', () => {
    it('getStudents throws on network error', async () => {
      const { default: studentService } = await import('../student')
      mockGet.mockRejectedValue(new Error('Network Error'))
      await expect(studentService.getStudents()).rejects.toThrow('Network Error')
    })

    it('createStudent throws on network error', async () => {
      const { default: studentService } = await import('../student')
      mockPost.mockRejectedValue(new Error('Network Error'))
      await expect(studentService.createStudent({ name: 'New Student', gender: 'male', birth_date: '2020-01-01', grade: '5', class_name: 'A班' })).rejects.toThrow('Network Error')
    })
  })
})
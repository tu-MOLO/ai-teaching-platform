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
}))

describe('report service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboardReport', () => {
    it('calls api.get with /reports/dashboard', async () => {
      const { getDashboardReport } = await import('../report')

      mockGet.mockResolvedValue({ data: { totalCourses: 10 } })

      await getDashboardReport()

      expect(mockGet).toHaveBeenCalledWith('/reports/dashboard')
    })

    it('returns dashboard report data', async () => {
      const { getDashboardReport } = await import('../report')
      const reportData = { totalCourses: 10, totalStudents: 50 }

      mockGet.mockResolvedValue(reportData)

      const result = await getDashboardReport()

      expect(result).toBe(reportData)
    })
  })

  describe('getCourseReport', () => {
    it('calls api.get with /reports/courses', async () => {
      const { getCourseReport } = await import('../report')

      mockGet.mockResolvedValue({ data: { categoryStats: [] } })

      await getCourseReport()

      expect(mockGet).toHaveBeenCalledWith('/reports/courses')
    })

    it('returns course report data', async () => {
      const { getCourseReport } = await import('../report')
      const courseData = { categoryStats: [{ name: 'Math', value: 5, percent: 50, color: '#fff' }] }

      mockGet.mockResolvedValue(courseData)

      const result = await getCourseReport()

      expect(result).toBe(courseData)
    })
  })

  describe('getStudentReport', () => {
    it('calls api.get with /reports/students', async () => {
      const { getStudentReport } = await import('../report')

      mockGet.mockResolvedValue({ data: { gradeDistribution: [] } })

      await getStudentReport()

      expect(mockGet).toHaveBeenCalledWith('/reports/students')
    })

    it('returns student report data', async () => {
      const { getStudentReport } = await import('../report')
      const studentData = { gradeDistribution: [{ grade: 'Grade 1', count: 10, percent: 20, color: '#fff' }] }

      mockGet.mockResolvedValue(studentData)

      const result = await getStudentReport()

      expect(result).toBe(studentData)
    })
  })

  describe('getMonthlyTrends', () => {
    it('calls api.get with /reports/trends and default months=6', async () => {
      const { getMonthlyTrends } = await import('../report')

      mockGet.mockResolvedValue({ data: [] })

      await getMonthlyTrends()

      expect(mockGet).toHaveBeenCalledWith('/reports/trends', { params: { months: 6 } })
    })

    it('calls api.get with custom months param', async () => {
      const { getMonthlyTrends } = await import('../report')

      mockGet.mockResolvedValue({ data: [] })

      await getMonthlyTrends(12)

      expect(mockGet).toHaveBeenCalledWith('/reports/trends', { params: { months: 12 } })
    })

    it('returns monthly trends data', async () => {
      const { getMonthlyTrends } = await import('../report')
      const trendsData = [{ month: '2024-01', newCourses: 5, newStudents: 10, newLessonPlans: 3 }]

      mockGet.mockResolvedValue(trendsData)

      const result = await getMonthlyTrends()

      expect(result).toBe(trendsData)
    })
  })

  describe('reportService default export', () => {
    it('has all expected methods', async () => {
      const { default: reportService } = await import('../report')

      expect(reportService).toHaveProperty('getDashboardReport')
      expect(reportService).toHaveProperty('getCourseReport')
      expect(reportService).toHaveProperty('getStudentReport')
      expect(reportService).toHaveProperty('getMonthlyTrends')
    })
  })

  describe('error handling', () => {
    it('rejects with Network Error when getDashboardReport fails', async () => {
      const { getDashboardReport } = await import('../report')

      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getDashboardReport()).rejects.toThrow('Network Error')
    })
  })
})
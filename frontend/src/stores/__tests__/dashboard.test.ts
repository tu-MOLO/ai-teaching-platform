import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/report', () => ({
  reportService: {
    getDashboardReport: vi.fn(),
    getCourseReport: vi.fn(),
    getStudentReport: vi.fn(),
    getMonthlyTrends: vi.fn(),
  }
}))

import { useDashboardStore } from '../dashboard'
import { reportService } from '../../services/report'

const mockedReportService = vi.mocked(reportService)

const defaultStats = {
  totalCourses: 0,
  courseTrend: '+0%',
  totalStudents: 0,
  studentTrend: '+0%',
  monthlyLessonPlans: 0,
  totalResources: 0,
}

const defaultReportData = {
  dashboardData: null,
  courseData: null,
  studentData: null,
  monthlyTrends: [],
}

describe('useDashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      stats: { ...defaultStats },
      loading: false,
      lastUpdated: null,
      error: null,
      isAutoRefreshing: false,
      refreshIntervalId: null,
      reportData: { ...defaultReportData },
      reportsLoading: false,
      reportsError: null,
      lastFetchTime: null,
    })
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have default zero stats', () => {
      const state = useDashboardStore.getState()
      expect(state.stats).toEqual(defaultStats)
    })

    it('should not be loading', () => {
      expect(useDashboardStore.getState().loading).toBe(false)
    })

    it('should have null lastUpdated', () => {
      expect(useDashboardStore.getState().lastUpdated).toBeNull()
    })

    it('should have null error', () => {
      expect(useDashboardStore.getState().error).toBeNull()
    })

    it('should not be auto-refreshing', () => {
      expect(useDashboardStore.getState().isAutoRefreshing).toBe(false)
    })

    it('should have empty report data', () => {
      const state = useDashboardStore.getState()
      expect(state.reportData).toEqual(defaultReportData)
    })
  })

  describe('fetchStats', () => {
    it('should fetch and set stats from reportService.getDashboardReport', async () => {
      const mockData = {
        totalCourses: 10,
        courseTrend: '+5%',
        totalStudents: 50,
        studentTrend: '+10%',
        monthlyLessonPlans: 20,
        totalResources: 100,
        activeCourses: 8,
        averageProgress: 0.75,
        recentActivities: [],
      }
      mockedReportService.getDashboardReport.mockResolvedValueOnce(mockData)

      await useDashboardStore.getState().fetchStats()

      const state = useDashboardStore.getState()
      expect(state.stats.totalCourses).toBe(10)
      expect(state.stats.courseTrend).toBe('+5%')
      expect(state.stats.totalStudents).toBe(50)
      expect(state.stats.studentTrend).toBe('+10%')
      expect(state.stats.monthlyLessonPlans).toBe(20)
      expect(state.stats.totalResources).toBe(100)
      expect(state.lastUpdated).not.toBeNull()
    })

    it('should set loading true during fetch, false after', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockedReportService.getDashboardReport.mockReturnValueOnce(pendingPromise as never)

      const fetchPromise = useDashboardStore.getState().fetchStats()

      expect(useDashboardStore.getState().loading).toBe(true)

      resolvePromise!({
        totalCourses: 1,
        courseTrend: '+0%',
        totalStudents: 1,
        studentTrend: '+0%',
        monthlyLessonPlans: 0,
        totalResources: 0,
        activeCourses: 1,
        averageProgress: 0,
        recentActivities: [],
      })

      await fetchPromise

      expect(useDashboardStore.getState().loading).toBe(false)
    })

    it('should set error on fetch failure', async () => {
      mockedReportService.getDashboardReport.mockRejectedValueOnce(new Error('Network error'))

      await useDashboardStore.getState().fetchStats()

      const state = useDashboardStore.getState()
      expect(state.error).toBe('获取仪表盘数据失败')
      expect(state.loading).toBe(false)
    })

    it('should skip fetch if already loading', async () => {
      useDashboardStore.setState({ loading: true })

      await useDashboardStore.getState().fetchStats()

      expect(mockedReportService.getDashboardReport).not.toHaveBeenCalled()
    })

    it('should skip fetch if cache valid', async () => {
      vi.useFakeTimers()

      useDashboardStore.setState({ lastUpdated: Date.now() })

      await useDashboardStore.getState().fetchStats()

      expect(mockedReportService.getDashboardReport).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should fetch if cache expired', async () => {
      vi.useFakeTimers()

      useDashboardStore.setState({ lastUpdated: Date.now() })

      vi.advanceTimersByTime(31000)

      mockedReportService.getDashboardReport.mockResolvedValueOnce({
        totalCourses: 5,
        courseTrend: '+2%',
        totalStudents: 20,
        studentTrend: '+3%',
        monthlyLessonPlans: 10,
        totalResources: 50,
        activeCourses: 5,
        averageProgress: 0.8,
        recentActivities: [],
      })

      await useDashboardStore.getState().fetchStats()

      expect(mockedReportService.getDashboardReport).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should fetch when force=true ignores cache', async () => {
      useDashboardStore.setState({ lastUpdated: Date.now() })

      mockedReportService.getDashboardReport.mockResolvedValueOnce({
        totalCourses: 5,
        courseTrend: '+2%',
        totalStudents: 20,
        studentTrend: '+3%',
        monthlyLessonPlans: 10,
        totalResources: 50,
        activeCourses: 5,
        averageProgress: 0.8,
        recentActivities: [],
      })

      await useDashboardStore.getState().fetchStats(true)

      expect(mockedReportService.getDashboardReport).toHaveBeenCalled()
    })
  })

  describe('refreshStats', () => {
    it('should call fetchStats with force=true', async () => {
      useDashboardStore.setState({ lastUpdated: Date.now() })

      mockedReportService.getDashboardReport.mockResolvedValueOnce({
        totalCourses: 5,
        courseTrend: '+2%',
        totalStudents: 20,
        studentTrend: '+3%',
        monthlyLessonPlans: 10,
        totalResources: 50,
        activeCourses: 5,
        averageProgress: 0.8,
        recentActivities: [],
      })

      await useDashboardStore.getState().refreshStats()

      expect(mockedReportService.getDashboardReport).toHaveBeenCalled()
    })
  })

  describe('updateStats', () => {
    it('should merge partial stats and update lastUpdated', () => {
      useDashboardStore.getState().updateStats({ totalCourses: 15, totalStudents: 100 })

      const state = useDashboardStore.getState()
      expect(state.stats.totalCourses).toBe(15)
      expect(state.stats.totalStudents).toBe(100)
      expect(state.stats.courseTrend).toBe('+0%')
      expect(state.stats.monthlyLessonPlans).toBe(0)
      expect(state.lastUpdated).not.toBeNull()
    })
  })

  describe('resetStats', () => {
    it('should reset all state to defaults', () => {
      useDashboardStore.setState({
        stats: { totalCourses: 10, courseTrend: '+5%', totalStudents: 50, studentTrend: '+10%', monthlyLessonPlans: 20, totalResources: 100 },
        loading: true,
        lastUpdated: Date.now(),
        error: 'some error',
        isAutoRefreshing: true,
        reportData: {
          dashboardData: {} as never,
          courseData: {} as never,
          studentData: {} as never,
          monthlyTrends: [{ month: '2024-01' } as never],
        },
        reportsLoading: true,
        reportsError: 'report error',
        lastFetchTime: Date.now(),
      })

      useDashboardStore.getState().resetStats()

      const state = useDashboardStore.getState()
      expect(state.stats).toEqual(defaultStats)
      expect(state.loading).toBe(false)
      expect(state.lastUpdated).toBeNull()
      expect(state.error).toBeNull()
      expect(state.isAutoRefreshing).toBe(false)
      expect(state.refreshIntervalId).toBeNull()
      expect(state.reportData).toEqual(defaultReportData)
      expect(state.reportsLoading).toBe(false)
      expect(state.reportsError).toBeNull()
      expect(state.lastFetchTime).toBeNull()
    })
  })

  describe('fetchReports', () => {
    it('should fetch all 4 report types and set reportData', async () => {
      const mockDashboard = { totalCourses: 10 }
      const mockCourses = { courses: [] }
      const mockStudents = { students: [] }
      const mockTrends = [{ month: '2024-01', count: 5 }]

      mockedReportService.getDashboardReport.mockResolvedValueOnce(mockDashboard as never)
      mockedReportService.getCourseReport.mockResolvedValueOnce(mockCourses as never)
      mockedReportService.getStudentReport.mockResolvedValueOnce(mockStudents as never)
      mockedReportService.getMonthlyTrends.mockResolvedValueOnce(mockTrends as never)

      await useDashboardStore.getState().fetchReports()

      const state = useDashboardStore.getState()
      expect(state.reportData.dashboardData).toEqual(mockDashboard)
      expect(state.reportData.courseData).toEqual(mockCourses)
      expect(state.reportData.studentData).toEqual(mockStudents)
      expect(state.reportData.monthlyTrends).toEqual(mockTrends)
      expect(state.lastFetchTime).not.toBeNull()
      expect(state.reportsLoading).toBe(false)
    })

    it('should set reportsError on failure', async () => {
      mockedReportService.getDashboardReport.mockRejectedValueOnce(new Error('Failed'))

      await useDashboardStore.getState().fetchReports()

      const state = useDashboardStore.getState()
      expect(state.reportsError).toBe('获取报告数据失败')
      expect(state.reportsLoading).toBe(false)
    })

    it('should skip if reportsLoading', async () => {
      useDashboardStore.setState({ reportsLoading: true })

      await useDashboardStore.getState().fetchReports()

      expect(mockedReportService.getDashboardReport).not.toHaveBeenCalled()
    })
  })

  describe('startAutoRefresh', () => {
    it('should set isAutoRefreshing true', () => {
      mockedReportService.getDashboardReport.mockResolvedValue({} as never)
      mockedReportService.getCourseReport.mockResolvedValue({} as never)
      mockedReportService.getStudentReport.mockResolvedValue({} as never)
      mockedReportService.getMonthlyTrends.mockResolvedValue([] as never)

      useDashboardStore.getState().startAutoRefresh()

      expect(useDashboardStore.getState().isAutoRefreshing).toBe(true)

      useDashboardStore.getState().stopAutoRefresh()
    })
  })

  describe('stopAutoRefresh', () => {
    it('should set isAutoRefreshing false and clear interval', () => {
      mockedReportService.getDashboardReport.mockResolvedValue({} as never)
      mockedReportService.getCourseReport.mockResolvedValue({} as never)
      mockedReportService.getStudentReport.mockResolvedValue({} as never)
      mockedReportService.getMonthlyTrends.mockResolvedValue([] as never)

      useDashboardStore.getState().startAutoRefresh()
      expect(useDashboardStore.getState().isAutoRefreshing).toBe(true)

      useDashboardStore.getState().stopAutoRefresh()

      const state = useDashboardStore.getState()
      expect(state.isAutoRefreshing).toBe(false)
      expect(state.refreshIntervalId).toBeNull()
    })
  })
})

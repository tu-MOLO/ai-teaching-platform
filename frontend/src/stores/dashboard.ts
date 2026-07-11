import { create } from 'zustand'
import {
  reportService,
  type DashboardReport,
  type CourseReport,
  type StudentReport,
  type MonthlyTrendItem,
} from '../services/report'

interface DashboardStats {
  totalCourses: number
  courseTrend: string
  totalStudents: number
  studentTrend: string
  monthlyLessonPlans: number
  totalResources: number
}

interface ReportData {
  dashboardData: DashboardReport | null
  courseData: CourseReport | null
  studentData: StudentReport | null
  monthlyTrends: MonthlyTrendItem[]
}

interface DashboardState {
  stats: DashboardStats
  loading: boolean
  lastUpdated: number | null
  error: string | null
  isAutoRefreshing: boolean
  refreshIntervalId: number | null

  reportData: ReportData
  reportsLoading: boolean
  reportsError: string | null
  lastFetchTime: number | null

  fetchStats: (force?: boolean) => Promise<void>
  refreshStats: () => Promise<void>
  updateStats: (partialStats: Partial<DashboardStats>) => void
  resetStats: () => void
  startAutoRefresh: () => void
  stopAutoRefresh: () => void

  fetchReports: (force?: boolean) => Promise<void>
  refreshReports: () => Promise<void>
}

const defaultStats: DashboardStats = {
  totalCourses: 0,
  courseTrend: '+0%',
  totalStudents: 0,
  studentTrend: '+0%',
  monthlyLessonPlans: 0,
  totalResources: 0
}

const defaultReportData: ReportData = {
  dashboardData: null,
  courseData: null,
  studentData: null,
  monthlyTrends: []
}

const AUTO_REFRESH_INTERVAL = 60 * 1000
const CACHE_DURATION = 30 * 1000

export const useDashboardStore = create<DashboardState>((set, get) => ({
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

  fetchStats: async (force = false) => {
    const { loading, lastUpdated } = get()
    if (loading) return
    if (!force && lastUpdated) {
      const now = Date.now()
      if (now - lastUpdated < CACHE_DURATION) {
        return
      }
    }

    set({ loading: true, error: null })

    try {
      const dashboardData = await reportService.getDashboardReport()

      set({
        stats: {
          totalCourses: dashboardData.totalCourses || 0,
          courseTrend: dashboardData.courseTrend || '+0%',
          totalStudents: dashboardData.totalStudents || 0,
          studentTrend: dashboardData.studentTrend || '+0%',
          monthlyLessonPlans: dashboardData.monthlyLessonPlans || 0,
          totalResources: dashboardData.totalResources || 0
        },
        lastUpdated: Date.now(),
        loading: false
      })
    } catch (error) {
      set({
        error: '获取仪表盘数据失败',
        loading: false
      })
      console.error('Failed to fetch dashboard data:', error)
    }
  },

  refreshStats: async () => {
    await get().fetchStats(true)
  },

  updateStats: (partialStats: Partial<DashboardStats>) => {
    set((state) => ({
      stats: { ...state.stats, ...partialStats },
      lastUpdated: Date.now()
    }))
  },

  resetStats: () => {
    const { refreshIntervalId } = get()
    if (refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }
    set({
      stats: { ...defaultStats },
      loading: false,
      lastUpdated: null,
      error: null,
      isAutoRefreshing: false,
      refreshIntervalId: null,
      reportData: { ...defaultReportData },
      reportsLoading: false,
      reportsError: null,
      lastFetchTime: null
    })
  },

  startAutoRefresh: () => {
    const { isAutoRefreshing, refreshIntervalId } = get()

    if (isAutoRefreshing && refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }

    get().fetchStats()
    get().fetchReports()

    const intervalId = window.setInterval(() => {
      const { loading, reportsLoading } = get()
      if (!loading) {
        get().fetchStats()
      }
      if (!reportsLoading) {
        get().fetchReports()
      }
    }, AUTO_REFRESH_INTERVAL)

    set({
      isAutoRefreshing: true,
      refreshIntervalId: intervalId
    })
  },

  stopAutoRefresh: () => {
    const { refreshIntervalId } = get()
    if (refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }
    set({
      isAutoRefreshing: false,
      refreshIntervalId: null
    })
  },

  fetchReports: async (force = false) => {
    const { reportsLoading, lastFetchTime } = get()
    if (reportsLoading) return
    if (!force && lastFetchTime) {
      const now = Date.now()
      if (now - lastFetchTime < CACHE_DURATION) {
        return
      }
    }

    set({ reportsLoading: true, reportsError: null })

    try {
      // 使用 allSettled 容错：单个接口失败不应导致全部报告数据丢失
      const [dashboardRes, coursesRes, studentsRes, trendsRes] = await Promise.allSettled([
        reportService.getDashboardReport(),
        reportService.getCourseReport(),
        reportService.getStudentReport(),
        reportService.getMonthlyTrends(7)
      ])

      const prev = get().reportData
      const dashboardData = dashboardRes.status === 'fulfilled' ? dashboardRes.value : prev.dashboardData
      const courseData = coursesRes.status === 'fulfilled' ? coursesRes.value : prev.courseData
      const studentData = studentsRes.status === 'fulfilled' ? studentsRes.value : prev.studentData
      const monthlyTrends = trendsRes.status === 'fulfilled' ? trendsRes.value : prev.monthlyTrends

      const hasFailure = [dashboardRes, coursesRes, studentsRes, trendsRes].some(
        (r) => r.status === 'rejected'
      )

      set({
        reportData: {
          dashboardData,
          courseData,
          studentData,
          monthlyTrends
        },
        lastFetchTime: Date.now(),
        reportsLoading: false,
        reportsError: hasFailure && !dashboardData && !courseData && !studentData
          ? '获取报告数据失败'
          : null
      })

      if (hasFailure) {
        const failedNames: string[] = []
        if (dashboardRes.status === 'rejected') failedNames.push('仪表盘')
        if (coursesRes.status === 'rejected') failedNames.push('课程')
        if (studentsRes.status === 'rejected') failedNames.push('学生')
        if (trendsRes.status === 'rejected') failedNames.push('趋势')
        console.warn('部分报告接口请求失败:', failedNames.join(', '))
      }
    } catch (error) {
      set({
        reportsError: '获取报告数据失败',
        reportsLoading: false
      })
      console.error('Failed to fetch report data:', error)
    }
  },

  refreshReports: async () => {
    await get().fetchReports(true)
  }
}))

export const refreshDashboardStats = () => {
  useDashboardStore.getState().refreshStats()
}
import { create } from 'zustand'
import { reportService } from '../services/report'

interface DashboardStats {
  totalCourses: number
  courseTrend: string
  totalStudents: number
  studentTrend: string
  monthlyLessonPlans: number
  totalResources: number
}

interface DashboardState {
  stats: DashboardStats
  loading: boolean
  lastUpdated: number | null
  error: string | null
  isAutoRefreshing: boolean
  refreshIntervalId: number | null

  // Actions
  fetchStats: (force?: boolean) => Promise<void>
  refreshStats: () => Promise<void>
  updateStats: (partialStats: Partial<DashboardStats>) => void
  resetStats: () => void
  startAutoRefresh: () => void
  stopAutoRefresh: () => void
}

const defaultStats: DashboardStats = {
  totalCourses: 0,
  courseTrend: '+0%',
  totalStudents: 0,
  studentTrend: '+0%',
  monthlyLessonPlans: 0,
  totalResources: 0
}

// 自动刷新间隔（毫秒）- 60秒
const AUTO_REFRESH_INTERVAL = 60 * 1000

// 缓存时间（毫秒）- 30秒内不重复请求
const CACHE_DURATION = 30 * 1000

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: { ...defaultStats },
  loading: false,
  lastUpdated: null,
  error: null,
  isAutoRefreshing: false,
  refreshIntervalId: null,

  fetchStats: async (force = false) => {
    const { loading, lastUpdated } = get()

    // 如果正在加载，不重复请求
    if (loading) return

    // 如果不是强制刷新，且缓存未过期，使用缓存数据
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
    // 清除定时器
    if (refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }
    set({
      stats: { ...defaultStats },
      loading: false,
      lastUpdated: null,
      error: null,
      isAutoRefreshing: false,
      refreshIntervalId: null
    })
  },

  startAutoRefresh: () => {
    const { isAutoRefreshing, refreshIntervalId } = get()
    
    // 如果已经在自动刷新，先停止
    if (isAutoRefreshing && refreshIntervalId) {
      window.clearInterval(refreshIntervalId)
    }

    // 立即执行一次刷新
    get().fetchStats()

    // 设置定时刷新
    const intervalId = window.setInterval(() => {
      const { loading } = get()
      // 如果当前没有在加载，才执行刷新
      if (!loading) {
        get().fetchStats()
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
  }
}))

// 导出便捷的刷新函数，供其他模块使用
export const refreshDashboardStats = () => {
  useDashboardStore.getState().refreshStats()
}

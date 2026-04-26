import api from './api'
import { toItem } from './response'

/**
 * 活动项接口
 */
export interface ActivityItem {
  id: string
  title: string
  description: string
  icon: string
  time: string
  desc?: string
  color?: string
}

/**
 * 仪表盘报告
 */
export interface DashboardReport {
  totalCourses: number
  totalStudents: number
  activeCourses: number
  averageProgress: number
  courseTrend: string
  studentTrend: string
  recentActivities: ActivityItem[]
  monthlyCourses?: number
  monthlyStudents?: number
  completionRate?: number
  aiAssistants?: number
  monthlyLessonPlans?: number
  draftLessonPlans?: number
  totalResources?: number
}

/**
 * 课程分类统计项
 */
export interface CategoryStat {
  name: string
  value: number
  percent: number
  color: string
}

/**
 * 课程报告
 */
export interface CourseReport {
  categoryStats: CategoryStat[]
}

/**
 * 年级分布项
 */
export interface GradeDistribution {
  grade: string
  count: number
  percent: number
  color: string
}

/**
 * 学生报告
 */
export interface StudentReport {
  gradeDistribution: GradeDistribution[]
}

/**
 * 月度趋势数据项
 */
export interface MonthlyTrendItem {
  month: string
  newCourses: number
  newStudents: number
  newLessonPlans: number
}

/**
 * 获取仪表盘报告
 */
export const getDashboardReport = async (): Promise<DashboardReport> => {
  const response = await api.get('/reports/dashboard')
  return toItem<DashboardReport>(response)
}

/**
 * 获取课程报告
 */
export const getCourseReport = async (): Promise<CourseReport> => {
  const response = await api.get('/reports/courses')
  return toItem<CourseReport>(response)
}

/**
 * 获取学生报告
 */
export const getStudentReport = async (): Promise<StudentReport> => {
  const response = await api.get('/reports/students')
  return toItem<StudentReport>(response)
}

/**
 * 获取月度教学趋势
 * @param months 查询月数（默认6个月）
 */
export const getMonthlyTrends = async (months: number = 6): Promise<MonthlyTrendItem[]> => {
  const response = await api.get('/reports/trends', { params: { months } })
  return toItem<MonthlyTrendItem[]>(response)
}

// 导出默认对象
export const reportService = {
  getDashboardReport,
  getCourseReport,
  getStudentReport,
  getMonthlyTrends
}

export default reportService

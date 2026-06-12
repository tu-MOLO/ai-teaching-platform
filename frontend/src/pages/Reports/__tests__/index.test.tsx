import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

let mockReportsLoading = false
let mockReportsError: string | null = null
let mockReportData: any = {
  dashboardData: { totalCourses: 10, totalStudents: 200, courseTrend: '+5%', studentTrend: '+8%', recentActivities: [] as any[], monthlyLessonPlans: 5, totalResources: 30 },
  courseData: { categoryStats: [] as any[] },
  studentData: { gradeDistribution: [] as any[] },
  monthlyTrends: [] as any[],
}

vi.mock('../../../stores/dashboard', () => ({
  useDashboardStore: () => ({
    reportData: mockReportData,
    reportsLoading: mockReportsLoading,
    reportsError: mockReportsError,
    fetchReports: vi.fn(),
  }),
}))

vi.mock('echarts', () => ({
  init: () => ({
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
  }),
  graphic: { LinearGradient: vi.fn() },
}))

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    BookOutlined: icon('BookOutlined'),
    UserOutlined: icon('UserOutlined'),
    RiseOutlined: icon('RiseOutlined'),
    FallOutlined: icon('FallOutlined'),
    ClockCircleOutlined: icon('ClockCircleOutlined'),
    FileTextOutlined: icon('FileTextOutlined'),
    TrophyOutlined: icon('TrophyOutlined'),
    TeamOutlined: icon('TeamOutlined'),
    BarChartOutlined: icon('BarChartOutlined'),
    PieChartOutlined: icon('PieChartOutlined'),
    LineChartOutlined: icon('LineChartOutlined'),
    CalendarOutlined: icon('CalendarOutlined'),
    FileImageOutlined: icon('FileImageOutlined'),
    VideoCameraOutlined: icon('VideoCameraOutlined'),
    EditOutlined: icon('EditOutlined'),
    PlusCircleOutlined: icon('PlusCircleOutlined'),
    CheckCircleOutlined: icon('CheckCircleOutlined'),
    StarOutlined: icon('StarOutlined'),
    FundOutlined: icon('FundOutlined'),
  }
})

const Reports = (await import('../index')).default

describe('Reports page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReportsLoading = false
    mockReportsError = null
    mockReportData = {
      dashboardData: { totalCourses: 10, totalStudents: 200, courseTrend: '+5%', studentTrend: '+8%', recentActivities: [], monthlyLessonPlans: 5, totalResources: 30 },
      courseData: { categoryStats: [] },
      studentData: { gradeDistribution: [] },
      monthlyTrends: [],
    }
  })

  it('should render reports page', () => {
    render(React.createElement(Reports))
    expect(screen.getByText('教学数据分析报告')).toBeInTheDocument()
  })

  it('should display report sections', () => {
    render(React.createElement(Reports))
    expect(screen.getByText('课程分类统计')).toBeInTheDocument()
    expect(screen.getByText('学生年级分布')).toBeInTheDocument()
    expect(screen.getByText('月度教学趋势')).toBeInTheDocument()
  })

  it('should display stat cards', () => {
    render(React.createElement(Reports))
    expect(screen.getByText('总课程数')).toBeInTheDocument()
    expect(screen.getByText('总学生数')).toBeInTheDocument()
  })

  it('should display monthly trends section', () => {
    render(React.createElement(Reports))
    expect(screen.getByText('月度教学趋势')).toBeInTheDocument()
  })

  it('should display recent activities section', () => {
    render(React.createElement(Reports))
    expect(screen.getByText('最近活动')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    mockReportsLoading = true
    mockReportData = { dashboardData: null, courseData: null, studentData: null, monthlyTrends: [] }
    render(React.createElement(Reports))
    expect(screen.getByText('加载报告数据中...')).toBeInTheDocument()
  })

  it('should display error state', () => {
    mockReportsError = '加载失败'
    mockReportData = { dashboardData: null, courseData: null, studentData: null, monthlyTrends: [] }
    render(React.createElement(Reports))
    expect(screen.getByText('加载失败')).toBeInTheDocument()
  })

  it('should display charts with data', () => {
    mockReportData = {
      dashboardData: { totalCourses: 10, totalStudents: 200, courseTrend: '+5%', studentTrend: '+8%', recentActivities: [{ icon: 'BookOutlined', title: 'T1', desc: 'D1', time: '1分钟前', color: '#000' }], monthlyLessonPlans: 5, totalResources: 30 },
      courseData: { categoryStats: [{ name: 'A', value: 1, color: '#000' }] },
      studentData: { gradeDistribution: [{ grade: '7', count: 10, color: '#000' }] },
      monthlyTrends: [{ month: '2024-01', newCourses: 1, newStudents: 1, newLessonPlans: 1 }],
    }
    render(React.createElement(Reports))
    expect(screen.getByText('教学数据分析报告')).toBeInTheDocument()
  })
})
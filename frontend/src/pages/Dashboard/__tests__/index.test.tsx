import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()
const mockFetchStats = vi.fn()
const mockRefreshStats = vi.fn()

let mockDashboardLoading = false
let mockDashboardStats = { totalCourses: 5, totalStudents: 100, monthlyLessonPlans: 3, totalResources: 20 }

vi.mock('../../../stores/dashboard', () => ({
  useDashboardStore: () => ({
    stats: mockDashboardStats,
    loading: mockDashboardLoading,
    fetchStats: mockFetchStats,
    refreshStats: mockRefreshStats,
  }),
}))

let mockNotificationsData: any[] = []

vi.mock('../../../services/notification', () => ({
  getNotifications: vi.fn().mockImplementation(() => Promise.resolve({ data: mockNotificationsData })),
  NotificationType: { SYSTEM: 'system', COURSE: 'course', HOMEWORK: 'homework', EXAM: 'exam', MESSAGE: 'message', REMINDER: 'reminder' },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    BookOutlined: icon('BookOutlined'),
    UserOutlined: icon('UserOutlined'),
    RocketOutlined: icon('RocketOutlined'),
    PlusOutlined: icon('PlusOutlined'),
    UserAddOutlined: icon('UserAddOutlined'),
    FileTextOutlined: icon('FileTextOutlined'),
    GiftOutlined: icon('GiftOutlined'),
    ToolOutlined: icon('ToolOutlined'),
    TrophyOutlined: icon('TrophyOutlined'),
    CalendarOutlined: icon('CalendarOutlined'),
    BellOutlined: icon('BellOutlined'),
    InfoCircleOutlined: icon('InfoCircleOutlined'),
    ReloadOutlined: icon('ReloadOutlined'),
    DashboardOutlined: icon('DashboardOutlined'),
    ThunderboltOutlined: icon('ThunderboltOutlined'),
    NotificationOutlined: icon('NotificationOutlined'),
  }
})

vi.mock('../../../components/Common/ConfigurableSelect', () => ({
  default: (props: any) => React.createElement('select', { ...props, 'data-testid': 'configurable-select' }),
}))

const Dashboard = (await import('../index')).default

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDashboardLoading = false
    mockDashboardStats = { totalCourses: 5, totalStudents: 100, monthlyLessonPlans: 3, totalResources: 20 }
    mockNotificationsData = []
  })

  it('should render dashboard page without crashing', () => {
    render(React.createElement(Dashboard))
    expect(screen.getByText('工作台')).toBeInTheDocument()
  })

  it('should display stat cards', () => {
    render(React.createElement(Dashboard))
    expect(screen.getByText('总课程数')).toBeInTheDocument()
    expect(screen.getByText('总学生数')).toBeInTheDocument()
    expect(screen.getByText('本月教案')).toBeInTheDocument()
    expect(screen.getByText('我的资源')).toBeInTheDocument()
  })

  it('should display quick actions', () => {
    render(React.createElement(Dashboard))
    expect(screen.getByText('创建新课程')).toBeInTheDocument()
    expect(screen.getByText('添加学生')).toBeInTheDocument()
    expect(screen.getByText('查看报告')).toBeInTheDocument()
  })

  it('should display system notifications section', () => {
    render(React.createElement(Dashboard))
    expect(screen.getByText('系统通知')).toBeInTheDocument()
  })

  it('should navigate on stat card click', () => {
    render(React.createElement(Dashboard))
    fireEvent.click(screen.getByText('总课程数'))
    expect(mockNavigate).toHaveBeenCalledWith('/courses')
  })

  it('should navigate on quick action click', () => {
    render(React.createElement(Dashboard))
    fireEvent.click(screen.getByText('创建新课程'))
    expect(mockNavigate).toHaveBeenCalledWith('/courses/create')
  })

  it('should display loading state', () => {
    mockDashboardLoading = true
    mockDashboardStats = { totalCourses: 0, totalStudents: 0, monthlyLessonPlans: 0, totalResources: 0 }
    render(React.createElement(Dashboard))
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('should display notifications with data', async () => {
    mockNotificationsData = [
      { id: 'n1', title: '通知1', content: '内容1', type: 'system', created_at: new Date().toISOString() },
    ]
    render(React.createElement(Dashboard))
    await waitFor(() => expect(screen.getByText('通知1')).toBeInTheDocument())
  })
})
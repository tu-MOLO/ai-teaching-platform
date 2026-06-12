import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()
const mockGetLessonPlans = vi.fn().mockResolvedValue({ data: [], total: 0 })
const mockDeleteLessonPlan = vi.fn().mockResolvedValue({})
const mockPublishLessonPlan = vi.fn().mockResolvedValue({})
const mockUnpublishLessonPlan = vi.fn().mockResolvedValue({})
const mockArchiveLessonPlan = vi.fn().mockResolvedValue({})
const mockRestoreLessonPlan = vi.fn().mockResolvedValue({})

vi.mock('../../services/lessonPlan', () => ({
  getLessonPlans: (...args: any[]) => mockGetLessonPlans(...args),
  deleteLessonPlan: (...args: any[]) => mockDeleteLessonPlan(...args),
  publishLessonPlan: (...args: any[]) => mockPublishLessonPlan(...args),
  unpublishLessonPlan: (...args: any[]) => mockUnpublishLessonPlan(...args),
  archiveLessonPlan: (...args: any[]) => mockArchiveLessonPlan(...args),
  restoreLessonPlan: (...args: any[]) => mockRestoreLessonPlan(...args),
}))

vi.mock('../../stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ status: 'draft' }),
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('antd', () => {
  const TableComp = ({ dataSource, columns: _columns, loading }: any) =>
    React.createElement('div', { 'data-testid': 'table' },
      React.createElement('span', { 'data-testid': 'table-loading' }, String(loading)),
      React.createElement('span', { 'data-testid': 'table-count' }, String(dataSource?.length || 0)),
    )
  const SearchComp = ({ placeholder, onChange, onSearch: _onSearch }: any) =>
    React.createElement('input', { placeholder, 'data-testid': 'search-input', onChange: (e: any) => onChange?.(e) })
  const EmptyComp = ({ description, image: _image }: any) =>
    React.createElement('div', { 'data-testid': 'empty' }, typeof description === 'object' ? '' : description)

  return {
    Card: ({ children, title: _title, className }: any) =>
      React.createElement('div', { 'data-testid': 'card', className }, children),
    Button: ({ children, onClick, type, ...props }: any) =>
      React.createElement('button', { onClick, 'data-testid': `btn-${children}`, ...props }, children),
    Table: TableComp,
    Space: ({ children, size: _size }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
    Tag: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Search: SearchComp }
    ),
    Modal: Object.assign(
      ({ children, open }: any) => (open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null),
      { confirm: vi.fn() }
    ),
    Empty: Object.assign(EmptyComp, { PRESENTED_IMAGE_SIMPLE: 'simple' }),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    PlusOutlined: icon('PlusOutlined'),
    EditOutlined: icon('EditOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    EyeOutlined: icon('EyeOutlined'),
    SearchOutlined: icon('SearchOutlined'),
    FileTextOutlined: icon('FileTextOutlined'),
    ClockCircleOutlined: icon('ClockCircleOutlined'),
    UserOutlined: icon('UserOutlined'),
    CheckCircleOutlined: icon('CheckCircleOutlined'),
    ArrowLeftOutlined: icon('ArrowLeftOutlined'),
    CloseCircleOutlined: icon('CloseCircleOutlined'),
    InboxOutlined: icon('InboxOutlined'),
    RollbackOutlined: icon('RollbackOutlined'),
  }
})

const LessonPlanList = (await import('../List')).default

describe('LessonPlanList page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render lesson plan list page', () => {
    render(React.createElement(LessonPlanList))
    expect(screen.getByText('草稿箱')).toBeInTheDocument()
  })

  it('should display 新建教案 button', () => {
    render(React.createElement(LessonPlanList))
    expect(screen.getByText('新建教案')).toBeInTheDocument()
  })

  it('should display search input', () => {
    render(React.createElement(LessonPlanList))
    expect(screen.getByPlaceholderText('搜索教案标题或学科...')).toBeInTheDocument()
  })

  it('should switch to card view', () => {
    render(React.createElement(LessonPlanList))
    fireEvent.click(screen.getByText('卡片'))
    expect(screen.getByText('卡片')).toBeInTheDocument()
  })

  it('should navigate on new lesson plan click', () => {
    render(React.createElement(LessonPlanList))
    fireEvent.click(screen.getByText('新建教案'))
    expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner/create')
  })
})
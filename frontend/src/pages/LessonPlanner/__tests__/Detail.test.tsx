import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import LessonPlanDetail from '../Detail'

const mockNavigate = vi.fn()
let lessonPlanMockStatus = 'draft'

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'lp-1' }),
}))

vi.mock('@/services/lessonPlan', () => {
  const getData = () => ({
    id: 'lp-1',
    title: '教案1',
    subject: 'Math',
    grade: '一年级',
    duration: 40,
    status: lessonPlanMockStatus,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    teaching_objectives: 'obj',
    teaching_content: 'content',
    teaching_methods: 'methods',
    teaching_process: 'process',
    teaching_resources: 'resources',
    notes: 'notes',
  })
  return {
    getLessonPlan: vi.fn().mockImplementation(() => Promise.resolve(getData())),
    deleteLessonPlan: vi.fn().mockResolvedValue({}),
    publishLessonPlan: vi.fn().mockImplementation(() => { lessonPlanMockStatus = 'published'; return Promise.resolve({}) }),
    unpublishLessonPlan: vi.fn().mockImplementation(() => { lessonPlanMockStatus = 'draft'; return Promise.resolve({}) }),
    archiveLessonPlan: vi.fn().mockImplementation(() => { lessonPlanMockStatus = 'archived'; return Promise.resolve({}) }),
    restoreLessonPlan: vi.fn().mockImplementation(() => { lessonPlanMockStatus = 'draft'; return Promise.resolve({}) }),
  }
})

vi.mock('@/stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('antd', () => ({
  Card: ({ children, title, extra }: any) =>
    React.createElement('div', { 'data-testid': 'card' }, title, extra, children),
  Button: ({ children, onClick }: any) =>
    React.createElement('button', { onClick, 'data-testid': `btn-${children}` }, children),
  Descriptions: Object.assign(
    ({ children }: any) => React.createElement('div', { 'data-testid': 'descriptions' }, children),
    {
      Item: ({ children, label }: any) =>
        React.createElement('div', { 'data-testid': `desc-${label}` }, label, children),
    }
  ),
  Tag: ({ children, color }: any) =>
    React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  Modal: Object.assign(
    () => null,
    { confirm: ({ onOk }: any) => onOk?.() }
  ),
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  EditOutlined: () => React.createElement('span', null, 'Edit'),
  DeleteOutlined: () => React.createElement('span', null, 'Delete'),
  ArrowLeftOutlined: () => React.createElement('span', null, 'Back'),
  FileTextOutlined: () => React.createElement('span', null, 'File'),
  CheckCircleOutlined: () => React.createElement('span', null, 'Check'),
  InboxOutlined: () => React.createElement('span', null, 'Inbox'),
  UndoOutlined: () => React.createElement('span', null, 'Undo'),
  CloseCircleOutlined: () => React.createElement('span', null, 'Close'),
}))

describe('LessonPlanDetail', () => {
  beforeEach(() => {
    lessonPlanMockStatus = 'draft'
    vi.clearAllMocks()
  })

  it('renders detail after loading', async () => {
    render(React.createElement(LessonPlanDetail))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByText('教案1')).toBeInTheDocument()
  })

  it('publishes lesson plan', async () => {
    render(React.createElement(LessonPlanDetail))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-标记完成'))
    await waitFor(() => expect(screen.getByTestId('btn-取消完成')).toBeInTheDocument())
  })

  it('navigates back', async () => {
    render(React.createElement(LessonPlanDetail))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-返回'))
    expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner')
  })

  it('deletes lesson plan', async () => {
    render(React.createElement(LessonPlanDetail))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-删除'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner'))
  })

  it('edits lesson plan', async () => {
    render(React.createElement(LessonPlanDetail))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-编辑'))
    expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner/lp-1/edit')
  })

  it('archives lesson plan after published', async () => {
    render(React.createElement(LessonPlanDetail))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-标记完成'))
    await waitFor(() => expect(screen.getByTestId('btn-归档')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-归档'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner'))
  })
})

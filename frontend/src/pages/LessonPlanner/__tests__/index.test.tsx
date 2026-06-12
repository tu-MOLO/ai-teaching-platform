import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import LessonPlanner from '../index'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/services/lessonPlan', () => ({
  getLessonPlans: vi.fn().mockResolvedValue({ total: 5 }),
}))

vi.mock('antd', () => ({
  Card: ({ children, className }: any) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  PlusOutlined: () => React.createElement('span', null, 'Plus'),
  FileTextOutlined: () => React.createElement('span', null, 'File'),
  CheckCircleOutlined: () => React.createElement('span', null, 'Check'),
  InboxOutlined: () => React.createElement('span', null, 'Inbox'),
  ArrowRightOutlined: () => React.createElement('span', null, 'Arrow'),
}))

describe('LessonPlanner', () => {
  it('renders status cards', async () => {
    render(React.createElement(LessonPlanner))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByText('教案中心')).toBeInTheDocument()
    expect(screen.getByText('草稿箱')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('已归档')).toBeInTheDocument()
  })

  it('navigates to create page', async () => {
    render(React.createElement(LessonPlanner))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('新建教案'))
    expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner/create')
  })

  it('navigates to list page on card click', async () => {
    render(React.createElement(LessonPlanner))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    const draftCard = screen.getByText('草稿箱').closest('div') as HTMLElement
    fireEvent.click(draftCard)
    expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner/list/draft')
  })
})

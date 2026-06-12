import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import EditCourse from '../Edit'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'course-1' }),
}))

vi.mock('../../services/course', () => ({
  getCourse: vi.fn().mockResolvedValue({
    id: 'course-1',
    name: 'Course',
    subject: 'Math',
    grade: '一年级',
    schedule: '',
    status: 'active',
  }),
  updateCourse: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('../../stores/user', () => ({
  useUserStore: (selector: any) => selector({ displayName: () => 'Teacher' }),
}))

vi.mock('@/components', () => ({
  CourseForm: ({ onSubmit, onCancel, initialData }: any) =>
    React.createElement('div', { 'data-testid': 'course-form' },
      JSON.stringify(initialData),
      React.createElement('button', { onClick: () => onSubmit({ name: 'Course', subject: 'Math', grade: '一年级', schedule: '', status: 'active' }), 'data-testid': 'btn-submit' }, '提交'),
      React.createElement('button', { onClick: onCancel, 'data-testid': 'btn-cancel' }, '取消')
    ),
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  message: { success: vi.fn(), error: vi.fn() },
}))

describe('EditCourse', () => {
  it('renders loading initially', () => {
    render(React.createElement(EditCourse))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })

  it('renders form after loading', async () => {
    render(React.createElement(EditCourse))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByTestId('course-form')).toBeInTheDocument()
  })

  it('submits and navigates', async () => {
    render(React.createElement(EditCourse))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/courses'))
  })
})

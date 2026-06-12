import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import CreateCourse from '../Create'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/services/course', () => ({
  createCourse: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: (selector: any) => selector({ displayName: () => 'Teacher' }),
}))

vi.mock('@/types/error', () => ({
  BusinessError: class BusinessError extends Error {},
}))

vi.mock('@/components', () => ({
  CourseForm: ({ onSubmit, onCancel }: any) =>
    React.createElement('div', { 'data-testid': 'course-form' },
      React.createElement('button', { onClick: () => onSubmit({ name: 'Course', subject: 'Math', grade: '一年级', schedule: '', status: 'active' }), 'data-testid': 'btn-submit' }, '提交'),
      React.createElement('button', { onClick: onCancel, 'data-testid': 'btn-cancel' }, '取消')
    ),
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  message: { success: vi.fn(), error: vi.fn() },
}))

describe('CreateCourse', () => {
  it('renders form', () => {
    render(React.createElement(CreateCourse))
    expect(screen.getByTestId('course-form')).toBeInTheDocument()
  })

  it('submits and navigates', async () => {
    render(React.createElement(CreateCourse))
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/courses'))
  })

  it('cancels and navigates', () => {
    render(React.createElement(CreateCourse))
    fireEvent.click(screen.getByTestId('btn-cancel'))
    expect(mockNavigate).toHaveBeenCalledWith('/courses')
  })
})

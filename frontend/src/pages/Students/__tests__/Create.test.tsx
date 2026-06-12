import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import CreateStudent from '../Create'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams()],
}))

vi.mock('@/components', () => ({
  StudentForm: ({ onSubmit, onCancel, loading: _loading }: any) =>
    React.createElement('div', { 'data-testid': 'student-form' },
      React.createElement('button', { onClick: () => onSubmit({ name: '小明', gender: 'male', grade: '一年级', class_name: '1班', birth_date: { format: () => '2018-01-01' }, is_active: true }), 'data-testid': 'btn-submit' }, '提交'),
      React.createElement('button', { onClick: onCancel, 'data-testid': 'btn-cancel' }, '取消')
    ),
}))

vi.mock('@/services/student', () => ({
  studentService: {
    createStudent: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('@/types/error', () => ({
  BusinessError: class BusinessError extends Error {},
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  message: { success: vi.fn(), error: vi.fn() },
}))

describe('CreateStudent', () => {
  it('renders form', () => {
    render(React.createElement(CreateStudent))
    expect(screen.getByTestId('student-form')).toBeInTheDocument()
  })

  it('submits and navigates', async () => {
    render(React.createElement(CreateStudent))
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/students'))
  })

  it('cancels and navigates', () => {
    render(React.createElement(CreateStudent))
    fireEvent.click(screen.getByTestId('btn-cancel'))
    expect(mockNavigate).toHaveBeenCalledWith('/students')
  })
})

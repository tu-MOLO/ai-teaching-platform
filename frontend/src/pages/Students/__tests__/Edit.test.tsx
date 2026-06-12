import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import EditStudent from '../Edit'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'student-1' }),
  useSearchParams: () => [new URLSearchParams()],
}))

vi.mock('../../services/student', () => ({
  studentService: {
    getStudent: vi.fn().mockResolvedValue({
      id: 'student-1',
      name: '小明',
      gender: 'male',
      grade: '一年级',
      class_name: '1班',
      birth_date: '2018-01-01',
      enrollment_date: '2024-09-01',
      is_active: true,
    }),
    updateStudent: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('@/components', () => ({
  StudentForm: ({ onSubmit, onCancel, loading: _loading, initialData }: any) =>
    React.createElement('div', { 'data-testid': 'student-form' },
      JSON.stringify(initialData),
      React.createElement('button', { onClick: () => onSubmit({ name: '小明', gender: 'male', grade: '一年级', class_name: '1班', birth_date: { format: () => '2018-01-01' }, is_active: true }), 'data-testid': 'btn-submit' }, '提交'),
      React.createElement('button', { onClick: onCancel, 'data-testid': 'btn-cancel' }, '取消')
    ),
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  message: { success: vi.fn(), error: vi.fn() },
}))

describe('EditStudent', () => {
  it('renders loading initially', () => {
    render(React.createElement(EditStudent))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })

  it('renders form after loading', async () => {
    render(React.createElement(EditStudent))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByTestId('student-form')).toBeInTheDocument()
  })

  it('submits and navigates', async () => {
    render(React.createElement(EditStudent))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-submit'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/students'))
  })
})

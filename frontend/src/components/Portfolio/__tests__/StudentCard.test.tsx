import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import StudentCard from '../StudentCard'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, 'data-testid': 'link', ...props }, children),
}))

vi.mock('antd', () => ({
  Card: ({ children, className}: any) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  Typography: {
    Title: ({ children, level, style, ...props }: any) =>
      React.createElement('h5', { 'data-testid': 'title', ...props }, children),
    Text: ({ children, type, style, ...props }: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-type': type, ...props }, children),
  },
  Tag: ({ children, color}: any) =>
    React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
  Space: ({ children}: any) =>
    React.createElement('div', { 'data-testid': 'space' }, children),
}))

describe('StudentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseStudent = {
    id: 'student-1',
    name: '小明',
    gender: 'male',
    grade: '一年级',
    class_name: '1班',
    is_active: true,
    birth_date: '2018-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    enrollment_date: '2024-09-01',
  }

  it('renders student name', () => {
    render(React.createElement(StudentCard, { student: baseStudent }))
    expect(screen.getByText('小明')).toBeInTheDocument()
  })

  it('renders gender (formatted: "male" -> "男")', () => {
    render(React.createElement(StudentCard, { student: baseStudent }))
    expect(screen.getByText('性别: 男')).toBeInTheDocument()
  })

  it('renders class_name and grade', () => {
    render(React.createElement(StudentCard, { student: baseStudent }))
    expect(screen.getByText('班级: 1班')).toBeInTheDocument()
    expect(screen.getByText('年级: 一年级')).toBeInTheDocument()
  })

  it('renders active badge when is_active=true', () => {
    render(React.createElement(StudentCard, { student: { ...baseStudent, is_active: true } }))
    const tag = screen.getByText('在读')
    expect(tag).toBeInTheDocument()
    expect(tag.getAttribute('data-color')).toBe('green')
  })

  it('renders inactive badge when is_active=false', () => {
    render(React.createElement(StudentCard, { student: { ...baseStudent, is_active: false } }))
    const tag = screen.getByText('已停用')
    expect(tag).toBeInTheDocument()
    expect(tag.getAttribute('data-color')).toBe('red')
  })

  it('renders age from birth_date', () => {
    render(React.createElement(StudentCard, { student: { ...baseStudent, age: undefined } }))
    expect(screen.getByText(/年龄: \d+ 岁/)).toBeInTheDocument()
  })

  it('renders link to /portfolio/{student.id}', () => {
    render(React.createElement(StudentCard, { student: baseStudent }))
    const link = screen.getByTestId('link')
    expect(link.getAttribute('href')).toBe('/portfolio/student-1')
  })

  it('renders enrollment_date if provided', () => {
    render(React.createElement(StudentCard, { student: baseStudent }))
    expect(screen.getByText(/入学日期:/)).toBeInTheDocument()
  })
})
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import StudentDetail from '../StudentDetail'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'student-1' }),
}))

vi.mock('@/services/student', () => ({
  studentService: {
    getStudent: vi.fn().mockResolvedValue({
      id: 'student-1',
      name: '小明',
      gender: 'male',
      grade: '一年级',
      class_name: '1班',
      birth_date: '2018-01-01',
      is_active: true,
    }),
  },
}))

vi.mock('@/services/portfolio', () => ({
  portfolioService: {
    getPortfolios: vi.fn().mockResolvedValue({ data: [], pages: 1 }),
    exportPortfolioReport: vi.fn().mockResolvedValue(new Blob(['pdf'])),
    deletePortfolioItem: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/components', () => ({
  AbilityRadar: ({ studentId }: any) => React.createElement('div', { 'data-testid': 'ability-radar' }, studentId),
  TimelineItem: ({ item }: any) => React.createElement('div', { 'data-testid': 'timeline-item' }, item.title),
}))

vi.mock('@/stores/portfolioTypes', () => ({
  usePortfolioTypesStore: () => ({
    getAllTypes: () => [],
  }),
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  Timeline: Object.assign(
    ({ children }: any) => React.createElement('div', { 'data-testid': 'timeline' }, children),
    { Item: ({ children }: any) => React.createElement('div', { 'data-testid': 'timeline-item-wrap' }, children) }
  ),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Button: ({ children, onClick }: any) => React.createElement('button', { onClick, 'data-testid': `btn-${children}` }, children),
  Empty: ({ description }: any) => React.createElement('div', { 'data-testid': 'empty' }, description),
  Input: (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
  Select: Object.assign(
    (props: any) => React.createElement('select', { ...props, 'data-testid': 'select' }, props.children),
    { Option: ({ children, value }: any) => React.createElement('option', { value }, children) }
  ),
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  EditOutlined: () => React.createElement('span', null, 'Edit'),
  FileTextOutlined: () => React.createElement('span', null, 'File'),
  PlusOutlined: () => React.createElement('span', null, 'Plus'),
  ClockCircleOutlined: () => React.createElement('span', null, 'Clock'),
  SearchOutlined: () => React.createElement('span', null, 'Search'),
}))

describe('StudentDetail', () => {
  it('renders student info after loading', async () => {
    render(React.createElement(StudentDetail))
    await waitFor(() => expect(screen.getByText('小明')).toBeInTheDocument())
    expect(screen.getByText('男')).toBeInTheDocument()
    expect(screen.getByTestId('ability-radar')).toBeInTheDocument()
  })

  it('navigates to add record', async () => {
    render(React.createElement(StudentDetail))
    await waitFor(() => expect(screen.getByText('小明')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-添加记录'))
    expect(mockNavigate).toHaveBeenCalledWith('/portfolio/student-1/add-record')
  })
})

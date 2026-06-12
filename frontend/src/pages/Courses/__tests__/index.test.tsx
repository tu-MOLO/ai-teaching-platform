import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()

vi.mock('../../../services/course', () => ({
  getCourses: vi.fn().mockResolvedValue({ data: [], page: 1, page_size: 10, total: 0 }),
  deleteCourse: vi.fn(),
}))

vi.mock('../../stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('antd', () => {
  const TableComp = ({ dataSource, columns, loading: _loading }: any) =>
    React.createElement('div', { 'data-testid': 'table' },
      React.createElement('span', { 'data-testid': 'table-loading' }, String(_loading)),
      React.createElement('span', { 'data-testid': 'table-count' }, String(dataSource?.length || 0)),
      (dataSource || []).map((record: any, idx: number) =>
        React.createElement('div', { key: idx, 'data-testid': 'table-row' },
          columns?.map((col: any, cidx: number) =>
            React.createElement('span', { key: cidx },
              col.render ? col.render(record[col.dataIndex], record) : record[col.dataIndex]
            )
          )
        )
      )
    )
  const SearchComp = ({ placeholder, onChange, onSearch: _onSearch }: any) =>
    React.createElement('input', { placeholder, 'data-testid': 'search-input', onChange: (e: any) => onChange?.(e) })
  return {
    Table: TableComp,
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Search: SearchComp }
    ),
    Button: ({ children, onClick, icon, ...props }: any) =>
      React.createElement('button', { onClick, 'data-testid': `btn-${children}`, ...props }, icon, children),
    Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
    Tag: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
    Modal: Object.assign(
      ({ children, open }: any) => (open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null),
      { confirm: ({ onOk }: any) => onOk?.() }
    ),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    DeleteOutlined: icon('DeleteOutlined'),
    EditOutlined: icon('EditOutlined'),
    PlusOutlined: icon('PlusOutlined'),
    SearchOutlined: icon('SearchOutlined'),
    BookOutlined: icon('BookOutlined'),
  }
})

const Courses = (await import('../index')).default

describe('Courses page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render course list page', () => {
    render(React.createElement(Courses))
    expect(screen.getByText('课程管理')).toBeInTheDocument()
  })

  it('should display 新建课程 button', () => {
    render(React.createElement(Courses))
    expect(screen.getByText('新建课程')).toBeInTheDocument()
  })

  it('should display search input', () => {
    render(React.createElement(Courses))
    expect(screen.getByPlaceholderText('搜索课程名称或教师')).toBeInTheDocument()
  })

  it('should fetch courses on mount', async () => {
    const { getCourses } = await import('../../../services/course')
    render(React.createElement(Courses))
    await waitFor(() => expect(getCourses).toHaveBeenCalled())
  })

  it('should handle delete course', async () => {
    const { getCourses, deleteCourse } = await import('../../../services/course') as any
    ;(getCourses as any).mockResolvedValue({
      data: [{ id: '1', name: 'Course 1', subject: 'Math', grade: '7', teacher: 'T1', schedule: 'Mon', status: 'active' }],
      page: 1, page_size: 10, total: 1,
    })
    render(React.createElement(Courses))
    await waitFor(() => expect(screen.getByText('Course 1')).toBeInTheDocument())
    const deleteBtn = screen.getByText('删除')
    fireEvent.click(deleteBtn)
    await waitFor(() => expect(deleteCourse).toHaveBeenCalledWith('1'))
  })
})

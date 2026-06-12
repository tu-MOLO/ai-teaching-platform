import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()
const mockGetStudents = vi.fn().mockResolvedValue({ data: [], page: 1, page_size: 10, total: 0 })
const mockDeleteStudent = vi.fn().mockResolvedValue(undefined)
const mockRefreshDashboardStats = vi.fn()

vi.mock('../../../services/student', () => ({
  studentService: {
    getStudents: (...args: any[]) => mockGetStudents(...args),
    deleteStudent: (...args: any[]) => mockDeleteStudent(...args),
  },
}))

vi.mock('../../../stores/dashboard', () => ({
  refreshDashboardStats: () => mockRefreshDashboardStats(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('antd', () => {
  const ModalComp = Object.assign(
    ({ children }: any) => React.createElement('div', { 'data-testid': 'modal' }, children),
    { confirm: ({ onOk }: any) => onOk?.() }
  )
  return {
    Button: ({ children, onClick, icon, ...props }: any) =>
      React.createElement('button', { onClick, 'data-testid': `btn-${children}`, ...props }, icon, children),
    Input: Object.assign(
      (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
      {
        Search: ({ placeholder, onChange, onSearch, value }: any) =>
          React.createElement('div', null,
            React.createElement('input', { placeholder, value, onChange: (e: any) => onChange?.(e), 'data-testid': 'search-input' }),
            React.createElement('button', { onClick: () => onSearch?.(value), 'data-testid': 'search-btn' }, 'Search')
          )
      }
    ),
    Table: ({ dataSource, columns, loading, pagination }: any) =>
      React.createElement('div', { 'data-testid': 'table' },
        React.createElement('span', { 'data-testid': 'table-loading' }, String(loading)),
        React.createElement('span', { 'data-testid': 'table-count' }, String(dataSource?.length || 0)),
        (dataSource || []).map((record: any, idx: number) =>
          React.createElement('div', { key: idx, 'data-testid': 'table-row' },
            columns?.map((col: any, cidx: number) =>
              React.createElement('span', { key: cidx },
                col.render ? col.render(record[col.dataIndex], record) : record[col.dataIndex]
              )
            )
          )
        ),
        pagination ? React.createElement('button', { onClick: () => pagination.onChange?.(2, pagination.pageSize), 'data-testid': 'page-next' }, 'Next') : null,
      ),
    Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
    Tag: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
    Modal: ModalComp,
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    PlusOutlined: icon('PlusOutlined'),
    EditOutlined: icon('EditOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    SearchOutlined: icon('SearchOutlined'),
    TeamOutlined: icon('TeamOutlined'),
  }
})

vi.mock('../../../components/Common/ConfigurableSelect', () => ({
  default: (props: any) => React.createElement('select', { ...props, 'data-testid': 'configurable-select', onChange: (e: any) => props.onChange?.(e.target.value) },
    React.createElement('option', { value: '' }, '全部'),
    React.createElement('option', { value: 'grade-7' }, '七年级'),
  ),
}))

const Students = (await import('../index')).default

describe('Students page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStudents.mockResolvedValue({ data: [], page: 1, page_size: 10, total: 0 })
  })

  it('should render student list page', () => {
    render(React.createElement(Students))
    expect(screen.getByText('学生管理')).toBeInTheDocument()
  })

  it('should display 添加学生 button', () => {
    render(React.createElement(Students))
    expect(screen.getByText('添加学生')).toBeInTheDocument()
  })

  it('should display search input', () => {
    render(React.createElement(Students))
    expect(screen.getByPlaceholderText('搜索学生姓名...')).toBeInTheDocument()
  })

  it('should navigate to create student page', () => {
    render(React.createElement(Students))
    fireEvent.click(screen.getByText('添加学生'))
    expect(mockNavigate).toHaveBeenCalledWith('/students/create')
  })

  it('should fetch students on mount', async () => {
    render(React.createElement(Students))
    await waitFor(() => expect(mockGetStudents).toHaveBeenCalled())
  })

  it('should handle search text change', async () => {
    render(React.createElement(Students))
    const searchInput = screen.getByPlaceholderText('搜索学生姓名...')
    fireEvent.change(searchInput, { target: { value: '张三' } })
    await waitFor(() => expect(mockGetStudents).toHaveBeenCalledWith(expect.objectContaining({ keyword: '张三' })))
  })

  it('should handle grade filter change', async () => {
    render(React.createElement(Students))
    const select = screen.getByTestId('configurable-select')
    fireEvent.change(select, { target: { value: 'grade-7' } })
    await waitFor(() => expect(mockGetStudents).toHaveBeenCalledWith(expect.objectContaining({ grade: 'grade-7' })))
  })

  it('should handle pagination change', async () => {
    mockGetStudents.mockResolvedValue({ data: [{ id: '1', name: '张三', gender: 'male', grade: '七年级', class_name: '1班', is_active: true }], page: 1, page_size: 10, total: 20 })
    render(React.createElement(Students))
    await waitFor(() => expect(screen.getByTestId('page-next')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('page-next'))
    await waitFor(() => expect(mockGetStudents).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
  })

  it('should handle delete student', async () => {
    mockGetStudents.mockResolvedValue({
      data: [{ id: '1', name: '张三', gender: 'male', grade: '七年级', class_name: '1班', is_active: true }],
      page: 1, page_size: 10, total: 1,
    })
    render(React.createElement(Students))
    await waitFor(() => expect(screen.getByText('删除')).toBeInTheDocument())
    fireEvent.click(screen.getByText('删除'))
    await waitFor(() => expect(mockDeleteStudent).toHaveBeenCalledWith('1'))
    expect(mockRefreshDashboardStats).toHaveBeenCalled()
  })

  it('should handle fetch students error', async () => {
    mockGetStudents.mockRejectedValueOnce(new Error('fail'))
    render(React.createElement(Students))
    await waitFor(() => expect(mockGetStudents).toHaveBeenCalled())
  })

  it('should display student data', async () => {
    mockGetStudents.mockResolvedValue({
      data: [{ id: '1', name: '张三', gender: 'male', grade: '七年级', class_name: '1班', is_active: true }],
      page: 1, page_size: 10, total: 1,
    })
    render(React.createElement(Students))
    await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument())
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()
const mockGetStudents = vi.fn().mockResolvedValue({ data: [], page: 1, page_size: 10, total: 0 })
const mockDeleteStudent = vi.fn().mockResolvedValue({})

vi.mock('../../../services/student', () => ({
  studentService: {
    getStudents: (...args: any[]) => mockGetStudents(...args),
    deleteStudent: (...args: any[]) => mockDeleteStudent(...args),
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    PlusOutlined: icon('PlusOutlined'),
    SearchOutlined: icon('SearchOutlined'),
    EditOutlined: icon('EditOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    EyeOutlined: icon('EyeOutlined'),
    UserOutlined: icon('UserOutlined'),
    TeamOutlined: icon('TeamOutlined'),
    AppstoreOutlined: icon('AppstoreOutlined'),
    UnorderedListOutlined: icon('UnorderedListOutlined'),
  }
})

vi.mock('../../../components/Common/ConfigurableSelect', () => ({
  default: (props: any) => React.createElement('select', { ...props, 'data-testid': 'configurable-select' }),
}))

const Portfolio = (await import('../index')).default

describe('Portfolio page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render portfolio page', () => {
    render(React.createElement(Portfolio))
    expect(screen.getByText('学生档案')).toBeInTheDocument()
  })

  it('should display 添加学生 button', () => {
    render(React.createElement(Portfolio))
    expect(screen.getByText('添加学生')).toBeInTheDocument()
  })

  it('should display search input', () => {
    render(React.createElement(Portfolio))
    expect(screen.getByPlaceholderText('搜索学生姓名...')).toBeInTheDocument()
  })

  it('should switch to table view', async () => {
    render(React.createElement(Portfolio))
    const tableBtn = screen.getByText('列表')
    fireEvent.click(tableBtn)
    await waitFor(() => expect(screen.getByText('列表')).toBeInTheDocument())
  })

  it('should render student cards when data returned', async () => {
    mockGetStudents.mockResolvedValueOnce({
      data: [{
        id: 's1',
        name: '张三',
        class_name: '一班',
        grade: '七年级',
        gender: 'male',
        birth_date: '2010-01-01',
        enrollment_date: '2023-09-01',
        is_active: true,
        progress: 80,
      }],
      page: 1,
      page_size: 10,
      total: 1,
    })
    render(React.createElement(Portfolio))
    await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument())
    expect(screen.getByText('一班')).toBeInTheDocument()
    expect(screen.getByText('七年级')).toBeInTheDocument()
  })

  it('should navigate on add student click', () => {
    render(React.createElement(Portfolio))
    fireEvent.click(screen.getByText('添加学生'))
    expect(mockNavigate).toHaveBeenCalledWith('/students/create?returnTo=/portfolio')
  })

  it('should filter inactive students', async () => {
    mockGetStudents.mockResolvedValueOnce({
      data: [
        { id: 's1', name: '张三', class_name: '一班', grade: '七年级', gender: 'male', is_active: true, progress: 80 },
        { id: 's2', name: '李四', class_name: '二班', grade: '八年级', gender: 'female', is_active: false, progress: 60 },
      ],
      page: 1,
      page_size: 10,
      total: 2,
    })
    render(React.createElement(Portfolio))
    await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument())
    expect(screen.queryByText('李四')).not.toBeInTheDocument()
  })
})
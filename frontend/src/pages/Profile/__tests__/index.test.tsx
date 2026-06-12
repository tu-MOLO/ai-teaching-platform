import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

const { getUserProfileMock, updateUserProfileMock, changePasswordMock } = vi.hoisted(() => ({
  getUserProfileMock: vi.fn().mockResolvedValue({
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    status: 'active',
    is_active: true,
    login_count: 42,
    last_login_at: '2024-01-01T00:00:00',
  }),
  updateUserProfileMock: vi.fn().mockResolvedValue({
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User Updated',
    status: 'active',
    is_active: true,
    login_count: 42,
    last_login_at: '2024-01-01T00:00:00',
  }),
  changePasswordMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../services/user', () => ({
  userService: {
    getUserProfile: getUserProfileMock,
    updateUserProfile: updateUserProfileMock,
    changePassword: changePasswordMock,
  },
}))

vi.mock('../../../stores/user', () => ({
  useUserStore: () => ({
    user: {
      id: 'user-1',
      username: 'testuser',
      full_name: 'Test User',
      email: 'test@example.com'
    },
    setUser: vi.fn()
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('antd', () => {
  const FormItem = ({ children, name, label, rules: _rules }: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}` }, label ? React.createElement('label', null, label) : null, children)
  const FormComp = ({ children, form: _form, layout: _layout, onFinish, disabled: _disabled, initialValues: _initialValues }: any) => {
    return React.createElement('form', { 'data-testid': 'form', onSubmit: (e: any) => { e.preventDefault(); onFinish?.({}) } }, children)
  }
  FormComp.Item = FormItem
  FormComp.useForm = () => [
    {
      validateFields: vi.fn().mockResolvedValue({}),
      getFieldValue: vi.fn().mockReturnValue(''),
      resetFields: vi.fn(),
      setFieldsValue: vi.fn(),
    },
  ]
  return {
    Form: FormComp,
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      {
        Password: (props: any) => React.createElement('input', { type: 'password', ...props }),
        TextArea: (props: any) => React.createElement('textarea', props),
      }
    ),
    Button: ({ children, onClick, loading, icon, ...props }: any) =>
      React.createElement('button', { onClick, disabled: loading, 'data-testid': `btn-${children}`, ...props }, icon, children),
    Card: ({ children, title, extra, className }: any) =>
      React.createElement('div', { 'data-testid': 'card', className }, title, extra, children),
    Avatar: ({ size: _size, icon, src: _src }: any) =>
      React.createElement('div', { 'data-testid': 'avatar' }, icon),
    Row: ({ children }: any) => React.createElement('div', { 'data-testid': 'row' }, children),
    Col: ({ children }: any) => React.createElement('div', { 'data-testid': 'col' }, children),
    Statistic: ({ title, value, prefix }: any) =>
      React.createElement('div', { 'data-testid': 'statistic' }, prefix, React.createElement('span', null, title), React.createElement('span', null, String(value))),
    Tag: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'tag', 'data-color': color }, children),
    Divider: () => React.createElement('hr', { 'data-testid': 'divider' }),
    Descriptions: Object.assign(
      ({ children, column: _column, size: _size }: any) => React.createElement('div', { 'data-testid': 'descriptions' }, children),
      { Item: ({ children, label }: any) => React.createElement('div', { 'data-testid': 'desc-item' }, label, children) }
    ),
    Modal: ({ children, open, title: _title, onOk, onCancel }: any) =>
      open ? React.createElement('div', { 'data-testid': 'modal' }, React.createElement('button', { onClick: onOk, 'data-testid': 'modal-ok' }, 'OK'), React.createElement('button', { onClick: onCancel, 'data-testid': 'modal-cancel' }, 'Cancel'), children) : null,
    Spin: ({ children, size: _size }: any) => React.createElement('div', { 'data-testid': 'spin' }, children),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    UserOutlined: icon('UserOutlined'),
    EditOutlined: icon('EditOutlined'),
    SaveOutlined: icon('SaveOutlined'),
    CloseOutlined: icon('CloseOutlined'),
    MailOutlined: icon('MailOutlined'),
    CalendarOutlined: icon('CalendarOutlined'),
    LoginOutlined: icon('LoginOutlined'),
    IdcardOutlined: icon('IdcardOutlined'),
    SafetyOutlined: icon('SafetyOutlined'),
  }
})

vi.mock('dayjs', () => {
  const dayjs = (() => ({
    format: () => '2024-01-01 00:00',
  })) as any
  dayjs.default = dayjs
  return { default: dayjs }
})

const Profile = (await import('../index')).default

describe('Profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserProfileMock.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      status: 'active',
      is_active: true,
      login_count: 42,
      last_login_at: '2024-01-01T00:00:00',
    })
  })

  it('should render profile page', async () => {
    render(React.createElement(Profile))
    await waitFor(() => {
      expect(screen.getByText('个人资料')).toBeInTheDocument()
    })
  })

  it('should display user info section', async () => {
    render(React.createElement(Profile))
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('should display 编辑资料 button', async () => {
    render(React.createElement(Profile))
    await waitFor(() => {
      expect(screen.getByText('编辑资料')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(React.createElement(Profile))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })

  it('should show create profile form when no profile', async () => {
    getUserProfileMock.mockRejectedValueOnce(new Error('No profile'))
    render(React.createElement(Profile))
    await waitFor(() => {
      expect(screen.getByText('完善个人资料')).toBeInTheDocument()
    })
  })

  it('should enter edit mode and cancel', async () => {
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('编辑资料')).toBeInTheDocument())
    fireEvent.click(screen.getByText('编辑资料'))
    expect(screen.getByText('取消')).toBeInTheDocument()
    fireEvent.click(screen.getByText('取消'))
    await waitFor(() => expect(screen.getByText('编辑资料')).toBeInTheDocument())
  })

  it('should save profile changes', async () => {
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('编辑资料')).toBeInTheDocument())
    fireEvent.click(screen.getByText('编辑资料'))
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => expect(updateUserProfileMock).toHaveBeenCalled())
  })

  it('should open and close password modal', async () => {
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('安全设置')).toBeInTheDocument())
    const passwordBtns = screen.getAllByText('修改密码')
    // Click the button (last occurrence)
    fireEvent.click(passwordBtns[passwordBtns.length - 1])
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('modal-cancel'))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('should submit password change', async () => {
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('安全设置')).toBeInTheDocument())
    const passwordBtns = screen.getAllByText('修改密码')
    fireEvent.click(passwordBtns[passwordBtns.length - 1])
    fireEvent.click(screen.getByTestId('modal-ok'))
    await waitFor(() => expect(changePasswordMock).toHaveBeenCalled())
  })

  it('should display status tag for active user', async () => {
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('活跃')).toBeInTheDocument())
  })

  it('should display status tag for inactive user', async () => {
    getUserProfileMock.mockResolvedValueOnce({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      status: 'active',
      is_active: false,
      login_count: 42,
      last_login_at: '2024-01-01T00:00:00',
    })
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('已禁用')).toBeInTheDocument())
  })

  it('should display status tag for suspended user', async () => {
    getUserProfileMock.mockResolvedValueOnce({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      status: 'suspended',
      is_active: true,
      login_count: 42,
      last_login_at: '2024-01-01T00:00:00',
    })
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('已暂停')).toBeInTheDocument())
  })

  it('should display security settings section', async () => {
    render(React.createElement(Profile))
    await waitFor(() => expect(screen.getByText('安全设置')).toBeInTheDocument())
  })
})

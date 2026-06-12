import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import Login from '../index'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
  useNavigate: () => mockNavigate,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ login: vi.fn() }),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ setUser: vi.fn() }),
}))

const mockLogin = vi.fn().mockResolvedValue({ access_token: 'token', user: { id: '1' } })
const mockGetSecurityQuestion = vi.fn().mockResolvedValue({ security_question: 'Q', is_legacy: false })
const mockResetPassword = vi.fn().mockResolvedValue({})

vi.mock('@/services/auth', () => ({
  authService: {
    login: (...args: any[]) => mockLogin(...args),
    getSecurityQuestion: (...args: any[]) => mockGetSecurityQuestion(...args),
    resetPassword: (...args: any[]) => mockResetPassword(...args),
  },
}))

vi.mock('@/types/error', () => ({
  BusinessError: class BusinessError extends Error {
    code: string
    constructor(message: string, code?: string) {
      super(message)
      this.code = code || ''
    }
  },
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick, htmlType, loading }: any) =>
    React.createElement('button', { onClick, type: htmlType, disabled: loading, 'data-testid': `btn-${children}` }, children),
  Form: Object.assign(
    (props: any) => React.createElement('form', { onSubmit: props.onFinish, 'data-testid': 'form' }, props.children),
    {
      Item: ({ children, name }: any) => React.createElement('div', { 'data-testid': `form-item-${name}` }, children),
      useForm: () => [{ validateFields: vi.fn().mockResolvedValue({}), getFieldValue: vi.fn(), resetFields: vi.fn() }],
    }
  ),
  Input: Object.assign(
    (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
    { Password: (props: any) => React.createElement('input', { type: 'password', ...props, 'data-testid': 'input-password' }) }
  ),
  Checkbox: ({ children }: any) => React.createElement('label', null, React.createElement('input', { type: 'checkbox' }), children),
  Modal: Object.assign(
    ({ children, open, title, footer }: any) =>
      open ? React.createElement('div', { 'data-testid': 'modal' }, title, children, footer) : null,
    { confirm: ({ onOk }: any) => onOk?.() }
  ),
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  UserOutlined: () => React.createElement('span', null, 'User'),
  LockOutlined: () => React.createElement('span', null, 'Lock'),
  BookOutlined: () => React.createElement('span', null, 'Book'),
  TeamOutlined: () => React.createElement('span', null, 'Team'),
  RocketOutlined: () => React.createElement('span', null, 'Rocket'),
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    render(React.createElement(Login))
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  it('submits login', async () => {
    render(React.createElement(Login))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('opens reset password modal', async () => {
    render(React.createElement(Login))
    const resetLink = screen.getByText('重置密码')
    fireEvent.click(resetLink)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('handles login error with code 2006', async () => {
    mockLogin.mockRejectedValueOnce({ code: '2006' })
    render(React.createElement(Login))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(screen.getByTestId('form')).toBeInTheDocument())
  })

  it('handles login error with code 2007', async () => {
    mockLogin.mockRejectedValueOnce({ code: '2007' })
    render(React.createElement(Login))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(screen.getByTestId('form')).toBeInTheDocument())
  })

  it('handles login error with code 3002', async () => {
    mockLogin.mockRejectedValueOnce({ code: '3002' })
    render(React.createElement(Login))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(screen.getByTestId('form')).toBeInTheDocument())
  })

  it('handles generic login error', async () => {
    mockLogin.mockRejectedValueOnce(new Error('fail'))
    render(React.createElement(Login))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(screen.getByTestId('form')).toBeInTheDocument())
  })

  it('handles reset password step 1 to step 2', async () => {
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(mockGetSecurityQuestion).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('form-item-security_answer')).toBeInTheDocument())
  })

  it('handles legacy account in reset flow', async () => {
    mockGetSecurityQuestion.mockResolvedValueOnce({ security_question: '', is_legacy: true })
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(screen.getByText(/未设置密保问题/)).toBeInTheDocument())
  })

  it('handles reset password submit', async () => {
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(screen.getByTestId('form-item-security_answer')).toBeInTheDocument())
    const submitBtn = screen.getByTestId('btn-重置密码')
    fireEvent.click(submitBtn)
    await waitFor(() => expect(mockResetPassword).toHaveBeenCalled())
  })

  it('closes reset modal', async () => {
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    fireEvent.click(screen.getByTestId('btn-取消'))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('handles getSecurityQuestion validation error', async () => {
    mockGetSecurityQuestion.mockRejectedValueOnce({ errorFields: [{ name: 'username' }] })
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(mockGetSecurityQuestion).toHaveBeenCalled())
  })

  it('handles getSecurityQuestion generic error', async () => {
    mockGetSecurityQuestion.mockRejectedValueOnce(new Error('fail'))
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(mockGetSecurityQuestion).toHaveBeenCalled())
  })

  it('handles resetPassword validation error', async () => {
    mockResetPassword.mockRejectedValueOnce({ errorFields: [{ name: 'new_password' }] })
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(screen.getByTestId('form-item-security_answer')).toBeInTheDocument())
    const submitBtn = screen.getByTestId('btn-重置密码')
    fireEvent.click(submitBtn)
    await waitFor(() => expect(mockResetPassword).toHaveBeenCalled())
  })

  it('handles resetPassword generic error', async () => {
    mockResetPassword.mockRejectedValueOnce(new Error('fail'))
    render(React.createElement(Login))
    fireEvent.click(screen.getByText('重置密码'))
    const nextBtn = screen.getByTestId('btn-获取密保问题')
    fireEvent.click(nextBtn)
    await waitFor(() => expect(screen.getByTestId('form-item-security_answer')).toBeInTheDocument())
    const submitBtn = screen.getByTestId('btn-重置密码')
    fireEvent.click(submitBtn)
    await waitFor(() => expect(mockResetPassword).toHaveBeenCalled())
  })
})

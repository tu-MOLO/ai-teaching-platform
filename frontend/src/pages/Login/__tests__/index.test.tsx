import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import Login from '../index'

const mockLogin = vi.fn()
const mockSetUser = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}))

vi.mock('../../stores/user', () => ({
  useUserStore: () => ({ setUser: mockSetUser }),
}))

vi.mock('../../services/auth', () => ({
  authService: {
    login: vi.fn(),
    getSecurityQuestion: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
}))

vi.mock('antd', () => {
  const FormItem = ({ children, name, rules, ...props }: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}` }, children)

  const InputComp = ({ placeholder, prefix, ...props }: any) =>
    React.createElement('input', { placeholder, 'data-testid': `input-${placeholder}` })

  const PasswordInput = ({ placeholder, ...props }: any) =>
    React.createElement('input', { placeholder, type: 'password', 'data-testid': `input-${placeholder}` })

  const CheckboxComp = ({ children, ...props }: any) =>
    React.createElement('label', null, React.createElement('input', { type: 'checkbox' }), children)

  const ButtonComp = ({ children, onClick, loading, htmlType, ...props }: any) =>
    React.createElement('button', { onClick, disabled: loading, type: htmlType || 'button', 'data-loading': loading }, children)

  const FormComp = ({ children, onFinish, name, initialValues, ...props }: any) => {
    const [formData, setFormData] = React.useState<Record<string, string>>({})
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (onFinish) onFinish(formData)
    }
    return React.createElement('form', { onSubmit: handleSubmit, 'data-testid': `form-${name || 'unnamed'}` }, children)
  }

  FormComp.Item = FormItem
  FormComp.useForm = () => [
    {
      validateFields: vi.fn().mockResolvedValue({}),
      getFieldValue: vi.fn().mockReturnValue(''),
      resetFields: vi.fn(),
    },
  ]

  return {
    Form: FormComp,
    Input: Object.assign(InputComp, { Password: PasswordInput }),
    Button: ButtonComp,
    Checkbox: CheckboxComp,
    Modal: ({ children, open, title, ...props }: any) =>
      open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

vi.mock('@ant-design/icons', () => ({
  UserOutlined: () => React.createElement('span', null, 'UserIcon'),
  LockOutlined: () => React.createElement('span', null, 'LockIcon'),
  BookOutlined: () => React.createElement('span', null, 'BookIcon'),
  TeamOutlined: () => React.createElement('span', null, 'TeamIcon'),
  RocketOutlined: () => React.createElement('span', null, 'RocketIcon'),
}))

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form title', () => {
    render(React.createElement(Login))

    expect(screen.getByRole('heading', { level: 2, name: '登录' })).toBeInTheDocument()
  })

  it('should render brand title', () => {
    render(React.createElement(Login))

    expect(screen.getByText('AI教学平台')).toBeInTheDocument()
  })

  it('should render username and password inputs', () => {
    render(React.createElement(Login))

    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
  })

  it('should render login button', () => {
    render(React.createElement(Login))

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('should render register link', () => {
    render(React.createElement(Login))

    expect(screen.getByText('立即注册')).toBeInTheDocument()
  })

  it('should render remember me checkbox', () => {
    render(React.createElement(Login))

    expect(screen.getByText('记住我')).toBeInTheDocument()
  })

  it('should render brand features', () => {
    render(React.createElement(Login))

    expect(screen.getByText('智能备课辅助')).toBeInTheDocument()
    expect(screen.getByText('学生成长档案')).toBeInTheDocument()
    expect(screen.getByText('教学数据分析')).toBeInTheDocument()
  })

  it('should render reset password link', () => {
    render(React.createElement(Login))

    expect(screen.getByText('重置密码')).toBeInTheDocument()
  })

  it('should display form subtitle', () => {
    render(React.createElement(Login))

    expect(screen.getByText('输入账号信息以继续使用平台')).toBeInTheDocument()
  })
})

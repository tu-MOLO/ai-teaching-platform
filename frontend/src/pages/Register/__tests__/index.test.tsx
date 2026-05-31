import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Register from '../index'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
}))

vi.mock('../../services/auth', () => ({
  authService: {
    register: vi.fn(),
  },
}))

vi.mock('antd', () => {
  const FormItem = ({ children, name, label, ...props }: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}` },
      label ? React.createElement('label', null, label) : null,
      children
    )

  const InputComp = ({ placeholder, prefix, ...props }: any) =>
    React.createElement('input', { placeholder, 'data-testid': `input-${placeholder}` })

  const PasswordInput = ({ placeholder, ...props }: any) =>
    React.createElement('input', { placeholder, type: 'password', 'data-testid': `input-${placeholder}` })

  const SelectComp = ({ placeholder, options, ...props }: any) =>
    React.createElement('select', { 'data-testid': `select-${placeholder}` },
      options?.map((opt: any) =>
        React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
      )
    )

  const ButtonComp = ({ children, onClick, loading, htmlType, block, ...props }: any) =>
    React.createElement('button', { onClick, disabled: loading, type: htmlType || 'button' }, children)

  const FormComp = ({ children, onFinish, name, ...props }: any) =>
    React.createElement('form', { 'data-testid': `form-${name || 'unnamed'}` }, children)

  FormComp.Item = FormItem
  FormComp.useForm = () => [
    {
      validateFields: vi.fn().mockResolvedValue({}),
      getFieldValue: vi.fn().mockReturnValue(''),
      resetFields: vi.fn(),
    },
  ]

  const Typography = {
    Text: ({ children, type, ...props }: any) =>
      React.createElement('span', { 'data-type': type }, children),
  }

  return {
    Form: FormComp,
    Input: Object.assign(InputComp, { Password: PasswordInput }),
    Button: ButtonComp,
    Select: SelectComp,
    Typography,
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
  MailOutlined: () => React.createElement('span', null, 'MailIcon'),
  IdcardOutlined: () => React.createElement('span', null, 'IdcardIcon'),
  ArrowLeftOutlined: () => React.createElement('span', null, 'ArrowLeftIcon'),
}))

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form title "创建账号"', () => {
    render(React.createElement(Register))

    expect(screen.getByRole('heading', { level: 2, name: '创建账号' })).toBeInTheDocument()
  })

  it('renders brand title "AI教学平台"', () => {
    render(React.createElement(Register))

    expect(screen.getByText('AI教学平台')).toBeInTheDocument()
  })

  it('renders subtitle "填写以下信息完成注册"', () => {
    render(React.createElement(Register))

    expect(screen.getByText('填写以下信息完成注册')).toBeInTheDocument()
  })

  it('renders "返回登录" link', () => {
    render(React.createElement(Register))

    expect(screen.getByText('返回登录')).toBeInTheDocument()
  })

  it('renders register button "注册"', () => {
    render(React.createElement(Register))

    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument()
  })

  it('renders footer text about completing profile', () => {
    render(React.createElement(Register))

    expect(screen.getByText('注册后可在个人设置中补充资料与邮箱信息。')).toBeInTheDocument()
  })

  it('renders all form field labels', () => {
    render(React.createElement(Register))

    expect(screen.getByText('用户名')).toBeInTheDocument()
    expect(screen.getByText('邮箱地址')).toBeInTheDocument()
    expect(screen.getByText('真实姓名')).toBeInTheDocument()
    expect(screen.getByText('密码')).toBeInTheDocument()
    expect(screen.getByText('确认密码')).toBeInTheDocument()
    expect(screen.getByText('密保问题')).toBeInTheDocument()
    expect(screen.getByText('密保答案')).toBeInTheDocument()
  })
})

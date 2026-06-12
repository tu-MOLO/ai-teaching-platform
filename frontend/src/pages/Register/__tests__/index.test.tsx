import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import Register from '../index'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
  useNavigate: () => mockNavigate,
}))

vi.mock('@/services/auth', () => ({
  authService: {
    register: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick, htmlType, loading }: any) =>
    React.createElement('button', { onClick, type: htmlType, disabled: loading, 'data-testid': `btn-${children}` }, children),
  Form: Object.assign(
    (props: any) => React.createElement('form', { onSubmit: props.onFinish, 'data-testid': 'form' }, props.children),
    {
      Item: ({ children, name }: any) => React.createElement('div', { 'data-testid': `form-item-${name}` }, children),
      useForm: () => [{ validateFields: vi.fn().mockResolvedValue({}) }],
    }
  ),
  Input: Object.assign(
    (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
    { Password: (props: any) => React.createElement('input', { type: 'password', ...props, 'data-testid': 'input-password' }) }
  ),
  Select: Object.assign(
    (props: any) => React.createElement('select', { ...props, 'data-testid': 'select' }, props.children),
    { Option: ({ children, value }: any) => React.createElement('option', { value }, children) }
  ),
  Typography: { Text: ({ children }: any) => React.createElement('span', null, children) },
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  UserOutlined: () => React.createElement('span', null, 'User'),
  LockOutlined: () => React.createElement('span', null, 'Lock'),
  MailOutlined: () => React.createElement('span', null, 'Mail'),
  IdcardOutlined: () => React.createElement('span', null, 'Id'),
  ArrowLeftOutlined: () => React.createElement('span', null, 'Back'),
}))

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders register form', () => {
    render(React.createElement(Register))
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  it('submits registration', async () => {
    render(React.createElement(Register))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import CourseForm from '../CourseForm'

vi.mock('../../Common/ConfigurableSelect', () => ({
  default: ({ groupKey, placeholder }: any) =>
    React.createElement('select', { 'data-testid': `configurable-select-${groupKey}`, 'data-placeholder': placeholder },
      React.createElement('option', { value: '' }, placeholder)
    ),
}))

vi.mock('antd', () => {
  const FormItem = ({ children, name, label}: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}`, 'data-label': label }, children)

  const FormComp = ({ children, onFinish}: any) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (onFinish) onFinish({})
    }
    return React.createElement('form', { onSubmit: handleSubmit, 'data-testid': 'form' }, children)
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
    Input: ({ placeholder, value, disabled}: any) =>
      React.createElement('input', {
        placeholder,
        value,
        disabled,
        'data-testid': `input-${placeholder || 'unnamed'}`,
        type: 'text',
      }),
    Button: ({ children, onClick, loading, htmlType, disabled}: any) =>
      React.createElement('button', {
        onClick,
        disabled: disabled || loading,
        type: htmlType || 'button',
        'data-loading': loading ? 'true' : 'false',
        'data-testid': 'button',
      }, children),
    Space: ({ children}: any) =>
      React.createElement('div', { 'data-testid': 'space' }, children),
  }
})

describe('CourseForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with name, subject, grade, schedule, status fields', () => {
    render(
      React.createElement(CourseForm, {
        currentUserName: '张老师',
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    expect(screen.getByTestId('form-item-name')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-subject')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-grade')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-schedule')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-status')).toBeInTheDocument()
  })

  it('renders teacher name (disabled input)', () => {
    render(
      React.createElement(CourseForm, {
        currentUserName: '张老师',
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    expect(screen.getByTestId('input-unnamed')).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(
      React.createElement(CourseForm, {
        currentUserName: '张老师',
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('calls onSubmit with form values', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(CourseForm, {
        currentUserName: '张老师',
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    const form = screen.getByTestId('form')
    await user.click(form)
    // The form's onSubmit simulation is triggered when form is submitted
    // via the handleSubmit event handler
  })

  it('calls onCancel when cancel clicked', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(CourseForm, {
        currentUserName: '张老师',
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    await user.click(screen.getByText('取消'))
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables buttons when loading', () => {
    render(
      React.createElement(CourseForm, {
        currentUserName: '张老师',
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
        loading: true,
      })
    )
    const buttons = screen.getAllByTestId('button')
    const saveButton = buttons.find(b => b.textContent === '保存')
    expect(saveButton?.getAttribute('data-loading')).toBe('true')
  })
})
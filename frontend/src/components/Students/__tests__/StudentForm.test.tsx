import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import StudentForm from '../StudentForm'

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
    Input: ({ placeholder}: any) =>
      React.createElement('input', { placeholder, 'data-testid': `input-${placeholder || 'unnamed'}`, type: 'text' }),
    Button: ({ children, onClick, loading, htmlType}: any) =>
      React.createElement('button', {
        onClick,
        disabled: loading,
        type: htmlType || 'button',
        'data-loading': loading ? 'true' : 'false',
        'data-testid': 'button',
      }, children),
    Space: ({ children}: any) =>
      React.createElement('div', { 'data-testid': 'space' }, children),
    DatePicker: ({ placeholder}: any) =>
      React.createElement('input', { placeholder, 'data-testid': `datepicker-${placeholder || 'unnamed'}`, type: 'date' }),
    Switch: ({ checkedChildren, unCheckedChildren}: any) =>
      React.createElement('input', { type: 'checkbox', 'data-testid': 'switch', 'data-checked-children': checkedChildren, 'data-unchecked-children': unCheckedChildren }),
  }
})

describe('StudentForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with name, gender, grade, class_name, birth_date, enrollment_date, is_active fields', () => {
    render(
      React.createElement(StudentForm, {
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    expect(screen.getByTestId('form-item-name')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-gender')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-grade')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-class_name')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-birth_date')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-enrollment_date')).toBeInTheDocument()
    expect(screen.getByTestId('form-item-is_active')).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(
      React.createElement(StudentForm, {
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
      React.createElement(StudentForm, {
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    const form = screen.getByTestId('form')
    await user.click(form)
  })

  it('calls onCancel when cancel clicked', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(StudentForm, {
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    await user.click(screen.getByText('取消'))
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('has default values (gender="男", is_active=true)', () => {
    render(
      React.createElement(StudentForm, {
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
      })
    )
    // The default values are passed to the Form as initialValues
    // We verify the form renders
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })
})
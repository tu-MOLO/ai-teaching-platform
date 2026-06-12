import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import AddRecord from '../AddRecord'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'student-1' }),
}))

vi.mock('@/services/portfolio', () => ({
  portfolioService: {
    createPortfolioItem: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/services/resource', () => ({
  uploadResource: vi.fn().mockResolvedValue({ file_url: '/files/1' }),
  extractResourceIdFromFileUrl: () => 'res-1',
}))

vi.mock('@/components', () => ({
  EvaluationForm: () => React.createElement('div', { 'data-testid': 'evaluation-form' }, 'EvaluationForm'),
}))

vi.mock('@/components/Portfolio/PortfolioTypeSelect', () => ({
  default: (props: any) => React.createElement('select', { 'data-testid': 'type-select', ...props }, React.createElement('option', { value: 'evaluation' }, '评价')),
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Form: Object.assign(
    (props: any) => React.createElement('form', { onSubmit: props.onFinish, 'data-testid': 'form' }, props.children),
    {
      Item: ({ children, name, label, rules: _rules }: any) =>
        React.createElement('div', { 'data-testid': `form-item-${name}` }, label, children),
      useForm: () => [{ getFieldValue: vi.fn(), setFieldsValue: vi.fn(), validateFields: vi.fn().mockResolvedValue({}) }],
    }
  ),
  Input: Object.assign(
    (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
    { TextArea: (props: any) => React.createElement('textarea', { ...props, 'data-testid': 'textarea' }) }
  ),
  Button: ({ children, onClick, htmlType, loading }: any) =>
    React.createElement('button', { onClick, type: htmlType, disabled: loading, 'data-testid': `btn-${children}` }, children),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  Upload: ({ children, customRequest }: any) =>
    React.createElement('div', { 'data-testid': 'upload', onClick: () => customRequest?.({ file: new File([], 'test.txt'), onSuccess: vi.fn(), onError: vi.fn() }) }, children),
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  UploadOutlined: () => React.createElement('span', null, 'Upload'),
}))

describe('AddRecord', () => {
  it('renders form', () => {
    render(React.createElement(AddRecord))
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  it('submits form', async () => {
    render(React.createElement(AddRecord))
    const form = screen.getByTestId('form')
    fireEvent.submit(form)
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/portfolio/student-1'))
  })

  it('navigates on cancel', () => {
    render(React.createElement(AddRecord))
    fireEvent.click(screen.getByTestId('btn-取消'))
    expect(mockNavigate).toHaveBeenCalledWith('/portfolio/student-1')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import EditRecord from '../EditRecord'

const mockForm = { getFieldValue: vi.fn(), setFieldsValue: vi.fn(), validateFields: vi.fn().mockResolvedValue({}) }

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'student-1', recordId: 'record-1' }),
}))

vi.mock('@/services/portfolio', () => ({
  portfolioService: {
    getPortfolioItem: vi.fn().mockResolvedValue({
      id: 'record-1',
      type: 'evaluation',
      title: 'Title',
      content: 'Content',
      attachments: '[]',
      cognitive_score: 80,
      skill_score: 90,
      creativity_score: 70,
      cooperation_score: 85,
      attention_score: 75,
    }),
    updatePortfolioItem: vi.fn().mockResolvedValue({}),
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
      Item: ({ children, name, label }: any) =>
        React.createElement('div', { 'data-testid': `form-item-${name}` }, label, children),
      useForm: () => [mockForm],
    }
  ),
  Input: Object.assign(
    (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
    { TextArea: (props: any) => React.createElement('textarea', { ...props, 'data-testid': 'textarea' }) }
  ),
  Button: ({ children, onClick, htmlType, loading, danger: _danger }: any) =>
    React.createElement('button', { onClick, type: htmlType, disabled: loading, 'data-testid': `btn-${children}` }, children),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children) },
  Upload: ({ children }: any) => React.createElement('div', { 'data-testid': 'upload' }, children),
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  UploadOutlined: () => React.createElement('span', null, 'Upload'),
  DeleteOutlined: () => React.createElement('span', null, 'Delete'),
}))

describe('EditRecord', () => {
  it('renders loading initially', () => {
    render(React.createElement(EditRecord))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })

  it('renders form after loading', async () => {
    render(React.createElement(EditRecord))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  it('submits updated record', async () => {
    render(React.createElement(EditRecord))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/portfolio/student-1'))
  })
})

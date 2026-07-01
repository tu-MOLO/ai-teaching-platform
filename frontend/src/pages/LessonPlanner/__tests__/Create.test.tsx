import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import CreateLessonPlan from '../Create'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}))

vi.mock('@/components/Common/ConfigurableSelect', () => ({
  default: (props: any) => React.createElement('select', { 'data-testid': 'config-select', ...props }),
}))

vi.mock('@/stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('@/services/lessonPlan', () => ({
  createLessonPlan: vi.fn().mockResolvedValue({}),
  getLessonPlan: vi.fn().mockResolvedValue({
    title: 'Title',
    subject: 'Math',
    grade: '一年级',
    duration: 40,
    teaching_objectives: 'obj',
    teaching_content: 'content',
    teaching_methods: 'methods',
    teaching_process: 'process',
    teaching_resources: 'resources',
    notes: 'notes',
  }),
  updateLessonPlan: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/types/error', () => ({
  BusinessError: class BusinessError extends Error {},
}))

vi.mock('antd', () => ({
  Card: ({ children, title }: any) => React.createElement('div', { 'data-testid': 'card' }, title, children),
  Form: Object.assign(
    (props: any) => React.createElement('form', { onSubmit: props.onFinish, 'data-testid': 'form' }, props.children),
    {
      Item: ({ children, name, label }: any) =>
        React.createElement('div', { 'data-testid': `form-item-${name}` }, label, children),
      useForm: () => [{ getFieldValue: vi.fn(), setFieldsValue: vi.fn(), validateFields: vi.fn().mockResolvedValue({}) }],
    }
  ),
  Input: Object.assign(
    (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
    { TextArea: (props: any) => React.createElement('textarea', { ...props, 'data-testid': 'textarea' }) }
  ),
  InputNumber: (props: any) => React.createElement('input', { type: 'number', ...props, 'data-testid': 'input-number' }),
  Radio: Object.assign(
    ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'radio', ...props }, children),
    { Group: ({ children }: any) => React.createElement('div', { 'data-testid': 'radio-group' }, children) }
  ),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  Typography: { Title: ({ children }: any) => React.createElement('h4', null, children), Text: ({ children }: any) => React.createElement('span', null, children) },
  Button: ({ children, onClick, htmlType, loading }: any) =>
    React.createElement('button', { onClick, type: htmlType, disabled: loading, 'data-testid': `btn-${children}` }, children),
  message: { success: vi.fn(), error: vi.fn() },
}))

describe('CreateLessonPlan', () => {
  it('renders create form', () => {
    render(React.createElement(CreateLessonPlan))
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  it('submits create form', async () => {
    render(React.createElement(CreateLessonPlan))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner'))
  })

  it('navigates on cancel', () => {
    render(React.createElement(CreateLessonPlan))
    fireEvent.click(screen.getByTestId('btn-取消'))
    expect(mockNavigate).toHaveBeenCalledWith('/lesson-planner')
  })
})

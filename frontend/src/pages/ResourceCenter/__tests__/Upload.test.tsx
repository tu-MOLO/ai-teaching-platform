import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import UploadPage from '../Upload'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/components/ResourceCenter/FileUpload', () => ({
  default: ({ onFileChange }: any) =>
    React.createElement('div', { 'data-testid': 'file-upload', onClick: () => onFileChange?.([{ name: 'test.txt', size: 100 }]) }, 'FileUpload'),
}))

vi.mock('@/services/resource', () => ({
  uploadResource: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/services/tag', () => ({
  getTags: vi.fn().mockResolvedValue([{ id: 't1', name: 'tag1' }]),
  createTag: vi.fn().mockResolvedValue({ id: 't2', name: 'new-tag' }),
}))

vi.mock('@/stores/dashboard', () => ({
  refreshDashboardStats: vi.fn(),
}))

vi.mock('@/types/error', () => ({
  BusinessError: class BusinessError extends Error {},
}))

vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange }: any) =>
    React.createElement('textarea', { value: value || '', onChange: (e: any) => onChange?.(e.target.value), 'data-testid': 'md-editor' }),
}))

vi.mock('antd', () => ({
  Form: Object.assign(
    (props: any) => React.createElement('form', { onSubmit: props.onFinish, 'data-testid': 'form' }, props.children),
    {
      Item: ({ children, name, label }: any) =>
        React.createElement('div', { 'data-testid': `form-item-${name}` }, label, children),
      useForm: () => [{ getFieldValue: vi.fn(), setFieldValue: vi.fn(), validateFields: vi.fn().mockResolvedValue({}) }],
    }
  ),
  Input: (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
  Select: Object.assign(
    (props: any) => React.createElement('select', { ...props, 'data-testid': 'select' }, props.children),
    { Option: ({ children, value }: any) => React.createElement('option', { value }, children) }
  ),
  Button: ({ children, onClick, htmlType, loading }: any) =>
    React.createElement('button', { onClick, type: htmlType, disabled: loading, 'data-testid': `btn-${children}` }, children),
  Space: ({ children, direction }: any) =>
    React.createElement('div', { 'data-testid': `space-${direction || 'horizontal'}` }, children),
  SpaceCompact: ({ children }: any) => React.createElement('div', { 'data-testid': 'space-compact' }, children),
  Divider: () => React.createElement('hr'),
  Collapse: ({ items }: any) =>
    React.createElement('div', { 'data-testid': 'collapse' }, items?.map((i: any) => React.createElement('div', { key: i.key }, i.label, i.children))),
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  PlusOutlined: () => React.createElement('span', null, 'Plus'),
}))

describe('UploadPage', () => {
  it('renders upload form', () => {
    render(React.createElement(UploadPage))
    expect(screen.getByTestId('form')).toBeInTheDocument()
    expect(screen.getByTestId('file-upload')).toBeInTheDocument()
  })

  it('submits form', async () => {
    render(React.createElement(UploadPage))
    fireEvent.click(screen.getByTestId('file-upload'))
    fireEvent.submit(screen.getByTestId('form'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/resource-center'))
  })

  it('cancels and navigates back', () => {
    render(React.createElement(UploadPage))
    fireEvent.click(screen.getByTestId('btn-取消'))
    expect(mockNavigate).toHaveBeenCalledWith('/resource-center')
  })
})

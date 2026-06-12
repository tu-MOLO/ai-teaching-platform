import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import ConfigurableSelect from '../ConfigurableSelect'

const mockNavigate = vi.fn()
const mockQuickCreate = vi.fn()

vi.mock('../../../hooks/useDropdownOptions', () => ({
  useDropdownOptions: () => ({
    options: [
      { label: '选项1', value: 'opt1' },
      { label: '选项2', value: 'opt2' },
    ],
    loading: false,
    quickCreate: mockQuickCreate,
  }),
}))

vi.mock('../../../constants/dropdownOptions', () => ({
  DROPDOWN_GROUP_MAP: {
    test_group: { label: '测试分组' },
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/test', search: '' }),
}))

vi.mock('antd', () => ({
  Select: ({ children, placeholder, loading, options, popupRender}: any) => {
    const popupContent = popupRender ? popupRender(null) : null
    return React.createElement(
      'div',
      {
        'data-testid': 'configurable-select',
        'data-placeholder': placeholder,
        'data-loading': loading ? 'true' : 'false',
      },
      options?.length ? React.createElement('span', { key: 'count' }, `${options.length} options`) : null,
      popupContent ? React.createElement('div', { key: 'popup', 'data-testid': 'select-popup' }, popupContent) : null,
      children ? React.createElement('div', { key: 'children' }, children) : null
    )
  },
  Button: ({ children, onClick}: any) =>
    React.createElement('button', { onClick, type: 'button' }, children),
  Divider: (_props: any) => React.createElement('hr'),
  Input: ({ placeholder, onChange, onPressEnter}: any) =>
    React.createElement('input', { placeholder, onChange, onKeyDown: onPressEnter ? (e: any) => { if (e.key === 'Enter') onPressEnter(e) } : undefined, type: 'text' }),
  Space: Object.assign(
    ({ children}: any) =>
      React.createElement('div', { 'data-testid': 'space' }, children),
    {
      Compact: ({ children}: any) =>
        React.createElement('div', { 'data-testid': 'space-compact' }, children),
    }
  ),
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@ant-design/icons', () => ({
  PlusOutlined: () => React.createElement('span', { 'data-testid': 'plus-icon' }, 'Plus'),
  SettingOutlined: () => React.createElement('span', { 'data-testid': 'setting-icon' }, 'Settings'),
}))

describe('ConfigurableSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with groupKey prop', () => {
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group' }))
    expect(screen.getByTestId('configurable-select')).toBeInTheDocument()
  })

  it('passes placeholder to Select', () => {
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group', placeholder: '请选择' }))
    const select = screen.getByTestId('configurable-select')
    expect(select.getAttribute('data-placeholder')).toBe('请选择')
  })

  it('passes loading state to Select', () => {
    vi.doMock('../../../hooks/useDropdownOptions', () => ({
      useDropdownOptions: () => ({
        options: [],
        loading: true,
        quickCreate: mockQuickCreate,
      }),
    }))
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group', loading: true }))
    const select = screen.getByTestId('configurable-select')
    expect(select).toBeInTheDocument()
  })

  it('renders options when data is loaded', () => {
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group' }))
    expect(screen.getByText('2 options')).toBeInTheDocument()
  })

  it('navigates to settings when manage button is clicked', async () => {
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group' }))
    const manageButton = screen.getByText('管理测试分组')
    await userEvent.click(manageButton)
    expect(mockNavigate).toHaveBeenCalledWith('/settings?tab=dropdowns&group=test_group&returnTo=%2Ftest')
  })

  it('renders quick create input and button', () => {
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group' }))
    expect(screen.getByPlaceholderText('快捷新增选项')).toBeInTheDocument()
    expect(screen.getByText('新增')).toBeInTheDocument()
  })

  it('calls quickCreate when Enter is pressed in quick create input', async () => {
    render(React.createElement(ConfigurableSelect, { groupKey: 'test_group' }))
    const input = screen.getByPlaceholderText('快捷新增选项')
    await userEvent.type(input, 'New Option')
    await userEvent.keyboard('{Enter}')
    expect(mockQuickCreate).toHaveBeenCalledWith('New Option')
  })
})
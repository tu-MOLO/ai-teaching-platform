import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/settings', search: '' }),
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

const mockGetAIConfig = vi.fn().mockResolvedValue({
  provider: 'zhipu',
  provider_name: '',
  api_base: 'https://api.example.com',
  model: 'glm-4',
  api_key: '',
  is_active: true,
  is_user_configured: false,
})
const mockUpdateAIConfig = vi.fn().mockResolvedValue({
  provider: 'zhipu',
  provider_name: '',
  api_base: 'https://api.example.com',
  model: 'glm-4',
  api_key: 'sk-xxxx',
  is_active: true,
  is_user_configured: true,
})
const mockTestAIConfig = vi.fn().mockResolvedValue({ success: true, message: 'OK' })
const mockResetAIConfig = vi.fn().mockResolvedValue({
  provider: 'zhipu',
  provider_name: '',
  api_base: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4.7-flash',
  api_key: '',
  is_active: true,
  is_user_configured: false,
})

vi.mock('../../../services/ai', () => ({
  getAIConfig: (...args: any[]) => mockGetAIConfig(...args),
  updateAIConfig: (...args: any[]) => mockUpdateAIConfig(...args),
  testAIConfig: (...args: any[]) => mockTestAIConfig(...args),
  resetAIConfig: (...args: any[]) => mockResetAIConfig(...args),
  PROVIDER_DEFAULTS: {
    zhipu: { name: '智谱AI', api_base: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4'] },
    deepseek: { name: 'DeepSeek', api_base: 'https://api.deepseek.com/v1', models: ['deepseek-chat'] },
    custom: { name: '自定义', api_base: '', models: [] },
  },
}))

const mockGetDropdownOptions = vi.fn().mockResolvedValue([])
const mockCreateDropdownOption = vi.fn().mockResolvedValue({})
const mockUpdateDropdownOption = vi.fn().mockResolvedValue({})
const mockDeleteDropdownOption = vi.fn().mockResolvedValue({})

vi.mock('../../../services/dropdownOption', () => ({
  getDropdownOptions: (...args: any[]) => mockGetDropdownOptions(...args),
  createDropdownOption: (...args: any[]) => mockCreateDropdownOption(...args),
  updateDropdownOption: (...args: any[]) => mockUpdateDropdownOption(...args),
  deleteDropdownOption: (...args: any[]) => mockDeleteDropdownOption(...args),
}))

vi.mock('../../../services/localSettings', () => ({
  default: {
    getBasicSettings: vi.fn().mockReturnValue({ schoolName: '', contactEmail: '', contactPhone: '' }),
    saveBasicSettings: vi.fn(),
  },
}))

vi.mock('../../../stores/portfolioTypes', () => ({
  usePortfolioTypesStore: () => ({
    types: [
      { id: 'work', name: '作品', icon: '📝', isDefault: true },
      { id: 'evaluation', name: '评价', icon: '📋', isDefault: true },
    ],
    resetToDefault: vi.fn(),
  }),
}))

vi.mock('../../../components/Theme/ThemeSettings', () => ({
  default: () => React.createElement('div', { 'data-testid': 'theme-settings' }, 'ThemeSettings'),
}))

vi.mock('../../../constants/dropdownOptions', () => ({
  DROPDOWN_GROUPS: [{ key: 'student_grade', label: '学生年级' }, { key: 'course_subject', label: '课程学科' }],
  DROPDOWN_GROUP_MAP: { student_grade: { label: '学生年级' }, course_subject: { label: '课程学科' } },
}))

vi.mock('antd', () => {
  const FormItem = ({ children, name, label, rules: _rules, extra: _extra }: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}` }, label ? React.createElement('label', null, label) : null, children)
  const FormComp = ({ children, form: _form, layout: _layout, onFinish, initialValues: _initialValues, ...props }: any) => {
    return React.createElement('form', { 'data-testid': 'form', onSubmit: (e: any) => { e.preventDefault(); onFinish?.({}) }, ...props }, children)
  }
  FormComp.Item = FormItem
  FormComp.useForm = () => [
    {
      validateFields: vi.fn().mockResolvedValue({}),
      getFieldValue: vi.fn().mockReturnValue(''),
      resetFields: vi.fn(),
      setFieldsValue: vi.fn(),
    },
  ]
  const SelectComp = ({ placeholder, options, onChange, children, value }: any) =>
    React.createElement('select', { 'data-testid': `select-${placeholder || 'default'}`, value, onChange: (e: any) => onChange?.(e.target.value) },
      options?.map((opt: any) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)),
      children,
    )
  SelectComp.Option = ({ children, value }: any) => React.createElement('option', { value }, children)

  return {
    Form: FormComp,
    Card: ({ children, title, size: _size, style: _style }: any) =>
      React.createElement('div', { 'data-testid': 'card' }, title, children),
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Password: (props: any) => React.createElement('input', { type: 'password', ...props }) }
    ),
    InputNumber: (props: any) => React.createElement('input', { type: 'number', ...props }),
    Button: ({ children, onClick, loading, icon, ...props }: any) =>
      React.createElement('button', { onClick, disabled: loading, 'data-testid': `btn-${children}`, ...props }, icon, children),
    Select: SelectComp,
    Space: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'space' }, children),
    Row: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'row', ...props }, children),
    Col: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'col', ...props }, children),
    Table: ({ dataSource, columns: _columns, loading: _loading }: any) =>
      React.createElement('div', { 'data-testid': 'table' },
        React.createElement('span', { 'data-testid': 'table-count' }, String(dataSource?.length || 0)),
      ),
    Tabs: ({ defaultActiveKey: _defaultActiveKey, items }: any) =>
      React.createElement('div', { 'data-testid': 'tabs' },
        items?.map((item: any) => React.createElement('div', { key: item.key, 'data-testid': `tab-${item.key}` }, item.label, item.children)),
      ),
    Typography: { Text: ({ children, type: _type }: any) => React.createElement('span', null, children) },
    Alert: ({ message, type: _type, icon: _icon, showIcon: _showIcon }: any) =>
      React.createElement('div', { 'data-testid': 'alert' }, message),
    Popconfirm: ({ children, title, onConfirm }: any) =>
      React.createElement('div', { 'data-testid': 'popconfirm', title }, React.createElement('button', { onClick: onConfirm, 'data-testid': 'popconfirm-btn' }, '确认'), children),
    Divider: () => React.createElement('hr', { 'data-testid': 'divider' }),
    Modal: Object.assign(
      ({ children, open, title, footer }: any) =>
        open ? React.createElement('div', { 'data-testid': 'modal', role: 'dialog' },
          React.createElement('div', null, title),
          children,
          ...(footer || [])
        ) : null,
      { confirm: vi.fn() }
    ),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    ApiOutlined: icon('ApiOutlined'),
    ArrowLeftOutlined: icon('ArrowLeftOutlined'),
    CheckCircleOutlined: icon('CheckCircleOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    ReloadOutlined: icon('ReloadOutlined'),
    SettingOutlined: icon('SettingOutlined'),
    PlusOutlined: icon('PlusOutlined'),
    SaveOutlined: icon('SaveOutlined'),
    SkinOutlined: icon('SkinOutlined'),
    TagsOutlined: icon('TagsOutlined'),
    UnorderedListOutlined: icon('UnorderedListOutlined'),
    WarningOutlined: icon('WarningOutlined'),
  }
})

const Settings = (await import('../index')).default

describe('Settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAIConfig.mockResolvedValue({
      provider: 'zhipu',
      provider_name: '',
      api_base: 'https://api.example.com',
      model: 'glm-4',
      api_key: '',
      is_active: true,
      is_user_configured: false,
    })
  })

  it('should render settings page', () => {
    render(React.createElement(Settings))
    expect(screen.getByText('系统设置')).toBeInTheDocument()
  })

  it('should display settings tabs', () => {
    render(React.createElement(Settings))
    expect(screen.getByTestId('tab-basic')).toBeInTheDocument()
    expect(screen.getByTestId('tab-ai')).toBeInTheDocument()
    expect(screen.getByTestId('tab-theme')).toBeInTheDocument()
    expect(screen.getByTestId('tab-dropdowns')).toBeInTheDocument()
    expect(screen.getByTestId('tab-portfolio-types')).toBeInTheDocument()
  })

  it('should render AI config section and load config', async () => {
    render(React.createElement(Settings))
    expect(screen.getByText('AI 助手配置')).toBeInTheDocument()
    await waitFor(() => expect(mockGetAIConfig).toHaveBeenCalled())
  })

  it('should show warning alert when no api key and not user configured', async () => {
    render(React.createElement(Settings))
    await waitFor(() => expect(screen.getByText('请配置 API 密钥以启用 AI 助手功能')).toBeInTheDocument())
  })

  it('should show success alert when user configured', async () => {
    mockGetAIConfig.mockResolvedValueOnce({
      provider: 'zhipu',
      provider_name: '',
      api_base: 'https://api.example.com',
      model: 'glm-4',
      api_key: 'sk-xxxx',
      is_active: true,
      is_user_configured: true,
    })
    render(React.createElement(Settings))
    await waitFor(() => expect(screen.getByText(/已配置个人 API 密钥/)).toBeInTheDocument())
  })

  it('should show info alert when has api key but not user configured', async () => {
    mockGetAIConfig.mockResolvedValueOnce({
      provider: 'zhipu',
      provider_name: '',
      api_base: 'https://api.example.com',
      model: 'glm-4',
      api_key: 'sk-system-default',
      is_active: true,
      is_user_configured: false,
    })
    render(React.createElement(Settings))
    await waitFor(() => expect(screen.getByText('当前使用系统默认配置')).toBeInTheDocument())
  })

  it('should handle AI config save', async () => {
    render(React.createElement(Settings))
    await waitFor(() => expect(mockGetAIConfig).toHaveBeenCalled())
    const saveBtn = screen.getByTestId('btn-保存配置')
    fireEvent.click(saveBtn)
    await waitFor(() => expect(mockUpdateAIConfig).toHaveBeenCalled())
  })

  it('should handle AI config test', async () => {
    render(React.createElement(Settings))
    await waitFor(() => expect(mockGetAIConfig).toHaveBeenCalled())
    const testBtn = screen.getByTestId('btn-测试连接')
    fireEvent.click(testBtn)
    await waitFor(() => expect(mockTestAIConfig).toHaveBeenCalled())
  })

  it('should handle AI config reset', async () => {
    render(React.createElement(Settings))
    await waitFor(() => expect(mockGetAIConfig).toHaveBeenCalled())
    const resetBtn = screen.getByTestId('btn-重置为默认值')
    fireEvent.click(resetBtn)
    await waitFor(() => expect(mockResetAIConfig).toHaveBeenCalled())
  })

  it('should render dropdown options section', () => {
    render(React.createElement(Settings))
    expect(screen.getByText('选择选项分组')).toBeInTheDocument()
  })

  it('should render portfolio types section', () => {
    render(React.createElement(Settings))
    expect(screen.getByText('记录类型')).toBeInTheDocument()
  })

  it('should handle basic settings save', () => {
    render(React.createElement(Settings))
    const basicTab = screen.getByTestId('tab-basic')
    expect(basicTab).toBeInTheDocument()
  })

  it('should load dropdown options when group selected', async () => {
    render(React.createElement(Settings))
    await waitFor(() => expect(mockGetDropdownOptions).toHaveBeenCalledWith('student_grade', false))
  })
})

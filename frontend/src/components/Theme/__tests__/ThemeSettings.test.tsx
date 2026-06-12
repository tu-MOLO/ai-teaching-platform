import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ThemeSettings from '../ThemeSettings'

const mockSetThemeByPreset = vi.fn()
const mockSaveCustomTheme = vi.fn()
const mockRenameCustomTheme = vi.fn()
const mockDeleteCustomTheme = vi.fn()
const mockLoadCustomTheme = vi.fn()
const mockResetToDefault = vi.fn()
const mockCanUndo = vi.fn().mockReturnValue(false)
const mockApplyThemeToDom = vi.fn()

const mockUseThemeStore = vi.fn().mockReturnValue({
  currentThemeId: 'theme-1',
  isCustom: false,
  customThemes: [],
  setThemeByPreset: mockSetThemeByPreset,
  saveCustomTheme: mockSaveCustomTheme,
  renameCustomTheme: mockRenameCustomTheme,
  deleteCustomTheme: mockDeleteCustomTheme,
  loadCustomTheme: mockLoadCustomTheme,
  resetToDefault: mockResetToDefault,
  canUndo: mockCanUndo,
  applyThemeToDom: mockApplyThemeToDom,
})

vi.mock('../../../stores/theme', () => ({
  useThemeStore: () => mockUseThemeStore(),
  CustomTheme: {} as any,
}))

vi.mock('../../../constants/themes', () => ({
  presetThemes: [
    {
      id: 'theme-1',
      name: 'Default',
      description: 'Default theme',
      colors: { '--color-primary': '#1890ff' },
      previewColors: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff'],
    },
    {
      id: 'theme-2',
      name: 'Dark',
      description: 'Dark theme',
      colors: { '--color-primary': '#001529' },
      previewColors: ['#001529', '#002140', '#003355', '#004a6e', '#00608a'],
    },
  ],
}))

vi.mock('../ColorVariableEditor', () => ({
  default: () => React.createElement('div', { 'data-testid': 'color-variable-editor' }, 'ColorVariableEditor'),
}))

vi.mock('../ContrastWarning', () => ({
  default: () => React.createElement('div', { 'data-testid': 'contrast-warning' }, 'ContrastWarning'),
  ContrastDetails: () => React.createElement('div', { 'data-testid': 'contrast-details' }, 'ContrastDetails'),
}))

vi.mock('../HistoryControls', () => ({
  default: () => React.createElement('div', { 'data-testid': 'history-controls' }, 'HistoryControls'),
}))

vi.mock('../PresetThemeCard', () => ({
  default: ({ theme, isSelected: _isSelected, onClick }: any) =>
    React.createElement('div', { 'data-testid': 'preset-theme-card', 'data-theme-id': theme.id, onClick }, theme.name),
}))

vi.mock('../ThemePreview', () => ({
  default: () => React.createElement('div', { 'data-testid': 'theme-preview' }, 'ThemePreview'),
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick, disabled: _disabled }: any) =>
    React.createElement('button', { onClick, disabled: _disabled, 'data-testid': 'button', type: 'button' }, children),
  Card: ({ children, onClick }: any) =>
    React.createElement('div', { 'data-testid': 'card', onClick }, children),
  Col: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'col' }, children),
  Divider: () => React.createElement('hr', { 'data-testid': 'divider' }),
  Input: ({ placeholder, value, onChange }: any) =>
    React.createElement('input', { placeholder, value, 'data-testid': 'input', onChange: onChange ? (e: any) => onChange(e) : undefined, type: 'text' }),
  Modal: ({ children, open }: any) =>
    open ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
  Popconfirm: ({ children, onConfirm }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'popconfirm', onClick: (e: any) => { e.stopPropagation(); onConfirm?.(e) } },
      children
    ),
  Row: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'row' }, children),
  Space: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'space' }, children),
  Typography: {
    Text: ({ children, type: _type, style: _style }: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-type': _type, style: _style }, children),
    Title: ({ children, style: _style }: any) =>
      React.createElement('h5', { 'data-testid': 'title', style: _style }, children),
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => React.createElement('span', null, 'Delete'),
  EditOutlined: () => React.createElement('span', null, 'Edit'),
  FileAddOutlined: () => React.createElement('span', null, 'FileAdd'),
  ReloadOutlined: () => React.createElement('span', null, 'Reload'),
  SaveOutlined: () => React.createElement('span', null, 'Save'),
  SkinOutlined: () => React.createElement('span', null, 'Skin'),
}))

describe('ThemeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseThemeStore.mockReturnValue({
      currentThemeId: 'theme-1',
      isCustom: false,
      customThemes: [],
      setThemeByPreset: mockSetThemeByPreset,
      saveCustomTheme: mockSaveCustomTheme,
      renameCustomTheme: mockRenameCustomTheme,
      deleteCustomTheme: mockDeleteCustomTheme,
      loadCustomTheme: mockLoadCustomTheme,
      resetToDefault: mockResetToDefault,
      canUndo: mockCanUndo,
      applyThemeToDom: mockApplyThemeToDom,
    })
  })

  it('renders "预设配色方案" section', () => {
    render(React.createElement(ThemeSettings))
    expect(screen.getByText('预设配色方案')).toBeInTheDocument()
  })

  it('renders "保存方案" button', () => {
    render(React.createElement(ThemeSettings))
    expect(screen.getByText('保存方案')).toBeInTheDocument()
  })

  it('renders "恢复默认" button', () => {
    render(React.createElement(ThemeSettings))
    expect(screen.getByText('恢复默认')).toBeInTheDocument()
  })

  it('renders ColorVariableEditor and ThemePreview', () => {
    render(React.createElement(ThemeSettings))
    expect(screen.getByTestId('color-variable-editor')).toBeInTheDocument()
    expect(screen.getByTestId('theme-preview')).toBeInTheDocument()
  })

  it('renders ContrastWarning', () => {
    render(React.createElement(ThemeSettings))
    expect(screen.getByTestId('contrast-warning')).toBeInTheDocument()
    expect(screen.getByTestId('contrast-details')).toBeInTheDocument()
  })

  it('clicks preset theme card', () => {
    render(React.createElement(ThemeSettings))
    const cards = screen.getAllByTestId('preset-theme-card')
    fireEvent.click(cards[0])
    expect(mockSetThemeByPreset).toHaveBeenCalled()
  })

  it('opens save modal and saves custom theme', () => {
    mockCanUndo.mockReturnValue(true)
    render(React.createElement(ThemeSettings))
    fireEvent.click(screen.getByText('保存方案'))
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'My Theme' } })
    fireEvent.click(screen.getByTestId('modal'))
  })

  it('clicks reset to default', () => {
    render(React.createElement(ThemeSettings))
    fireEvent.click(screen.getByText('恢复默认'))
    expect(mockResetToDefault).toHaveBeenCalled()
  })

  it('renders custom themes and handles interactions', () => {
    mockUseThemeStore.mockReturnValue({
      currentThemeId: 'custom',
      isCustom: true,
      customThemes: [{ id: 'ct1', name: 'Custom 1', createdAt: Date.now(), colors: { primary: '#000' } }],
      setThemeByPreset: mockSetThemeByPreset,
      saveCustomTheme: mockSaveCustomTheme,
      renameCustomTheme: mockRenameCustomTheme,
      deleteCustomTheme: mockDeleteCustomTheme,
      loadCustomTheme: mockLoadCustomTheme,
      resetToDefault: mockResetToDefault,
      canUndo: mockCanUndo,
      applyThemeToDom: mockApplyThemeToDom,
    })
    render(React.createElement(ThemeSettings))
    expect(screen.getByText('Custom 1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Custom 1'))
    expect(mockLoadCustomTheme).toHaveBeenCalledWith('ct1')
  })
})

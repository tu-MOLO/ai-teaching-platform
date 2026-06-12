import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import HistoryControls from '../HistoryControls'

const mockUndo = vi.fn()
const mockRedo = vi.fn()

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    undo: mockUndo,
    redo: mockRedo,
    canUndo: () => true,
    canRedo: () => true,
    history: [{}, {}],
    historyIndex: 1,
  }),
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick, disabled, icon }: any) =>
    React.createElement('button', { onClick, disabled, 'data-testid': `btn-${children}` }, icon, children),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Tooltip: ({ children }: any) => React.createElement('div', null, children),
  Badge: ({ count }: any) => React.createElement('span', { 'data-testid': 'badge' }, count),
}))

vi.mock('@ant-design/icons', () => ({
  UndoOutlined: () => React.createElement('span', null, 'Undo'),
  RedoOutlined: () => React.createElement('span', null, 'Redo'),
}))

describe('HistoryControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders undo and redo buttons', () => {
    render(React.createElement(HistoryControls))
    expect(screen.getByTestId('btn-撤销')).toBeInTheDocument()
    expect(screen.getByTestId('btn-重做')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toBeInTheDocument()
  })

  it('calls undo when undo button clicked', () => {
    render(React.createElement(HistoryControls))
    fireEvent.click(screen.getByTestId('btn-撤销'))
    expect(mockUndo).toHaveBeenCalled()
  })

  it('calls redo when redo button clicked', () => {
    render(React.createElement(HistoryControls))
    fireEvent.click(screen.getByTestId('btn-重做'))
    expect(mockRedo).toHaveBeenCalled()
  })

  it('triggers keyboard shortcut for undo', () => {
    render(React.createElement(HistoryControls))
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(mockUndo).toHaveBeenCalled()
  })

  it('triggers keyboard shortcut for redo', () => {
    render(React.createElement(HistoryControls))
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(mockRedo).toHaveBeenCalled()
  })
})

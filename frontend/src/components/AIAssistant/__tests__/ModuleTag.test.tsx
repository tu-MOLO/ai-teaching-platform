import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ModuleTag from '../ModuleTag'

vi.mock('antd', () => ({
  Tag: ({ children, color, closable, onClose}: any) =>
    React.createElement('span', {
      'data-testid': 'tag',
      'data-color': color,
      'data-closable': closable ? 'true' : 'false',
      onClick: onClose,
    }, children),
}))

describe('ModuleTag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders label text', () => {
    render(React.createElement(ModuleTag, { label: '教案设计', color: 'blue' }))
    expect(screen.getByText('教案设计')).toBeInTheDocument()
  })

  it('renders with color', () => {
    render(React.createElement(ModuleTag, { label: '教案设计', color: 'green' }))
    const tag = screen.getByTestId('tag')
    expect(tag.getAttribute('data-color')).toBe('green')
  })

  it('renders closable tag when closable prop is true', () => {
    render(React.createElement(ModuleTag, { label: '教案设计', color: 'blue', closable: true }))
    const tag = screen.getByTestId('tag')
    expect(tag.getAttribute('data-closable')).toBe('true')
  })

  it('calls onClose when close is triggered', () => {
    const mockOnClose = vi.fn()
    render(React.createElement(ModuleTag, { label: '教案设计', color: 'blue', closable: true, onClose: mockOnClose }))
    const tag = screen.getByTestId('tag')
    tag.click()
    expect(mockOnClose).toHaveBeenCalled()
  })
})
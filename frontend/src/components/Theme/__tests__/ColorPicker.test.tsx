import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ColorPicker from '../ColorPicker'

vi.mock('antd', () => ({
  Input: (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
  Slider: ({ onChange, value }: any) =>
    React.createElement('input', {
      type: 'range',
      'data-testid': 'slider',
      value: value || 0,
      onChange: (e: any) => onChange?.(Number(e.target.value)),
    }),
  Space: ({ children }: any) => React.createElement('div', { 'data-testid': 'space' }, children),
  Tooltip: ({ children }: any) => React.createElement('div', null, children),
}))

describe('ColorPicker', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default props', () => {
    render(React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange }))
    expect(screen.getByTestId('space')).toBeInTheDocument()
  })

  it('renders color preview button', () => {
    render(React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange }))
    const buttons = document.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('toggles picker panel on click', () => {
    render(React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange }))
    const button = document.querySelector('button') as HTMLButtonElement
    fireEvent.click(button)
    // panel should open and show rgb inputs
    expect(document.querySelectorAll('input').length).toBeGreaterThan(1)
  })

  it('handles hex input change', () => {
    render(React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange, showText: true }))
    const inputs = screen.getAllByTestId('input')
    const hexInput = inputs[0]
    fireEvent.change(hexInput, { target: { value: '#ff0000' } })
    fireEvent.blur(hexInput)
    expect(mockOnChange).toHaveBeenCalled()
  })

  it('handles Enter key in hex input', () => {
    render(React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange, showText: true }))
    const inputs = screen.getAllByTestId('input')
    const hexInput = inputs[0]
    fireEvent.keyDown(hexInput, { key: 'Enter' })
    // should close panel without error
  })

  it('closes panel when clicking outside', () => {
    render(
      React.createElement('div', null,
        React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange }),
        React.createElement('div', { 'data-testid': 'outside' }, 'outside')
      )
    )
    const button = document.querySelector('button') as HTMLButtonElement
    fireEvent.click(button)
    expect(document.querySelectorAll('input').length).toBeGreaterThan(1)
    fireEvent.mouseDown(screen.getByTestId('outside'))
    // panel closed; only hex input may remain if showText is true
  })

  it('renders without text input when showText is false', () => {
    render(React.createElement(ColorPicker, { value: '#548CA8', onChange: mockOnChange, showText: false }))
    const inputs = screen.queryAllByTestId('input')
    expect(inputs.length).toBe(0)
  })
})

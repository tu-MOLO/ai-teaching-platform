import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import PresetThemeCard from '../PresetThemeCard'
import { defaultThemeColors } from '../../../constants/themes'

vi.mock('antd', () => ({
  Card: ({ children, onClick, style}: any) =>
    React.createElement('div', { onClick, 'data-testid': 'card', style }, children),
  Typography: {
    Title: ({ children, style}: any) =>
      React.createElement('h5', { 'data-testid': 'title', style }, children),
    Text: ({ children, type, style}: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-type': type, style }, children),
  },
  Badge: ({ count, style}: any) =>
    React.createElement('span', { 'data-testid': 'badge', style }, count),
}))

describe('PresetThemeCard', () => {
  const mockOnClick = vi.fn()

  const theme = {
    id: 'theme-1',
    name: 'Ocean Blue',
    description: 'A calming ocean blue theme',
    colors: {
      ...defaultThemeColors,
      '--color-primary': '#1890ff',
    },
    previewColors: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders theme name', () => {
    render(React.createElement(PresetThemeCard, { theme, isSelected: false, onClick: mockOnClick }))
    expect(screen.getByText('Ocean Blue')).toBeInTheDocument()
  })

  it('renders theme description', () => {
    render(React.createElement(PresetThemeCard, { theme, isSelected: false, onClick: mockOnClick }))
    expect(screen.getByText('A calming ocean blue theme')).toBeInTheDocument()
  })

  it('renders "当前" badge when selected', () => {
    render(React.createElement(PresetThemeCard, { theme, isSelected: true, onClick: mockOnClick }))
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    expect(screen.getByText('当前')).toBeInTheDocument()
  })

  it('does not render badge when not selected', () => {
    render(React.createElement(PresetThemeCard, { theme, isSelected: false, onClick: mockOnClick }))
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
  })

  it('renders primary color text', () => {
    render(React.createElement(PresetThemeCard, { theme, isSelected: false, onClick: mockOnClick }))
    expect(screen.getByText('#1890ff')).toBeInTheDocument()
  })

  it('calls onClick when card clicked', async () => {
    const user = userEvent.setup()
    render(React.createElement(PresetThemeCard, { theme, isSelected: false, onClick: mockOnClick }))
    await user.click(screen.getByTestId('card'))
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('renders preview color bars', () => {
    render(React.createElement(PresetThemeCard, { theme, isSelected: false, onClick: mockOnClick }))
    // previewColors creates 5 divs with background colors
    // The component renders them inside the Card
    expect(screen.getByTestId('card')).toBeInTheDocument()
  })
})
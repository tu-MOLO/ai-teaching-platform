import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Layout from '../index'

const mockStartAutoRefresh = vi.fn()
const mockStopAutoRefresh = vi.fn()

vi.mock('../../../stores/dashboard', () => ({
  useDashboardStore: (selector: any) => {
    const state = {
      startAutoRefresh: mockStartAutoRefresh,
      stopAutoRefresh: mockStopAutoRefresh,
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('react-router-dom', () => ({
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }, 'Outlet'),
  useNavigate: () => vi.fn(),
}))

vi.mock('antd', () => {
  const LayoutComp = ({ children, className}: any) =>
    React.createElement('div', { className, 'data-testid': 'ant-layout' }, children)
  const ContentComp = ({ children, className}: any) =>
    React.createElement('div', { className, 'data-testid': 'content' }, children)

  return {
    Layout: Object.assign(LayoutComp, { Content: ContentComp }),
    Drawer: ({ children, open}: any) =>
      open ? React.createElement('div', { 'data-testid': 'drawer' }, children) : null,
  }
})

vi.mock('../../Sidebar', () => ({
  default: (_props: any) =>
    React.createElement('div', { 'data-testid': 'sidebar' }, 'Sidebar'),
}))

vi.mock('../../Header', () => ({
  default: (_props: any) =>
    React.createElement('div', { 'data-testid': 'header' }, 'Header'),
}))

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders layout structure with Outlet', () => {
    render(React.createElement(Layout))
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('calls startAutoRefresh on mount', () => {
    render(React.createElement(Layout))
    expect(mockStartAutoRefresh).toHaveBeenCalled()
  })

  it('calls stopAutoRefresh on unmount', () => {
    const { unmount } = render(React.createElement(Layout))
    unmount()
    expect(mockStopAutoRefresh).toHaveBeenCalled()
  })
})
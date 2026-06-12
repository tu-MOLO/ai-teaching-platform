import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

vi.mock('../router/index', () => ({
  default: [
    { path: '/', element: React.createElement('div', { 'data-testid': 'home' }, 'Home') },
    { path: '/login', element: React.createElement('div', { 'data-testid': 'login' }, 'Login') },
  ],
}))

vi.mock('../stores/theme', () => ({
  initTheme: vi.fn(),
}))

vi.mock('../stores/auth', () => ({
  useAuthStore: {
    getState: () => ({ hydrate: vi.fn() }),
  },
}))

describe('App', () => {
  it('renders app with routes', () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(App)
      )
    )
    expect(screen.getByTestId('home')).toBeInTheDocument()
  })
})

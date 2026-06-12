import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import router from '../index'

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: true, isInitializing: false }),
}))

vi.mock('../../components/Layout', () => ({
  default: ({ children }: any) => React.createElement('div', { 'data-testid': 'layout' }, children),
}))

vi.mock('antd', () => ({
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
}))

vi.mock('../../pages/Login', () => ({
  default: () => React.createElement('div', { 'data-testid': 'login-page' }, 'Login'),
}))

describe('router', () => {
  it('has routes defined', () => {
    expect(router.length).toBeGreaterThan(0)
  })

  it('contains login route', () => {
    const loginRoute = router.find((r: any) => r.path === '/login')
    expect(loginRoute).toBeDefined()
  })

  it('contains protected layout route', () => {
    const layoutRoute = router.find((r: any) => r.path === '/')
    expect(layoutRoute).toBeDefined()
    expect((layoutRoute as any).children).toBeDefined()
    expect((layoutRoute as any).children.length).toBeGreaterThan(0)
  })

  it('renders login route', async () => {
    const testRouter = createMemoryRouter(router, { initialEntries: ['/login'] })
    render(React.createElement(RouterProvider, { router: testRouter }))
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument())
  })

  it('renders protected layout route', async () => {
    const testRouter = createMemoryRouter(router, { initialEntries: ['/'] })
    render(React.createElement(RouterProvider, { router: testRouter }))
    await waitFor(() => expect(screen.getByTestId('layout')).toBeInTheDocument())
  })
})

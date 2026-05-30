import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import ErrorBoundary from '../ErrorBoundary'

vi.mock('antd', () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement('button', { onClick, 'data-loading': props.loading, type: props.htmlType }, children),
  Result: ({ title, subTitle, extra }: any) =>
    React.createElement('div', { 'data-testid': 'error-result' },
      React.createElement('h2', null, title),
      React.createElement('p', null, subTitle),
      extra
    ),
}))

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return React.createElement('div', { 'data-testid': 'child-content' }, 'Normal content')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render children normally when no error', () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent, { shouldThrow: false })
      )
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('should catch errors and display fallback UI', () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent, { shouldThrow: true })
      )
    )

    expect(screen.getByTestId('error-result')).toBeInTheDocument()
    expect(screen.getByText('页面出现错误')).toBeInTheDocument()
  })

  it('should display error message in fallback', () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent, { shouldThrow: true })
      )
    )

    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should display default message when error has no message', () => {
    const ThrowNoMessage = () => {
      throw new Error()
    }

    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowNoMessage)
      )
    )

    expect(screen.getByText('应用遇到了意外错误，请尝试刷新页面')).toBeInTheDocument()
  })

  it('should display retry button', () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent, { shouldThrow: true })
      )
    )

    expect(screen.getByText('重试')).toBeInTheDocument()
  })

  it('should display refresh button', () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent, { shouldThrow: true })
      )
    )

    expect(screen.getByText('刷新页面')).toBeInTheDocument()
  })

  it('should reset error state when retry is clicked', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    const ConditionalThrower = () => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return React.createElement('div', { 'data-testid': 'recovered' }, 'Recovered')
    }

    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ConditionalThrower)
      )
    )

    expect(screen.getByTestId('error-result')).toBeInTheDocument()

    shouldThrow = false
    await user.click(screen.getByText('重试'))

    expect(screen.getByTestId('recovered')).toBeInTheDocument()
  })
})

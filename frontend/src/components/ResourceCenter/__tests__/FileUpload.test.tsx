import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import FileUpload from '../FileUpload'

vi.mock('react-dropzone', () => ({
  useDropzone: (_props: any) => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    fileRejections: [],
  }),
}))

vi.mock('antd', () => ({
  message: { success: vi.fn(), error: vi.fn() },
  Progress: ({ percent }: any) => React.createElement('div', { 'data-testid': 'progress', 'data-percent': percent }),
}))

describe('FileUpload', () => {
  const mockOnFileChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropzone area', () => {
    render(React.createElement(FileUpload, { onFileChange: mockOnFileChange }))
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('renders progress when uploadPercent is provided', () => {
    render(React.createElement(FileUpload, { onFileChange: mockOnFileChange, uploadPercent: 50 }))
    expect(screen.getByTestId('progress')).toBeInTheDocument()
    expect(screen.getByTestId('progress').getAttribute('data-percent')).toBe('50')
  })

  it('does not render progress when uploadPercent is 0', () => {
    render(React.createElement(FileUpload, { onFileChange: mockOnFileChange, uploadPercent: 0 }))
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument()
  })

  it('handles drag enter and leave', () => {
    render(React.createElement(FileUpload, { onFileChange: mockOnFileChange }))
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.dragEnter(dropzone)
    fireEvent.dragLeave(dropzone)
    // should not throw
  })
})

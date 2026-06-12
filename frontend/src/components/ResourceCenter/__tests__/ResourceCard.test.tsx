import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ResourceCard from '../ResourceCard'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, 'data-testid': 'link', ...props }, children),
}))

vi.mock('antd', () => ({
  Card: ({ children}: any) =>
    React.createElement('div', { 'data-testid': 'card' }, children),
  Tag: ({ children}: any) =>
    React.createElement('span', { 'data-testid': 'tag' }, children),
}))

describe('ResourceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseResource = {
    id: 'res-1',
    name: 'Test Resource',
    description: 'A test resource description',
    file_name: 'test.png',
    file_type: 'image/png',
    file_size: 1048576,
    user_id: 'u1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    tags: [
      { id: 'tag-1', name: 'JavaScript' },
      { id: 'tag-2', name: 'React' },
    ],
  }

  it('renders resource name', () => {
    render(React.createElement(ResourceCard, { resource: baseResource }))
    expect(screen.getByText('Test Resource')).toBeInTheDocument()
  })

  it('renders file icon based on file_type', () => {
    render(React.createElement(ResourceCard, { resource: { ...baseResource, file_type: 'image/png' } }))
    expect(screen.getByText('🖼️')).toBeInTheDocument()
  })

  it('renders description (truncated if > 100 chars)', () => {
    const longDesc = 'a'.repeat(150)
    render(React.createElement(ResourceCard, { resource: { ...baseResource, description: longDesc } }))
    expect(screen.getByText(/a{100}\.\.\./)).toBeInTheDocument()
  })

  it('renders tags (max 3 + overflow tag)', () => {
    const manyTags = [
      { id: 'tag-1', name: 'A' },
      { id: 'tag-2', name: 'B' },
      { id: 'tag-3', name: 'C' },
      { id: 'tag-4', name: 'D' },
    ]
    render(React.createElement(ResourceCard, { resource: { ...baseResource, tags: manyTags } }))
    const tags = screen.getAllByTestId('tag')
    expect(tags.length).toBe(4)
    expect(tags[3].textContent).toBe('+1')
  })

  it('renders formatted file size', () => {
    render(React.createElement(ResourceCard, { resource: { ...baseResource, file_size: 1048576 } }))
    expect(screen.getByText('1.00 MB')).toBeInTheDocument()
  })

  it('renders formatted date', () => {
    render(React.createElement(ResourceCard, { resource: baseResource }))
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  it('link points to /resource-center/{resource.id}', () => {
    render(React.createElement(ResourceCard, { resource: baseResource }))
    const link = screen.getByTestId('link')
    expect(link.getAttribute('href')).toBe('/resource-center/res-1')
  })

  it('renders "暂无描述" when no description', () => {
    render(React.createElement(ResourceCard, { resource: { ...baseResource, description: '' } }))
    expect(screen.getByText('暂无描述')).toBeInTheDocument()
  })
})
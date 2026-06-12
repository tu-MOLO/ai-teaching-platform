import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import TagFilter from '../TagFilter'

vi.mock('antd', () => {
  const SelectOption = ({ children, value}: any) =>
    React.createElement('option', { value }, children)

  const SelectComp = ({ children, value, onChange}: any) =>
    React.createElement('select', {
      'data-testid': 'sort-select',
      value,
      onChange: onChange ? (e: any) => onChange(e.target.value) : undefined,
    }, children)
  SelectComp.Option = SelectOption

  const CollapsePanel = ({ children, header}: any) =>
    React.createElement('div', { 'data-testid': 'collapse-panel' }, header, children)

  const CollapseComp = ({ children}: any) =>
    React.createElement('div', { 'data-testid': 'collapse' }, children)
  CollapseComp.Panel = CollapsePanel

  const SearchComp = ({ placeholder, value, onChange}: any) =>
    React.createElement('input', {
      placeholder,
      value,
      'data-testid': 'search-input',
      onChange: onChange ? (e: any) => onChange(e) : undefined,
      type: 'text',
    })

  return {
    Tag: ({ children, color, onClick, closable, style, className}: any) =>
      React.createElement(
        'span',
        {
          'data-testid': 'tag-filter-tag',
          'data-color': color,
          'data-closable': closable ? 'true' : 'false',
          onClick,
          style,
          className,
        },
        children
      ),
    Input: {
      Search: SearchComp,
    },
    Button: ({ children, onClick}: any) =>
      React.createElement('button', { onClick, 'data-testid': 'button', type: 'button' }, children),
    Badge: ({ children, count}: any) =>
      React.createElement('span', { 'data-testid': 'badge', 'data-count': count }, children),
    Collapse: CollapseComp,
    Select: SelectComp,
    Space: ({ children}: any) =>
      React.createElement('div', { 'data-testid': 'space' }, children),
    Typography: {
      Text: ({ children, type, style}: any) =>
        React.createElement('span', { 'data-testid': 'text', 'data-type': type, style }, children),
    },
    Empty: Object.assign(
      ({  description}: any) =>
        React.createElement('div', { 'data-testid': 'empty' }, description),
      { PRESENTED_IMAGE_SIMPLE: 'simple' }
    ),
    Tooltip: ({ children}: any) =>
      React.createElement('div', { 'data-testid': 'tooltip' }, children),
  }
})

vi.mock('@ant-design/icons', () => ({
  SearchOutlined: () => React.createElement('span', null, 'Search'),
  ClearOutlined: () => React.createElement('span', null, 'Clear'),
  TagOutlined: () => React.createElement('span', null, 'Tag'),
}))

describe('TagFilter', () => {
  const mockOnTagChange = vi.fn()
  const mockOnClear = vi.fn()

  const tags = [
    { id: '1', name: 'JavaScript', category: '编程语言', usageCount: 100 },
    { id: '2', name: 'React', category: '框架', usageCount: 80 },
    { id: '3', name: 'CSS', category: '样式', usageCount: 60 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input', () => {
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: [],
        onTagChange: mockOnTagChange,
      })
    )
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
  })

  it('renders sort selector', () => {
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: [],
        onTagChange: mockOnTagChange,
      })
    )
    expect(screen.getByTestId('sort-select')).toBeInTheDocument()
  })

  it('renders tag list items', () => {
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: [],
        onTagChange: mockOnTagChange,
      })
    )
    const tagElements = screen.getAllByTestId('tag-filter-tag')
    expect(tagElements.length).toBeGreaterThanOrEqual(3)
  })

  it('renders selected tags section', () => {
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: ['1', '2'],
        onTagChange: mockOnTagChange,
      })
    )
    expect(screen.getByText(/已选标签/)).toBeInTheDocument()
  })

  it('renders "清空选择" button when tags selected', () => {
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: ['1'],
        onTagChange: mockOnTagChange,
        onClear: mockOnClear,
      })
    )
    expect(screen.getByText('清空选择')).toBeInTheDocument()
  })

  it('renders empty state when no tags', () => {
    render(
      React.createElement(TagFilter, {
        tags: [],
        selectedTags: [],
        onTagChange: mockOnTagChange,
      })
    )
    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('calls onTagChange when tag clicked', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: [],
        onTagChange: mockOnTagChange,
      })
    )
    const tagElements = screen.getAllByTestId('tag-filter-tag')
    await user.click(tagElements[0])
    expect(mockOnTagChange).toHaveBeenCalled()
  })

  it('calls onClear when clear button clicked', async () => {
    const user = userEvent.setup()
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: ['1'],
        onTagChange: mockOnTagChange,
        onClear: mockOnClear,
      })
    )
    await user.click(screen.getByText('清空选择'))
    expect(mockOnClear).toHaveBeenCalled()
  })

  it('renders total tag count', () => {
    render(
      React.createElement(TagFilter, {
        tags,
        selectedTags: [],
        onTagChange: mockOnTagChange,
      })
    )
    expect(screen.getByText(/共 3 个标签/)).toBeInTheDocument()
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();
const mockList = vi.fn().mockResolvedValue({ data: [], total: 0 });
const mockDelete = vi.fn().mockResolvedValue({});
const mockRevise = vi.fn().mockResolvedValue({ id: 'new-rev' });
const mockGetStudents = vi
  .fn()
  .mockResolvedValue({ data: [], total: 0 });

vi.mock('../../../services/iep', () => ({
  listIEPs: (...args: any[]) => mockList(...args),
  deleteIEP: (...args: any[]) => mockDelete(...args),
  reviseIEP: (...args: any[]) => mockRevise(...args),
}));

vi.mock('../../../services/student', () => ({
  studentService: { getStudents: (...args: any[]) => mockGetStudents(...args) },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('antd', () => {
  const TableComp = ({ dataSource }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'table' },
      String(dataSource?.length || 0)
    );
  const SearchComp = (props: any) =>
    React.createElement('input', { 'data-testid': 'search', ...props });
  const TabsComp = ({ items, onChange }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'tabs' },
      (items || []).map((it: any) =>
        React.createElement(
          'button',
          {
            key: it.key,
            'data-testid': `tab-${it.key}`,
            onClick: () => onChange?.(it.key),
          },
          it.label
        )
      )
    );
  const SelectComp = ({ options, onChange }: any) =>
    React.createElement(
      'select',
      { 'data-testid': 'student-select', onChange: (e: any) => onChange?.(e.target.value) },
      (options || []).map((o: any) =>
        React.createElement('option', { key: o.value, value: o.value }, o.label)
      )
    );

  return {
    Card: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'card' }, children),
    Button: ({ children, onClick, icon: _icon }: any) =>
      React.createElement(
        'button',
        { onClick, 'data-testid': `btn-${children}` },
        children
      ),
    Table: TableComp,
    Tabs: TabsComp,
    Select: SelectComp,
    Space: ({ children }: any) =>
      React.createElement('div', null, children),
    Tag: ({ children }: any) =>
      React.createElement('span', null, children),
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Search: SearchComp }
    ),
    Modal: Object.assign(() => null, { confirm: vi.fn() }),
    Empty: ({ description }: any) =>
      React.createElement('div', { 'data-testid': 'empty' }, description),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  };
});

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () =>
    React.createElement('span', { 'data-testid': `icon-${name}` }, name);
  return {
    PlusOutlined: icon('PlusOutlined'),
    EyeOutlined: icon('EyeOutlined'),
    EditOutlined: icon('EditOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    CopyOutlined: icon('CopyOutlined'),
    FileProtectOutlined: icon('FileProtectOutlined'),
  };
});

const IEPListPage = (await import('../index')).default;

describe('IEP list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: [], total: 0 });
  });

  it('renders the page title', () => {
    render(React.createElement(IEPListPage));
    expect(screen.getByText('个别化教育计划（IEP）')).toBeInTheDocument();
  });

  it('navigates to create page on 新建 IEP click', () => {
    render(React.createElement(IEPListPage));
    fireEvent.click(screen.getByTestId('btn-新建 IEP'));
    expect(mockNavigate).toHaveBeenCalledWith('/iep/create');
  });

  it('fetches the IEP list on mount', async () => {
    render(React.createElement(IEPListPage));
    await waitFor(() => expect(mockList).toHaveBeenCalled());
  });

  it('re-fetches when switching to draft tab', async () => {
    render(React.createElement(IEPListPage));
    fireEvent.click(screen.getByTestId('tab-draft'));
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' })
      )
    );
  });

  it('shows empty state when there is no data', async () => {
    render(React.createElement(IEPListPage));
    expect(
      await screen.findByText(/暂无 IEP/)
    ).toBeInTheDocument();
  });
});

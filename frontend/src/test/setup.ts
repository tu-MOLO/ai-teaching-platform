// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// ============================================================
// Global antd mock — provides basic rendering for all commonly
// used antd components. Individual test files can override
// specific components by declaring their own vi.mock('antd', ...).
// ============================================================
vi.mock('antd', () => {
  // -- Generic helpers --
  const FormItem = ({ children, name, label, _rules }: any) =>
    React.createElement('div', { 'data-testid': `form-item-${name || 'unnamed'}` }, label ? React.createElement('label', null, label) : null, children);

  const FormComp = ({ children, name, onFinish, _initialValues, ...props }: any) => {
    const handleSubmit = (e: any) => { e.preventDefault(); onFinish?.({}); };
    return React.createElement('form', { onSubmit: handleSubmit, name, 'data-testid': `form-${name || 'unnamed'}`, ...props }, children);
  };
  FormComp.Item = FormItem;
  FormComp.useForm = () => [{
    validateFields: vi.fn().mockResolvedValue({}),
    getFieldValue: vi.fn().mockReturnValue(''),
    resetFields: vi.fn(),
    setFieldsValue: vi.fn(),
  }];

  const InputComp = (props: any) => React.createElement('input', props);
  InputComp.Search = (props: any) => React.createElement('input', { type: 'search', ...props });
  InputComp.Password = (props: any) => React.createElement('input', { type: 'password', ...props });
  InputComp.TextArea = (props: any) => React.createElement('textarea', props);

  const SelectComp = ({ placeholder, options, onChange, value, children, ...props }: any) =>
    React.createElement('select', { 'data-testid': `select-${placeholder}`, value, onChange: (e: any) => onChange?.(e.target.value), ...props },
      options?.map((opt: any) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)),
      children,
    );
  SelectComp.Option = ({ children, value }: any) => React.createElement('option', { value }, children);

  const LayoutComp = (props: any) => React.createElement('div', { 'data-testid': 'layout', ...props }, props.children);
  LayoutComp.Header = (props: any) => React.createElement('header', { 'data-testid': 'header', ...props }, props.children);
  LayoutComp.Sider = (props: any) => React.createElement('aside', { 'data-testid': 'sider', ...props }, props.children);
  LayoutComp.Content = (props: any) => React.createElement('main', { 'data-testid': 'content', ...props }, props.children);
  LayoutComp.Footer = (props: any) => React.createElement('footer', { 'data-testid': 'footer', ...props }, props.children);

  const MenuComp = ({ items, _selectedKeys, _mode, ...props }: any) =>
    React.createElement('nav', { 'data-testid': 'menu', ...props },
      items?.map((item: any) =>
        React.createElement('div', {
          key: item.key,
          'data-testid': `menu-item-${item.key}`,
          onClick: (e: any) => {
            if (item.onClick) item.onClick({ key: item.key, ...e });
          },
        }, item.label)
      )
    );
  MenuComp.Item = (props: any) => React.createElement('div', { 'data-testid': 'menu-item' }, props.children);
  MenuComp.SubMenu = (props: any) => React.createElement('div', { 'data-testid': 'submenu' }, props.title, props.children);
  MenuComp.ItemGroup = (props: any) => React.createElement('div', { 'data-testid': 'menu-item-group' }, props.title, props.children);

  const DescriptionsComp = ({ children, _column, _size, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'descriptions', ...props }, children);
  DescriptionsComp.Item = ({ children, label }: any) =>
    React.createElement('div', { 'data-testid': 'desc-item' }, label, children);

  const CollapseComp = (props: any) => React.createElement('div', { 'data-testid': 'collapse' }, props.children);
  CollapseComp.Panel = ({ children, header }: any) =>
    React.createElement('div', { 'data-testid': 'collapse-panel' }, header, children);

  const TabsComp = ({ _defaultActiveKey, items, _activeKey, _onChange, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'tabs' },
      items?.map((item: any) =>
        React.createElement('div', { key: item.key, 'data-testid': `tab-${item.key}` }, item.label, item.children)
      )
    );
  TabsComp.TabPane = (props: any) => React.createElement('div', { 'data-testid': 'tab-pane' }, props.children);

  const TypographyComp = {
    Title: ({ children, level }: any) => React.createElement(`h${level || 2}`, null, children),
    Text: ({ children, _type }: any) => React.createElement('span', null, children),
    Paragraph: ({ children }: any) => React.createElement('p', null, children),
  };

  const ListComp = ({ dataSource, renderItem, locale, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'list' },
      dataSource?.length
        ? dataSource.map((item: any, i: number) => React.createElement('div', { key: i }, renderItem?.(item)))
        : locale?.emptyText
    );
  ListComp.Item = (props: any) => React.createElement('div', { 'data-testid': 'list-item' }, props.children);

  const TableComp = ({ dataSource, _columns, loading, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'table' },
      React.createElement('span', { 'data-testid': 'table-loading' }, String(loading)),
      React.createElement('span', { 'data-testid': 'table-count' }, String(dataSource?.length || 0)),
    );

  return {
    // Layout
    Layout: LayoutComp,
    // Grid
    Row: ({ children, _justify, _align, _gutter, ...props }: any) => React.createElement('div', { 'data-testid': 'row', ...props }, children),
    Col: ({ children, _xs, _sm, _md, _lg, _span, ...props }: any) => React.createElement('div', { 'data-testid': 'col', ...props }, children),
    // General
    Button: ({ children, onClick, loading, icon, htmlType, _type, _size, ...props }: any) =>
      React.createElement('button', { onClick, disabled: loading, type: htmlType || 'button', 'data-testid': `btn-${children}`, ...props }, icon, children),
    // Data Entry
    Input: InputComp,
    InputNumber: (props: any) => React.createElement('input', { type: 'number', ...props }),
    Select: SelectComp,
    Switch: ({ checked, onChange, ...props }: any) =>
      React.createElement('input', { type: 'checkbox', checked, onChange: (e: any) => onChange?.(e.target.checked), ...props }),
    DatePicker: (props: any) => React.createElement('input', { type: 'date', ...props }),
    Checkbox: ({ children, ...props }: any) => React.createElement('label', null, React.createElement('input', { type: 'checkbox' }), children),
    Radio: Object.assign(
      (props: any) => React.createElement('input', { type: 'radio', ...props }),
      {
        Group: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'radio-group' }, children),
        Button: (props: any) => React.createElement('input', { type: 'radio', ...props }),
      }
    ),
    Slider: (props: any) => React.createElement('input', { type: 'range', ...props }),
    Rate: (props: any) => React.createElement('div', { 'data-testid': 'rate' }, React.createElement('span', null, props.value)),
    Upload: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'upload' }, children),
    // Data Display
    Card: ({ children, title, extra, className, _size, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'card', className, ...props }, title, extra, children),
    Avatar: ({ _size, icon, _src, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'avatar', ...props }, icon),
    Tag: ({ children, color, ...props }: any) =>
      React.createElement('span', { 'data-testid': 'tag', 'data-color': color, ...props }, children),
    Badge: ({ children, count, ...props }: any) =>
      React.createElement('span', { 'data-testid': 'badge', 'data-count': count, ...props }, children),
    Tooltip: ({ children, title, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'tooltip', title, ...props }, children),
    Statistic: ({ title, value, prefix, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'statistic' }, prefix, title ? React.createElement('span', null, title) : null, React.createElement('span', null, String(value))),
    Progress: ({ percent, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'progress' }, `${percent}%`),
    Spin: ({ children, spinning, _size, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'spin', 'data-spinning': spinning, ...props }, children),
    Empty: Object.assign(
      ({ description, _image, children }: any) =>
        React.createElement('div', { 'data-testid': 'empty' }, description, children),
      { PRESENTED_IMAGE_SIMPLE: 'simple' }
    ),
    Result: ({ title, subTitle, extra, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'error-result' },
        React.createElement('h2', null, title),
        subTitle ? React.createElement('p', null, subTitle) : null,
        extra
      ),
    Table: TableComp,
    Pagination: (props: any) => React.createElement('div', { 'data-testid': 'pagination' }, 'Pagination'),
    // Navigation
    Menu: MenuComp,
    Tabs: TabsComp,
    Dropdown: ({ children, _menu, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'dropdown' }, children),
    Breadcrumb: Object.assign(
      (props: any) => React.createElement('nav', { 'data-testid': 'breadcrumb' }, props.children),
      { Item: (props: any) => React.createElement('span', { 'data-testid': 'breadcrumb-item' }, props.children) }
    ),
    // Feedback
    Modal: Object.assign(
      ({ children, open, title, footer, _onOk, _onCancel, ...props }: any) =>
        open ? React.createElement('div', { 'data-testid': 'modal', role: 'dialog' },
          React.createElement('div', null, title),
          children,
          ...(footer || [])
        ) : null,
      { confirm: vi.fn() }
    ),
    Popconfirm: ({ children, title, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'popconfirm', title, ...props }, children),
    Popover: ({ children, content, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'popover' }, children, content),
    Alert: ({ message, description, _type, _icon, _showIcon, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'alert', ...props }, message, description),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    notification: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    // Other
    Divider: (props: any) => React.createElement('hr', { 'data-testid': 'divider', ...props }),
    Space: ({ children, _direction, _size, _wrap, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'space', ...props }, children),
    Form: FormComp,
    Typography: TypographyComp,
    List: ListComp,
    Descriptions: DescriptionsComp,
    Collapse: CollapseComp,
    theme: { useToken: () => ({ token: {} }) },
    ConfigProvider: ({ children }: any) => React.createElement('div', null, children),
    App: ({ children }: any) => React.createElement('div', null, children),
  };
});
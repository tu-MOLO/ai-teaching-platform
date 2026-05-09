import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  SettingOutlined,
  PlusOutlined,
  SaveOutlined,
  SkinOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import ThemeSettings from '../../components/Theme/ThemeSettings'
import { DROPDOWN_GROUPS, DROPDOWN_GROUP_MAP } from '../../constants/dropdownOptions'
import localSettingsService from '../../services/localSettings'
import {
  createDropdownOption,
  deleteDropdownOption,
  getDropdownOptions,
  updateDropdownOption,
  type DropdownOption,
} from '../../services/dropdownOption'
import { usePortfolioTypesStore } from '../../stores/portfolioTypes'
import type { BasicSettingsFormData } from '../../types/forms'

const { Title, Text } = Typography

const Settings: React.FC = () => {
  const [basicForm] = Form.useForm<BasicSettingsFormData>()
  const [optionForm] = Form.useForm()
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const defaultTab = searchParams.get('tab') || 'basic'
  const returnTo = searchParams.get('returnTo')
  const initialGroup = searchParams.get('group') || DROPDOWN_GROUPS[0]?.key || ''

  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(initialGroup)
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const { types: portfolioTypes, resetToDefault } = usePortfolioTypesStore()

  useEffect(() => {
    basicForm.setFieldsValue(localSettingsService.getBasicSettings())
  }, [basicForm])

  const loadOptions = async (groupKey: string) => {
    setOptionsLoading(true)
    try {
      const data = await getDropdownOptions(groupKey, false)
      setOptions(data)
    } catch {
      message.error('加载下拉选项失败')
    } finally {
      setOptionsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedGroup) {
      loadOptions(selectedGroup)
    }
  }, [selectedGroup])

  useEffect(() => {
    if (!editingId) {
      optionForm.resetFields()
      optionForm.setFieldsValue({
        is_active: true,
        sort_order: options.length,
      })
    }
  }, [editingId, optionForm, options.length])

  const handleSaveBasic = async (values: BasicSettingsFormData) => {
    setLoading(true)
    try {
      localSettingsService.saveBasicSettings(values)
      message.success('设置已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOption = async (values: {
    label: string
    value: string
    description?: string
    sort_order?: number
    is_active?: boolean
  }) => {
    try {
      if (editingId) {
        await updateDropdownOption(editingId, values)
        message.success('选项已更新')
      } else {
        await createDropdownOption({
          group_key: selectedGroup,
          label: values.label,
          value: values.value,
          description: values.description,
          sort_order: values.sort_order || 0,
          is_active: values.is_active ?? true,
        })
        message.success('选项已创建')
      }

      setEditingId(null)
      optionForm.resetFields()
      loadOptions(selectedGroup)
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '保存选项失败')
    }
  }

  const handleEdit = (record: DropdownOption) => {
    setEditingId(record.id)
    optionForm.setFieldsValue({
      label: record.label,
      value: record.value,
      description: record.description,
      sort_order: record.sort_order,
      is_active: record.is_active,
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDropdownOption(id)
      message.success('选项已删除')
      if (editingId === id) {
        setEditingId(null)
        optionForm.resetFields()
      }
      loadOptions(selectedGroup)
    } catch {
      message.error('删除选项失败')
    }
  }

  const handleResetPortfolioTypes = () => {
    resetToDefault()
    message.success('已恢复为后端支持的默认记录类型')
  }

  const optionColumns = [
    { title: '显示名称', dataIndex: 'label', key: 'label' },
    { title: '存储值', dataIndex: 'value', key: 'value' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '状态',
      key: 'is_active',
      width: 80,
      render: (_: unknown, record: DropdownOption) => (record.is_active ? '启用' : '停用'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: DropdownOption) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除这个选项吗？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const items = [
    {
      key: 'basic',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 4 }} />
          基本设置
        </span>
      ),
      children: (
        <Form form={basicForm} layout="vertical" onFinish={handleSaveBasic} style={{ maxWidth: 600 }}>
          <Form.Item
            name="schoolName"
            label="学校名称"
            rules={[{ required: true, message: '请输入学校名称' }]}
          >
            <Input placeholder="请输入学校名称" />
          </Form.Item>

          <Form.Item
            name="contactEmail"
            label="联系邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入联系邮箱" />
          </Form.Item>

          <Form.Item name="contactPhone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'theme',
      label: (
        <span>
          <SkinOutlined style={{ marginRight: 4 }} />
          主题配色
        </span>
      ),
      children: <ThemeSettings />,
    },
    {
      key: 'dropdowns',
      label: (
        <span>
          <UnorderedListOutlined style={{ marginRight: 4 }} />
          下拉选项
        </span>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {returnTo && (
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(returnTo)}>
              返回上一页
            </Button>
          )}

          <Card size="small" title="选择选项分组">
            <Select
              value={selectedGroup}
              style={{ width: 320 }}
              onChange={(value) => {
                setSelectedGroup(value)
                setEditingId(null)
              }}
              options={DROPDOWN_GROUPS.map((group) => ({
                label: group.label,
                value: group.key,
              }))}
            />
          </Card>

          <Card size="small" title={`${DROPDOWN_GROUP_MAP[selectedGroup]?.label || '选项'}管理`}>
            <Form form={optionForm} layout="vertical" onFinish={handleSaveOption}>
              <Space align="start" wrap style={{ width: '100%' }}>
                <Form.Item
                  name="label"
                  label="显示名称"
                  rules={[{ required: true, message: '请输入显示名称' }]}
                >
                  <Input placeholder="例如：七年级" style={{ width: 220 }} />
                </Form.Item>
                <Form.Item
                  name="value"
                  label="存储值"
                  rules={[{ required: true, message: '请输入存储值' }]}
                >
                  <Input placeholder="例如：grade-7" style={{ width: 220 }} />
                </Form.Item>
                <Form.Item name="sort_order" label="排序">
                  <InputNumber min={0} style={{ width: 100 }} />
                </Form.Item>
                <Form.Item name="is_active" label="状态" initialValue={true}>
                  <Select
                    style={{ width: 120 }}
                    options={[
                      { label: '启用', value: true },
                      { label: '停用', value: false },
                    ]}
                  />
                </Form.Item>
              </Space>

              <Form.Item name="description" label="备注">
                <Input placeholder="可选备注" />
              </Form.Item>

              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  {editingId ? '保存修改' : '新增选项'}
                </Button>
                {editingId ? (
                  <Button
                    onClick={() => {
                      setEditingId(null)
                      optionForm.resetFields()
                    }}
                  >
                    取消编辑
                  </Button>
                ) : (
                  <Button icon={<PlusOutlined />} onClick={() => optionForm.resetFields()}>
                    清空
                  </Button>
                )}
              </Space>
            </Form>
          </Card>

          <Card size="small" title="当前选项">
            <Table
              rowKey="id"
              columns={optionColumns}
              dataSource={options}
              loading={optionsLoading}
              pagination={false}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'portfolio-types',
      label: (
        <span>
          <TagsOutlined style={{ marginRight: 4 }} />
          记录类型
        </span>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" title="类型说明">
            <Space direction="vertical" size={8}>
              <Text>当前记录类型已收口为后端支持的 4 种内置类型，避免提交时出现校验失败。</Text>
              <Text type="secondary">
                如需新增类型，需要先同步扩展后端 `portfolio` schema、接口和数据映射。
              </Text>
              <Button onClick={handleResetPortfolioTypes}>恢复默认类型显示</Button>
            </Space>
          </Card>

          <Card size="small" title="当前类型">
            <Table
              rowKey="id"
              dataSource={portfolioTypes}
              pagination={false}
              columns={[
                {
                  title: '图标',
                  key: 'icon',
                  width: 80,
                  render: (_: unknown, record: { icon: string }) => (
                    <span style={{ fontSize: 24 }}>{record.icon}</span>
                  ),
                },
                {
                  title: '类型名称',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: '类型值',
                  dataIndex: 'id',
                  key: 'id',
                },
                {
                  title: '说明',
                  key: 'isDefault',
                  width: 160,
                  render: () => <Text type="secondary">后端内置类型</Text>,
                },
              ]}
            />
          </Card>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card title={<Title level={4}>系统设置</Title>}>
        <Tabs defaultActiveKey={defaultTab} items={items} />
      </Card>
    </div>
  )
}

export default Settings

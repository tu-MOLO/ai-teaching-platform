import React, { useEffect, useMemo, useState } from 'react'
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
  Modal,
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SkinOutlined, TagsOutlined, SmileOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import type { BasicSettingsFormData } from '../../types/forms'
import {
  createDropdownOption,
  deleteDropdownOption,
  getDropdownOptions,
  updateDropdownOption,
  type DropdownOption,
} from '../../services/dropdownOption'
import { DROPDOWN_GROUPS, DROPDOWN_GROUP_MAP } from '../../constants/dropdownOptions'
import ThemeSettings from '../../components/Theme/ThemeSettings'
import { usePortfolioTypesStore, availableIcons, type PortfolioType } from '../../stores/portfolioTypes'

const { Title, Text } = Typography

const Settings: React.FC = () => {
  const [basicForm] = Form.useForm<BasicSettingsFormData>()
  const [optionForm] = Form.useForm()
  const [portfolioTypeForm] = Form.useForm()
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

  // 成长档案类型管理
  const {
    types: portfolioTypes,
    addType,
    updateType,
    deleteType,
    resetToDefault,
  } = usePortfolioTypesStore()
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [iconModalVisible, setIconModalVisible] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('📄')

  const loadOptions = async (groupKey: string) => {
    setOptionsLoading(true)
    try {
      const data = await getDropdownOptions(groupKey, false)
      setOptions(data)
    } catch (error) {
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
    if (!editingId && optionForm) {
      optionForm.resetFields()
      optionForm.setFieldsValue({
        is_active: true,
        sort_order: options.length,
      })
    }
  }, [editingId, optionForm, options.length, selectedGroup])

  const handleSaveBasic = async (values: BasicSettingsFormData) => {
    setLoading(true)
    try {
      console.log('Saving settings:', values)
      message.success('设置保存成功')
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOption = async (values: any) => {
    try {
      if (editingId) {
        await updateDropdownOption(editingId, values)
        message.success('选项更新成功')
      } else {
        await createDropdownOption({
          group_key: selectedGroup,
          label: values.label,
          value: values.value,
          description: values.description,
          sort_order: values.sort_order || 0,
          is_active: values.is_active ?? true,
        })
        message.success('选项创建成功')
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
      message.success('选项删除成功')
      if (editingId === id) {
        setEditingId(null)
        optionForm.resetFields()
      }
      loadOptions(selectedGroup)
    } catch (error) {
      message.error('删除选项失败')
    }
  }

  // 成长档案类型管理函数
  const handleSavePortfolioType = (values: { name: string }) => {
    if (editingTypeId) {
      const success = updateType(editingTypeId, { name: values.name, icon: selectedIcon })
      if (success) {
        message.success('类型更新成功')
        setEditingTypeId(null)
        portfolioTypeForm.resetFields()
        setSelectedIcon('📄')
      } else {
        message.error('类型名称已存在')
      }
    } else {
      const newType = addType(values.name, selectedIcon)
      if (newType) {
        message.success('类型添加成功')
        portfolioTypeForm.resetFields()
        setSelectedIcon('📄')
      } else {
        message.error('类型名称已存在')
      }
    }
  }

  const handleEditPortfolioType = (type: PortfolioType) => {
    setEditingTypeId(type.id)
    portfolioTypeForm.setFieldsValue({ name: type.name })
    setSelectedIcon(type.icon)
  }

  const handleDeletePortfolioType = (id: string) => {
    const success = deleteType(id)
    if (success) {
      message.success('类型删除成功')
      if (editingTypeId === id) {
        setEditingTypeId(null)
        portfolioTypeForm.resetFields()
        setSelectedIcon('📄')
      }
    } else {
      message.error('默认类型不能删除')
    }
  }

  const handleResetPortfolioTypes = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置为默认类型吗？所有自定义类型将被删除。',
      onOk: () => {
        resetToDefault()
        message.success('已重置为默认类型')
        setEditingTypeId(null)
        portfolioTypeForm.resetFields()
        setSelectedIcon('📄')
      },
    })
  }

  const optionColumns = [
    {
      title: '显示名称',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '存储值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
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
      label: '基本设置',
      children: (
        <Form
          form={basicForm}
          layout="vertical"
          onFinish={handleSaveBasic}
          style={{ maxWidth: 600 }}
        >
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
      label: '下拉选项',
      children: (
        <div>
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

            <Card
              size="small"
              title={`${DROPDOWN_GROUP_MAP[selectedGroup]?.label || '选项'}管理`}
            >
              <Form
                form={optionForm}
                layout="vertical"
                onFinish={handleSaveOption}
              >
                <Space align="start" wrap style={{ width: '100%' }}>
                  <Form.Item
                    name="label"
                    label="显示名称"
                    rules={[{ required: true, message: '请输入显示名称' }]}
                  >
                    <Input placeholder="例如：培智七年级" style={{ width: 220 }} />
                  </Form.Item>
                  <Form.Item
                    name="value"
                    label="存储值"
                    rules={[{ required: true, message: '请输入存储值' }]}
                  >
                    <Input placeholder="例如：培智七年级" style={{ width: 220 }} />
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
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => optionForm.resetFields()}
                    >
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
        </div>
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
        <div>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="类型管理">
              <Form
                form={portfolioTypeForm}
                layout="vertical"
                onFinish={handleSavePortfolioType}
              >
                <Space align="start" wrap style={{ width: '100%' }}>
                  <Form.Item
                    name="name"
                    label="类型名称"
                    rules={[{ required: true, message: '请输入类型名称' }]}
                  >
                    <Input placeholder="例如：实验报告" style={{ width: 220 }} />
                  </Form.Item>
                  <Form.Item label="图标">
                    <Button
                      onClick={() => setIconModalVisible(true)}
                      style={{ width: 120 }}
                    >
                      <span style={{ marginRight: 8, fontSize: 18 }}>{selectedIcon}</span>
                      选择图标
                    </Button>
                  </Form.Item>
                </Space>

                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    {editingTypeId ? '保存修改' : '新增类型'}
                  </Button>
                  {editingTypeId ? (
                    <Button
                      onClick={() => {
                        setEditingTypeId(null)
                        portfolioTypeForm.resetFields()
                        setSelectedIcon('📄')
                      }}
                    >
                      取消编辑
                    </Button>
                  ) : (
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => {
                        portfolioTypeForm.resetFields()
                        setSelectedIcon('📄')
                      }}
                    >
                      清空
                    </Button>
                  )}
                  <Button danger onClick={handleResetPortfolioTypes}>
                    重置为默认
                  </Button>
                </Space>
              </Form>
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
                    render: (_: unknown, record: PortfolioType) => (
                      <span style={{ fontSize: 24 }}>{record.icon}</span>
                    ),
                  },
                  {
                    title: '类型名称',
                    dataIndex: 'name',
                    key: 'name',
                  },
                  {
                    title: '类型',
                    key: 'isDefault',
                    width: 100,
                    render: (_: unknown, record: PortfolioType) => (
                      record.isDefault ? <Text type="secondary">系统默认</Text> : <Text>自定义</Text>
                    ),
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 180,
                    render: (_: unknown, record: PortfolioType) => (
                      <Space>
                        <Button size="small" onClick={() => handleEditPortfolioType(record)}>
                          编辑
                        </Button>
                        <Popconfirm
                          title="确定删除这个类型吗？"
                          description="系统默认类型不能删除"
                          onConfirm={() => handleDeletePortfolioType(record.id)}
                          disabled={record.isDefault}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} disabled={record.isDefault}>
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </Space>

          {/* 图标选择弹窗 */}
          <Modal
            title="选择图标"
            open={iconModalVisible}
            onCancel={() => setIconModalVisible(false)}
            footer={null}
            width={600}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
              {availableIcons.map((icon) => (
                <Button
                  key={icon}
                  type={selectedIcon === icon ? 'primary' : 'default'}
                  onClick={() => {
                    setSelectedIcon(icon)
                    setIconModalVisible(false)
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </Modal>
        </div>
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

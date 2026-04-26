import React, { useState } from 'react'
import { Button, Divider, Input, Select, Space, message, Modal } from 'antd'
import type { SelectProps } from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePortfolioTypesStore, availableIcons } from '../../stores/portfolioTypes'

type PrimitiveValue = string | number

interface PortfolioTypeSelectProps extends Omit<SelectProps, 'options'> {
  placeholder?: string
}

const PortfolioTypeSelect: React.FC<PortfolioTypeSelectProps> = ({
  placeholder,
  value,
  onChange,
  ...props
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { types, addType } = usePortfolioTypesStore()
  const [draftName, setDraftName] = useState('')
  const [creating, setCreating] = useState(false)
  const [iconModalVisible, setIconModalVisible] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('📄')

  const selectOptions = types.map((type) => ({
    label: (
      <span>
        <span style={{ marginRight: 8 }}>{type.icon}</span>
        {type.name}
      </span>
    ),
    value: type.id,
  }))

  const goToSettings = () => {
    navigate(`/settings?tab=portfolio-types`)
  }

  const handleQuickCreate = async () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      message.warning('请输入类型名称')
      return
    }

    try {
      setCreating(true)
      const created = addType(trimmed, selectedIcon)
      if (created) {
        setDraftName('')
        setSelectedIcon('📄')
        onChange?.(created.id, undefined as never)
        message.success('类型已添加')
      } else {
        message.error('类型名称已存在')
      }
    } catch (error: any) {
      message.error(error?.message || '添加类型失败')
    } finally {
      setCreating(false)
    }
  }

  const handleSelectIcon = (icon: string) => {
    setSelectedIcon(icon)
    setIconModalVisible(false)
  }

  return (
    <>
      <Select
        {...props}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        options={selectOptions}
        notFoundContent="暂无类型"
        popupRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space direction="vertical" style={{ padding: 8, width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={draftName}
                  placeholder="快捷新增类型"
                  onChange={(event) => setDraftName(event.target.value)}
                  onPressEnter={handleQuickCreate}
                />
                <Button onClick={() => setIconModalVisible(true)} style={{ padding: '0 8px' }}>
                  <span style={{ fontSize: 16 }}>{selectedIcon}</span>
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={creating}
                  onClick={handleQuickCreate}
                >
                  新增
                </Button>
              </Space.Compact>
              <Button icon={<SettingOutlined />} onClick={goToSettings}>
                管理记录类型
              </Button>
            </Space>
          </>
        )}
      />

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
              onClick={() => handleSelectIcon(icon)}
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
    </>
  )
}

export default PortfolioTypeSelect

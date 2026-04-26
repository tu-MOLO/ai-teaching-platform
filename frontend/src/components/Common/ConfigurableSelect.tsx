import React, { useMemo, useState } from 'react'
import { Button, Divider, Input, Select, Space, message } from 'antd'
import type { SelectProps } from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import { DROPDOWN_GROUP_MAP } from '../../constants/dropdownOptions'

type PrimitiveValue = string | number

interface ConfigurableSelectProps extends Omit<SelectProps, 'options'> {
  groupKey: string
  placeholder?: string
  allowQuickCreate?: boolean
}

const ConfigurableSelect: React.FC<ConfigurableSelectProps> = ({
  groupKey,
  placeholder,
  allowQuickCreate = true,
  mode,
  value,
  onChange,
  ...props
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { options, loading, quickCreate } = useDropdownOptions(groupKey)
  const [draftLabel, setDraftLabel] = useState('')
  const [creating, setCreating] = useState(false)

  const selectOptions = useMemo(
    () =>
      options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [options]
  )

  const goToSettings = () => {
    const params = new URLSearchParams({
      tab: 'dropdowns',
      group: groupKey,
      returnTo: `${location.pathname}${location.search}`,
    })
    navigate(`/settings?${params.toString()}`)
  }

  const handleQuickCreate = async () => {
    const trimmed = draftLabel.trim()
    if (!trimmed) {
      message.warning('请输入选项名称')
      return
    }

    try {
      setCreating(true)
      const created = await quickCreate(trimmed)
      setDraftLabel('')

      if (mode === 'multiple') {
        const currentValues = Array.isArray(value) ? value : []
        onChange?.([...(currentValues as PrimitiveValue[]), created.value], undefined as never)
      } else {
        onChange?.(created.value, undefined as never)
      }

      message.success('选项已添加')
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '添加选项失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Select
      {...props}
      mode={mode}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      loading={loading}
      options={selectOptions}
      notFoundContent={loading ? '加载中...' : '暂无选项'}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space direction="vertical" style={{ padding: 8, width: '100%' }}>
            {allowQuickCreate && (
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={draftLabel}
                  placeholder="快捷新增选项"
                  onChange={(event) => setDraftLabel(event.target.value)}
                  onPressEnter={handleQuickCreate}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={creating}
                  onClick={handleQuickCreate}
                >
                  新增
                </Button>
              </Space.Compact>
            )}
            <Button icon={<SettingOutlined />} onClick={goToSettings}>
              管理{DROPDOWN_GROUP_MAP[groupKey]?.label || '选项'}
            </Button>
          </Space>
        </>
      )}
    />
  )
}

export default ConfigurableSelect

import React from 'react'
import { Button, Select, Space, Typography } from 'antd'
import type { SelectProps } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { usePortfolioTypesStore } from '../../stores/portfolioTypes'

const { Text } = Typography

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
  const { types } = usePortfolioTypesStore()

  const selectOptions = types.map((type) => ({
    label: (
      <span>
        <span style={{ marginRight: 8 }}>{type.icon}</span>
        {type.name}
      </span>
    ),
    value: type.id,
  }))

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Select
        {...props}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        options={selectOptions}
        notFoundContent="暂无记录类型"
      />
      <Text type="secondary">
        记录类型需与后端校验一致，当前仅支持系统内置类型。
      </Text>
      <Button
        icon={<SettingOutlined />}
        onClick={() => navigate('/settings?tab=portfolio-types')}
        style={{ width: 'fit-content' }}
      >
        查看类型说明
      </Button>
    </Space>
  )
}

export default PortfolioTypeSelect

import React, { useState, useMemo } from 'react'
import { Card, Collapse, Input, Space, Typography, Tag } from 'antd'
import { SearchOutlined, BgColorsOutlined, FontColorsOutlined, BorderOutlined, CheckCircleOutlined } from '@ant-design/icons'
import ColorPicker from './ColorPicker'
import { useThemeStore } from '../../stores/theme'
import {
  colorVariableGroups,
  colorVariableLabels,
} from '../../constants/themes'

const { Title, Text } = Typography

const ColorVariableEditor: React.FC = () => {
  const { currentColors, updateColor } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeKeys, setActiveKeys] = useState<string[]>(
    colorVariableGroups.map((g) => g.key)
  )

  // 根据搜索过滤变量
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return colorVariableGroups
    }

    const query = searchQuery.toLowerCase()
    return colorVariableGroups
      .map((group) => ({
        ...group,
        variables: group.variables.filter((v) => {
          const label = colorVariableLabels[v].toLowerCase()
          const value = currentColors[v].toLowerCase()
          return label.includes(query) || value.includes(query)
        }),
      }))
      .filter((group) => group.variables.length > 0)
  }, [searchQuery, currentColors])

  // 获取分组图标
  const getGroupIcon = (key: string) => {
    switch (key) {
      case 'primary':
        return <BgColorsOutlined />
      case 'background':
        return <BorderOutlined />
      case 'text':
        return <FontColorsOutlined />
      case 'functional':
        return <CheckCircleOutlined />
      default:
        return <BorderOutlined />
    }
  }

  // 判断是否为透明或半透明颜色
  const isTransparent = (value: string) => {
    return value.includes('rgba') || value.includes('transparent')
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            颜色变量
          </Title>
          <Tag color="default">{Object.keys(currentColors).length}个变量</Tag>
        </Space>
      }
      extra={
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索颜色..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: 0, maxHeight: 600, overflow: 'auto' } }}
    >
      <Collapse
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        bordered={false}
        ghost
        items={filteredGroups.map((group) => ({
          key: group.key,
          label: (
            <Space>
              {getGroupIcon(group.key)}
              <Text strong>{group.name}</Text>
              <Tag>{group.variables.length}</Tag>
            </Space>
          ),
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {group.variables.map((variableName) => {
                const label = colorVariableLabels[variableName]
                const value = currentColors[variableName]
                const transparent = isTransparent(value)

                return (
                  <div
                    key={variableName}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 8,
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                    }}
                  >
                    <Space>
                      <ColorPicker
                        value={transparent ? '#ffffff' : value}
                        onChange={(newValue) => updateColor(variableName, newValue)}
                        size="small"
                        showText={false}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                          {variableName}
                        </Text>
                      </div>
                    </Space>

                    <Input
                      value={value}
                      onChange={(e) => updateColor(variableName, e.target.value)}
                      style={{
                        width: 120,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        textAlign: 'center',
                      }}
                      size="small"
                    />
                  </div>
                )
              })}
            </Space>
          ),
        }))}
      />

      {filteredGroups.length === 0 && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          <SearchOutlined style={{ fontSize: 32, marginBottom: 16, opacity: 0.5 }} />
          <div>未找到匹配的颜色</div>
        </div>
      )}
    </Card>
  )
}

export default ColorVariableEditor

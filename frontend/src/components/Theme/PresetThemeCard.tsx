import React from 'react'
import { Card, Typography, Badge } from 'antd'
import type { PresetTheme } from '../../constants/themes'

const { Text, Title } = Typography

interface PresetThemeCardProps {
  theme: PresetTheme
  isSelected: boolean
  onClick: () => void
}

const PresetThemeCard: React.FC<PresetThemeCardProps> = ({ theme, isSelected, onClick }) => {
  return (
    <Card
      onClick={onClick}
      hoverable
      style={{
        borderRadius: 12,
        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
        backgroundColor: isSelected ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 0 0 3px var(--color-primary-light)' : 'none',
      }}
      styles={{ body: { padding: 16 } }}
    >
      {/* 选中标记 */}
      {isSelected && (
        <Badge
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'var(--color-primary)',
          }}
          count="当前"
        />
      )}

      {/* 颜色预览 */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 12,
          height: 40,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {theme.previewColors.slice(0, 5).map((color, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: 40,
              minWidth: 0,
              backgroundColor: color,
              border: '1px solid var(--color-border-light)',
              borderLeftWidth: index === 0 ? 1 : 0,
              marginLeft: index === 0 ? 0 : -1,
            }}
          />
        ))}
      </div>

      {/* 主题信息 */}
      <div>
        <Title
          level={5}
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 16,
            color: 'var(--color-text-primary)',
          }}
        >
          {theme.name}
        </Title>
        <Text
          type="secondary"
          style={{
            fontSize: 13,
            display: 'block',
            lineHeight: 1.5,
          }}
        >
          {theme.description}
        </Text>
      </div>

      {/* 主色展示 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--color-border-light)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>主色:</span>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            backgroundColor: theme.colors['--color-primary'],
            border: '1px solid var(--color-border)',
          }}
        />
        <Text
          copyable
          style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: 'var(--color-text-secondary)',
          }}
        >
          {theme.colors['--color-primary']}
        </Text>
      </div>
    </Card>
  )
}

export default PresetThemeCard

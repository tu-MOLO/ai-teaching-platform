import React, { useMemo } from 'react'
import { Alert, Tooltip, Space, Typography, Badge } from 'antd'
import { WarningOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useThemeStore } from '../../stores/theme'
import { getContrastRatio, meetsWCAGAA, formatContrastRatio, getSuggestedColor } from '../../utils/color'

const { Text } = Typography

interface ContrastCheck {
  id: string
  name: string
  foreground: string
  background: string
  isLargeText: boolean
  ratio: number
  passesAA: boolean
  passesAAA: boolean
}

const ContrastWarning: React.FC = () => {
  const { currentColors } = useThemeStore()

  // 定义需要检查对比度的颜色组合
  const contrastChecks: ContrastCheck[] = useMemo(() => {
    const checks: ContrastCheck[] = [
      // 主要文字对比度
      {
        id: 'primary-text',
        name: '主要文字',
        foreground: currentColors['--color-text-primary'],
        background: currentColors['--color-bg-primary'],
        isLargeText: false,
        ratio: 0,
        passesAA: false,
        passesAAA: false,
      },
      // 次要文字对比度
      {
        id: 'secondary-text',
        name: '次要文字',
        foreground: currentColors['--color-text-secondary'],
        background: currentColors['--color-bg-primary'],
        isLargeText: false,
        ratio: 0,
        passesAA: false,
        passesAAA: false,
      },
      // 主按钮文字对比度
      {
        id: 'primary-button',
        name: '主要按钮',
        foreground: currentColors['--color-text-inverse'],
        background: currentColors['--color-primary'],
        isLargeText: false,
        ratio: 0,
        passesAA: false,
        passesAAA: false,
      },
      // 侧边栏文字对比度
      {
        id: 'sidebar-text',
        name: '侧边栏文字',
        foreground: currentColors['--color-text-inverse'],
        background: currentColors['--color-bg-sidebar'],
        isLargeText: false,
        ratio: 0,
        passesAA: false,
        passesAAA: false,
      },
      // 卡片标题对比度
      {
        id: 'card-title',
        name: '卡片标题',
        foreground: currentColors['--color-text-primary'],
        background: currentColors['--color-bg-card'],
        isLargeText: true,
        ratio: 0,
        passesAA: false,
        passesAAA: false,
      },
    ]

    // 计算对比度
    return checks.map((check) => {
      const ratio = getContrastRatio(check.foreground, check.background)
      return {
        ...check,
        ratio,
        passesAA: meetsWCAGAA(check.foreground, check.background, check.isLargeText),
        passesAAA: ratio >= (check.isLargeText ? 4.5 : 7),
      }
    })
  }, [currentColors])

  // 检查是否有对比度不足的情况
  const hasWarnings = contrastChecks.some((check) => !check.passesAA)

  if (!hasWarnings) {
    return (
      <Alert
        message="可访问性检查通过"
        description="当前配色方案满足 WCAG AA 对比度标准。"
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginBottom: 16 }}
      />
    )
  }

  return (
    <Alert
      message="可访问性警告"
      description="部分颜色组合的对比度不满足 WCAG AA 标准，可能影响部分用户的阅读体验。"
      type="warning"
      showIcon
      icon={<WarningOutlined />}
      style={{ marginBottom: 16 }}
    />
  )
}

// 详细的对比度检查结果组件
export const ContrastDetails: React.FC = () => {
  const { currentColors, updateColor } = useThemeStore()

  const contrastChecks = useMemo(() => {
    const checks = [
      {
        id: 'primary-text',
        name: '主要文字 / 主背景',
        foreground: currentColors['--color-text-primary'],
        background: currentColors['--color-bg-primary'],
        isLargeText: false,
      },
      {
        id: 'secondary-text',
        name: '次要文字 / 主背景',
        foreground: currentColors['--color-text-secondary'],
        background: currentColors['--color-bg-primary'],
        isLargeText: false,
      },
      {
        id: 'primary-button',
        name: '按钮文字 / 主色',
        foreground: currentColors['--color-text-inverse'],
        background: currentColors['--color-primary'],
        isLargeText: false,
      },
      {
        id: 'sidebar-text',
        name: '侧边栏文字 / 侧边栏背景',
        foreground: currentColors['--color-text-inverse'],
        background: currentColors['--color-bg-sidebar'],
        isLargeText: false,
      },
    ]

    return checks.map((check) => {
      const ratio = getContrastRatio(check.foreground, check.background)
      const minRatio = check.isLargeText ? 3 : 4.5
      return {
        ...check,
        ratio,
        passesAA: ratio >= minRatio,
        suggestedColor: getSuggestedColor(check.foreground, check.background, minRatio),
      }
    })
  }, [currentColors])

  return (
    <div style={{ marginTop: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        对比度详情
      </Text>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {contrastChecks.map((check) => {
          const suggestedColor = getSuggestedColor(
            check.foreground,
            check.background,
            check.isLargeText ? 3 : 4.5
          )
          const hasSuggestion = suggestedColor !== check.foreground

          return (
            <div
              key={check.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: check.passesAA
                  ? 'rgba(82, 196, 26, 0.1)'
                  : 'rgba(255, 77, 79, 0.1)',
                borderRadius: 8,
                border: `1px solid ${check.passesAA ? '#b7eb8f' : '#ffa39e'}`,
              }}
            >
              <Space>
                {check.passesAA ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                )}
                <div>
                  <Text style={{ fontSize: 13 }}>{check.name}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tooltip
                      title={
                        <Space direction="vertical" size={4}>
                          <Text style={{ color: '#fff' }}>前景: {check.foreground}</Text>
                          <Text style={{ color: '#fff' }}>背景: {check.background}</Text>
                        </Space>
                      }
                    >
                      <Badge
                        count={formatContrastRatio(check.ratio)}
                        style={{
                          backgroundColor: check.passesAA ? '#52c41a' : '#ff4d4f',
                          fontSize: 11,
                        }}
                      />
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      要求: {check.isLargeText ? '3:1' : '4.5:1'}
                    </Text>
                  </div>
                </div>
              </Space>

              {!check.passesAA && hasSuggestion && (
                <Tooltip title="应用建议颜色">
                  <Space
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // 根据检查项更新对应的颜色变量
                      if (check.id === 'primary-text') {
                        updateColor('--color-text-primary', suggestedColor)
                      } else if (check.id === 'secondary-text') {
                        updateColor('--color-text-secondary', suggestedColor)
                      } else if (check.id === 'primary-button') {
                        updateColor('--color-primary', suggestedColor)
                      } else if (check.id === 'sidebar-text') {
                        updateColor('--color-bg-sidebar', suggestedColor)
                      }
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>建议:</Text>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        backgroundColor: suggestedColor,
                        border: '1px solid var(--color-border)',
                      }}
                    />
                  </Space>
                </Tooltip>
              )}
            </div>
          )
        })}
      </Space>

      {/* WCAG说明 */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <Space>
          <InfoCircleOutlined style={{ color: 'var(--color-info)' }} />
          <Text type="secondary">
            WCAG AA 标准要求：普通文本对比度 ≥ 4.5:1，大文本对比度 ≥ 3:1
          </Text>
        </Space>
      </div>
    </div>
  )
}

export default ContrastWarning

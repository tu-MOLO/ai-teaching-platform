import React, { useMemo } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import type { ThemeConfig } from 'antd'
import { useThemeStore } from '../../stores/theme'
import { getRelativeLuminance, hexToRgb } from '../../utils/color'

/**
 * 与 App.css / variables.css 中的控件高度保持一致。
 * antd 默认 controlHeight 为 32px，而项目全局覆写为 36px，
 * 若不统一，Input.Search 的 affix-wrapper 与按钮会出现高度差。
 */
const CONTROL_HEIGHT = 36

/**
 * 背景足够暗时切换 antd 暗色算法，使下拉、弹层、表格等
 * 由 antd 自己派生的颜色跟随主题，而不是停留在默认的浅色体系。
 */
function isDarkColor(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return false
  return getRelativeLuminance(rgb) < 0.35
}

/**
 * 把主题 store 的 CSS 变量映射为 antd v5 的 Design Token。
 *
 * 此前项目只通过 CSS 变量定义主题，而 antd 组件使用默认 token，
 * 导致按钮主色、输入框底色、聚焦描边等不随主题变化。
 */
function buildThemeConfig(colors: Record<string, string>): ThemeConfig {
  const isDark = isDarkColor(colors['--color-bg-primary'])

  return {
    algorithm: isDark
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: colors['--color-primary'],
      colorPrimaryHover: colors['--color-primary-hover'],
      colorPrimaryActive: colors['--color-primary-dark'],
      colorSuccess: colors['--color-success'],
      colorWarning: colors['--color-warning'],
      colorError: colors['--color-error'],
      colorInfo: colors['--color-info'],

      colorBgLayout: colors['--color-bg-primary'],
      colorBgContainer: colors['--color-bg-card'],
      colorBgElevated: colors['--color-bg-card'],
      colorBgTextHover: colors['--color-bg-secondary'],

      colorText: colors['--color-text-primary'],
      colorTextSecondary: colors['--color-text-secondary'],
      colorTextTertiary: colors['--color-text-tertiary'],
      colorTextQuaternary: colors['--color-text-muted'],

      colorBorder: colors['--color-border'],
      colorBorderSecondary: colors['--color-border-light'],

      borderRadius: 8,
      controlHeight: CONTROL_HEIGHT,
      fontSize: 14,
      fontFamily: 'var(--font-family-base)',
    },
  }
}

/**
 * 应用级主题桥接层：订阅主题 store，向 antd 注入对应 token。
 * 必须包在 antd <App> 之外，message / modal 才能继承同一套 token。
 */
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentColors = useThemeStore((state) => state.currentColors)
  const themeConfig = useMemo(
    () => buildThemeConfig(currentColors as unknown as Record<string, string>),
    [currentColors]
  )

  return <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
}

export default ThemeProvider

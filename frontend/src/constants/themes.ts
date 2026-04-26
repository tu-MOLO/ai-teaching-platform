/**
 * 预设配色方案定义
 */

export interface ThemeColors {
  // 主色调
  '--color-primary': string
  '--color-primary-light': string
  '--color-primary-dark': string
  '--color-primary-hover': string

  // 背景色
  '--color-bg-primary': string
  '--color-bg-secondary': string
  '--color-bg-tertiary': string
  '--color-bg-card': string
  '--color-bg-sidebar': string

  // 文字色
  '--color-text-primary': string
  '--color-text-secondary': string
  '--color-text-tertiary': string
  '--color-text-inverse': string
  '--color-text-muted': string

  // 功能色
  '--color-success': string
  '--color-warning': string
  '--color-error': string
  '--color-info': string

  // 边框色
  '--color-border': string
  '--color-border-light': string
  '--color-divider': string
}

export interface PresetTheme {
  id: string
  name: string
  description: string
  colors: ThemeColors
  previewColors: string[] // 用于预览的主要颜色
}

// 默认配色（暖调专业风格）
export const defaultThemeColors: ThemeColors = {
  '--color-primary': '#c9a87c',
  '--color-primary-light': '#d9c4a3',
  '--color-primary-dark': '#a88b5e',
  '--color-primary-hover': '#b89b6e',

  '--color-bg-primary': '#fefcf8',
  '--color-bg-secondary': '#f5f0e8',
  '--color-bg-tertiary': '#ebe5db',
  '--color-bg-card': '#ffffff',
  '--color-bg-sidebar': '#1a1a2e',

  '--color-text-primary': '#2c2c2c',
  '--color-text-secondary': '#5a5a5a',
  '--color-text-tertiary': '#8a8a8a',
  '--color-text-inverse': '#ffffff',
  '--color-text-muted': '#a0a0a0',

  '--color-success': '#6b9b7a',
  '--color-warning': '#d4a574',
  '--color-error': '#c97b7b',
  '--color-info': '#7a9ab8',

  '--color-border': 'rgba(0, 0, 0, 0.06)',
  '--color-border-light': 'rgba(0, 0, 0, 0.04)',
  '--color-divider': 'rgba(0, 0, 0, 0.08)',
}

// 海盐风格 - 清新蓝调
export const oceanTheme: PresetTheme = {
  id: 'ocean',
  name: '海盐风格',
  description: '清新蓝调配色，适合长时间使用',
  colors: {
    '--color-primary': '#7fb3d5',
    '--color-primary-light': '#a8cce5',
    '--color-primary-dark': '#5a9ac4',
    '--color-primary-hover': '#6ba8d0',

    '--color-bg-primary': '#f8fbfd',
    '--color-bg-secondary': '#e8f4f8',
    '--color-bg-tertiary': '#d9ebf2',
    '--color-bg-card': '#ffffff',
    '--color-bg-sidebar': '#2c4a5e',

    '--color-text-primary': '#2c3e50',
    '--color-text-secondary': '#5a6c7d',
    '--color-text-tertiary': '#8a9aa8',
    '--color-text-inverse': '#ffffff',
    '--color-text-muted': '#95a5a6',

    '--color-success': '#5cb85c',
    '--color-warning': '#f0ad4e',
    '--color-error': '#d9534f',
    '--color-info': '#5bc0de',

    '--color-border': 'rgba(127, 179, 213, 0.2)',
    '--color-border-light': 'rgba(127, 179, 213, 0.1)',
    '--color-divider': 'rgba(127, 179, 213, 0.15)',
  },
  previewColors: ['#7fb3d5', '#a8cce5', '#2c4a5e', '#f8fbfd', '#5cb85c'],
}

// 马卡龙风格 - 柔和粉彩
export const macaronTheme: PresetTheme = {
  id: 'macaron',
  name: '马卡龙风格',
  description: '柔和粉彩配色，适合年轻用户',
  colors: {
    '--color-primary': '#f4a4b4',
    '--color-primary-light': '#f8c5d0',
    '--color-primary-dark': '#e87a8e',
    '--color-primary-hover': '#f194a5',

    '--color-bg-primary': '#fff8fa',
    '--color-bg-secondary': '#fceef2',
    '--color-bg-tertiary': '#f9e4eb',
    '--color-bg-card': '#ffffff',
    '--color-bg-sidebar': '#4a3f4f',

    '--color-text-primary': '#4a3f4f',
    '--color-text-secondary': '#7a6f7f',
    '--color-text-tertiary': '#a89fa8',
    '--color-text-inverse': '#ffffff',
    '--color-text-muted': '#c0b8c0',

    '--color-success': '#a8d8b9',
    '--color-warning': '#f4d06f',
    '--color-error': '#f4a4a4',
    '--color-info': '#a4c8f4',

    '--color-border': 'rgba(244, 164, 180, 0.2)',
    '--color-border-light': 'rgba(244, 164, 180, 0.1)',
    '--color-divider': 'rgba(244, 164, 180, 0.15)',
  },
  previewColors: ['#f4a4b4', '#f8c5d0', '#4a3f4f', '#fff8fa', '#a8d8b9'],
}

// 春日风格 - 温暖绿色
export const springTheme: PresetTheme = {
  id: 'spring',
  name: '春日风格',
  description: '温暖绿色配色，适合春季主题',
  colors: {
    '--color-primary': '#90c695',
    '--color-primary-light': '#b0d9b4',
    '--color-primary-dark': '#70b376',
    '--color-primary-hover': '#80bc85',

    '--color-bg-primary': '#f8fdf8',
    '--color-bg-secondary': '#e8f5e9',
    '--color-bg-tertiary': '#d4edda',
    '--color-bg-card': '#ffffff',
    '--color-bg-sidebar': '#2e4a3e',

    '--color-text-primary': '#2c4a3e',
    '--color-text-secondary': '#5a7a6e',
    '--color-text-tertiary': '#8aaa9e',
    '--color-text-inverse': '#ffffff',
    '--color-text-muted': '#a0c0b0',

    '--color-success': '#7cb87c',
    '--color-warning': '#e6b87c',
    '--color-error': '#d68c8c',
    '--color-info': '#7cb8d6',

    '--color-border': 'rgba(144, 198, 149, 0.2)',
    '--color-border-light': 'rgba(144, 198, 149, 0.1)',
    '--color-divider': 'rgba(144, 198, 149, 0.15)',
  },
  previewColors: ['#90c695', '#b0d9b4', '#2e4a3e', '#f8fdf8', '#7cb87c'],
}

// 默认暖调专业风格
export const warmTheme: PresetTheme = {
  id: 'warm',
  name: '暖调专业',
  description: '经典暖调配色，专业稳重',
  colors: defaultThemeColors,
  previewColors: ['#c9a87c', '#d9c4a3', '#1a1a2e', '#fefcf8', '#6b9b7a'],
}

// 所有预设方案列表
export const presetThemes: PresetTheme[] = [warmTheme, oceanTheme, macaronTheme, springTheme]

// 获取预设方案
export function getPresetThemeById(id: string): PresetTheme | undefined {
  return presetThemes.find((theme) => theme.id === id)
}

// 获取默认预设方案
export function getDefaultPresetTheme(): PresetTheme {
  return warmTheme
}

// CSS变量名列表
export const colorVariableNames: (keyof ThemeColors)[] = [
  '--color-primary',
  '--color-primary-light',
  '--color-primary-dark',
  '--color-primary-hover',
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-bg-card',
  '--color-bg-sidebar',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-tertiary',
  '--color-text-inverse',
  '--color-text-muted',
  '--color-success',
  '--color-warning',
  '--color-error',
  '--color-info',
  '--color-border',
  '--color-border-light',
  '--color-divider',
]

// 颜色变量分组
export const colorVariableGroups = [
  {
    key: 'primary',
    name: '主色调',
    variables: ['--color-primary', '--color-primary-light', '--color-primary-dark', '--color-primary-hover'] as const,
  },
  {
    key: 'background',
    name: '背景色',
    variables: ['--color-bg-primary', '--color-bg-secondary', '--color-bg-tertiary', '--color-bg-card', '--color-bg-sidebar'] as const,
  },
  {
    key: 'text',
    name: '文字色',
    variables: ['--color-text-primary', '--color-text-secondary', '--color-text-tertiary', '--color-text-inverse', '--color-text-muted'] as const,
  },
  {
    key: 'functional',
    name: '功能色',
    variables: ['--color-success', '--color-warning', '--color-error', '--color-info'] as const,
  },
  {
    key: 'border',
    name: '边框色',
    variables: ['--color-border', '--color-border-light', '--color-divider'] as const,
  },
]

// 变量显示名称映射
export const colorVariableLabels: Record<keyof ThemeColors, string> = {
  '--color-primary': '主色',
  '--color-primary-light': '主色(浅)',
  '--color-primary-dark': '主色(深)',
  '--color-primary-hover': '主色(悬停)',
  '--color-bg-primary': '主背景',
  '--color-bg-secondary': '次背景',
  '--color-bg-tertiary': '第三背景',
  '--color-bg-card': '卡片背景',
  '--color-bg-sidebar': '侧边栏背景',
  '--color-text-primary': '主要文字',
  '--color-text-secondary': '次要文字',
  '--color-text-tertiary': '第三文字',
  '--color-text-inverse': '反色文字',
  '--color-text-muted': '禁用文字',
  '--color-success': '成功色',
  '--color-warning': '警告色',
  '--color-error': '错误色',
  '--color-info': '信息色',
  '--color-border': '边框',
  '--color-border-light': '边框(浅)',
  '--color-divider': '分割线',
}

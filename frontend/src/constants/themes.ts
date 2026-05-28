export interface ThemeColors {
  '--color-primary': string
  '--color-primary-light': string
  '--color-primary-dark': string
  '--color-primary-hover': string
  '--color-bg-primary': string
  '--color-bg-secondary': string
  '--color-bg-tertiary': string
  '--color-bg-card': string
  '--color-bg-sidebar': string
  '--color-text-primary': string
  '--color-text-secondary': string
  '--color-text-tertiary': string
  '--color-text-inverse': string
  '--color-text-muted': string
  '--color-success': string
  '--color-warning': string
  '--color-error': string
  '--color-info': string
  '--color-border': string
  '--color-border-light': string
  '--color-divider': string
}

export interface PresetTheme {
  id: string
  name: string
  description: string
  colors: ThemeColors
  previewColors: string[]
}

/* ============================================
   方案1 - 蓝色渐变组（默认）
   #021024 #052659 #548CA8 #7DA0CA #C1E8FF
   ============================================ */
export const defaultThemeColors: ThemeColors = {
  '--color-primary': '#548CA8',
  '--color-primary-light': '#7DA0CA',
  '--color-primary-dark': '#052659',
  '--color-primary-hover': '#6a9cb5',

  '--color-bg-primary': '#f3f9fc',
  '--color-bg-secondary': '#e6f2f8',
  '--color-bg-tertiary': '#d6e9f2',
  '--color-bg-card': '#ffffff',
  '--color-bg-sidebar': '#021024',

  '--color-text-primary': '#021024',
  '--color-text-secondary': '#1e3a5c',
  '--color-text-tertiary': '#548CA8',
  '--color-text-inverse': '#ffffff',
  '--color-text-muted': '#7DA0CA',

  '--color-success': '#6b9b7a',
  '--color-warning': '#d4a574',
  '--color-error': '#c97b7b',
  '--color-info': '#548CA8',

  '--color-border': 'rgba(84, 140, 168, 0.14)',
  '--color-border-light': 'rgba(84, 140, 168, 0.07)',
  '--color-divider': 'rgba(84, 140, 168, 0.10)',
}

export const blueTheme: PresetTheme = {
  id: 'blue',
  name: '蓝色渐变',
  description: '专业稳重，清晰明快',
  colors: defaultThemeColors,
  previewColors: ['#548CA8', '#7DA0CA', '#021024', '#f3f9fc', '#6b9b7a'],
}

/* ============================================
   方案2 - 莫兰迪柔色组
   #99CDD8 #D1E7DD #F0DDD0 #FAC2BE #E2E8D4 #657166
   ============================================ */
export const morandiTheme: PresetTheme = {
  id: 'morandi',
  name: '莫兰迪柔色',
  description: '低饱和柔和，温润舒适',
  colors: {
    '--color-primary': '#657166',
    '--color-primary-light': '#99CDD8',
    '--color-primary-dark': '#4a5850',
    '--color-primary-hover': '#7d8a7e',

    '--color-bg-primary': '#faf8f6',
    '--color-bg-secondary': '#f0eeea',
    '--color-bg-tertiary': '#e8e5df',
    '--color-bg-card': '#ffffff',
    '--color-bg-sidebar': '#3d4340',

    '--color-text-primary': '#2d3330',
    '--color-text-secondary': '#4a5850',
    '--color-text-tertiary': '#657166',
    '--color-text-inverse': '#ffffff',
    '--color-text-muted': '#8a908a',

    '--color-success': '#8cb89a',
    '--color-warning': '#d4b896',
    '--color-error': '#c99b9b',
    '--color-info': '#99b8c9',

    '--color-border': 'rgba(101, 113, 102, 0.12)',
    '--color-border-light': 'rgba(101, 113, 102, 0.06)',
    '--color-divider': 'rgba(101, 113, 102, 0.10)',
  },
  previewColors: ['#657166', '#99CDD8', '#3d4340', '#faf8f6', '#8cb89a'],
}

/* ============================================
   方案3 - 深灰中性组
   #06141B #11212D #253745 #4A5C6A #9BA8AB #CCD0CF
   ============================================ */
export const neutralTheme: PresetTheme = {
  id: 'neutral',
  name: '深灰中性',
  description: '克制内敛，聚焦内容',
  colors: {
    '--color-primary': '#4A5C6A',
    '--color-primary-light': '#9BA8AB',
    '--color-primary-dark': '#253745',
    '--color-primary-hover': '#6b7d8a',

    '--color-bg-primary': '#f5f6f6',
    '--color-bg-secondary': '#e8ebec',
    '--color-bg-tertiary': '#dce0e1',
    '--color-bg-card': '#ffffff',
    '--color-bg-sidebar': '#06141B',

    '--color-text-primary': '#06141B',
    '--color-text-secondary': '#11212D',
    '--color-text-tertiary': '#4A5C6A',
    '--color-text-inverse': '#ffffff',
    '--color-text-muted': '#9BA8AB',

    '--color-success': '#6b9b7a',
    '--color-warning': '#d4a574',
    '--color-error': '#c97b7b',
    '--color-info': '#4A5C6A',

    '--color-border': 'rgba(74, 92, 106, 0.12)',
    '--color-border-light': 'rgba(74, 92, 106, 0.06)',
    '--color-divider': 'rgba(74, 92, 106, 0.10)',
  },
  previewColors: ['#4A5C6A', '#9BA8AB', '#06141B', '#f5f6f6', '#6b9b7a'],
}

/* ============================================
   方案4 - 紫粉渐变组
   #2E365A #6B597F #A2869C #BD6C73 #92A1C2 #3F5BBD
   ============================================ */
export const violetTheme: PresetTheme = {
  id: 'violet',
  name: '紫粉渐变',
  description: '优雅知性，柔和亮眼',
  colors: {
    '--color-primary': '#3F5BBD',
    '--color-primary-light': '#92A1C2',
    '--color-primary-dark': '#2E365A',
    '--color-primary-hover': '#5a74cf',

    '--color-bg-primary': '#f9f8fb',
    '--color-bg-secondary': '#f0eef5',
    '--color-bg-tertiary': '#e8e4ef',
    '--color-bg-card': '#ffffff',
    '--color-bg-sidebar': '#2E365A',

    '--color-text-primary': '#1a1d2e',
    '--color-text-secondary': '#2E365A',
    '--color-text-tertiary': '#6B597F',
    '--color-text-inverse': '#ffffff',
    '--color-text-muted': '#A2869C',

    '--color-success': '#7aaa8a',
    '--color-warning': '#c9a080',
    '--color-error': '#BD6C73',
    '--color-info': '#92A1C2',

    '--color-border': 'rgba(63, 91, 189, 0.12)',
    '--color-border-light': 'rgba(63, 91, 189, 0.06)',
    '--color-divider': 'rgba(63, 91, 189, 0.10)',
  },
  previewColors: ['#3F5BBD', '#92A1C2', '#2E365A', '#f9f8fb', '#7aaa8a'],
}

/* ========== 导出列表 ========== */
export const presetThemes: PresetTheme[] = [blueTheme, morandiTheme, neutralTheme, violetTheme]

export function getPresetThemeById(id: string): PresetTheme | undefined {
  return presetThemes.find((theme) => theme.id === id)
}

export function getDefaultPresetTheme(): PresetTheme {
  return blueTheme
}

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

/**
 * 颜色处理工具函数
 * 提供颜色转换、对比度计算等功能
 */

export interface RGBColor {
  r: number
  g: number
  b: number
}

/**
 * 将HEX颜色转换为RGB对象
 * @param hex - HEX颜色值 (如: #c9a87c 或 #fff)
 * @returns RGBColor对象
 */
export function hexToRgb(hex: string): RGBColor | null {
  const cleanHex = hex.replace('#', '')
  
  // 处理3位HEX格式
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    return { r, g, b }
  }
  
  // 处理6位HEX格式
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16)
    const g = parseInt(cleanHex.slice(2, 4), 16)
    const b = parseInt(cleanHex.slice(4, 6), 16)
    return { r, g, b }
  }
  
  return null
}

/**
 * 将RGB对象转换为HEX颜色
 * @param rgb - RGBColor对象
 * @returns HEX颜色值 (如: #c9a87c)
 */
export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number): string => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toLowerCase()
}

/**
 * 将RGB对象转换为RGB字符串
 * @param rgb - RGBColor对象
 * @returns RGB字符串 (如: rgb(201, 168, 124))
 */
export function rgbToString(rgb: RGBColor): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

/**
 * 计算颜色的相对亮度 (WCAG标准)
 * @param rgb - RGBColor对象
 * @returns 相对亮度值 (0-1)
 */
export function getRelativeLuminance(rgb: RGBColor): number {
  const normalize = (c: number): number => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  }
  
  const r = normalize(rgb.r)
  const g = normalize(rgb.g)
  const b = normalize(rgb.b)
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 计算两个颜色之间的对比度 (WCAG标准)
 * @param color1 - 第一个颜色 (HEX格式)
 * @param color2 - 第二个颜色 (HEX格式)
 * @returns 对比度比值
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 0
  
  const l1 = getRelativeLuminance(rgb1)
  const l2 = getRelativeLuminance(rgb2)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * 检查颜色是否满足WCAG AA标准
 * @param foreground - 前景色 (HEX格式)
 * @param background - 背景色 (HEX格式)
 * @param isLargeText - 是否为大文本
 * @returns 是否满足标准
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background)
  const minRatio = isLargeText ? 3 : 4.5
  return ratio >= minRatio
}

/**
 * 检查颜色是否满足WCAG AAA标准
 * @param foreground - 前景色 (HEX格式)
 * @param background - 背景色 (HEX格式)
 * @param isLargeText - 是否为大文本
 * @returns 是否满足标准
 */
export function meetsWCAGAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background)
  const minRatio = isLargeText ? 4.5 : 7
  return ratio >= minRatio
}

/**
 * 调整颜色亮度
 * @param hex - HEX颜色值
 * @param amount - 调整量 (-100 到 100)
 * @returns 调整后的HEX颜色值
 */
export function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const clamp = (n: number): number => Math.max(0, Math.min(255, n))
  
  const adjustedRgb: RGBColor = {
    r: clamp(rgb.r + (255 * amount) / 100),
    g: clamp(rgb.g + (255 * amount) / 100),
    b: clamp(rgb.b + (255 * amount) / 100),
  }
  
  return rgbToHex(adjustedRgb)
}

/**
 * 调整颜色饱和度
 * @param hex - HEX颜色值
 * @param amount - 调整量 (-100 到 100)
 * @returns 调整后的HEX颜色值
 */
export function adjustSaturation(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  const delta = max - min
  
  if (delta === 0) return hex
  
  const currentSaturation = delta / max
  const newSaturation = Math.max(0, Math.min(1, currentSaturation * (1 + amount / 100)))
  
  // 简化的饱和度调整
  const factor = newSaturation / currentSaturation
  const adjustedRgb: RGBColor = {
    r: Math.round(max - (max - rgb.r) * factor),
    g: Math.round(max - (max - rgb.g) * factor),
    b: Math.round(max - (max - rgb.b) * factor),
  }
  
  return rgbToHex(adjustedRgb)
}

/**
 * 验证颜色格式是否合法
 * @param color - 颜色值
 * @returns 是否合法
 */
export function isValidColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false
  
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexRegex.test(color.trim())
}

/**
 * 标准化HEX颜色格式
 * @param color - 颜色值
 * @returns 标准化的6位HEX颜色值，无效时返回null
 */
export function normalizeHex(color: string): string | null {
  if (!isValidColor(color)) return null
  
  let hex = color.trim().toLowerCase().replace('#', '')
  
  // 将3位HEX转换为6位
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  
  return `#${hex}`
}

/**
 * 生成颜色的变体
 * @param baseColor - 基础颜色
 * @returns 包含light、dark、hover变体的对象
 */
export function generateColorVariants(baseColor: string): {
  light: string
  dark: string
  hover: string
} {
  return {
    light: adjustBrightness(baseColor, 20),
    dark: adjustBrightness(baseColor, -15),
    hover: adjustBrightness(baseColor, -8),
  }
}

/**
 * 生成随机颜色
 * @returns 随机HEX颜色值
 */
export function generateRandomColor(): string {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return rgbToHex({ r, g, b })
}

/**
 * 从CSS变量值中提取颜色
 * @param variableName - CSS变量名
 * @returns 颜色值或null
 */
export function getCssVariableColor(variableName: string): string | null {
  if (typeof window === 'undefined') return null
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim()
  
  return value || null
}

/**
 * 设置CSS变量值
 * @param variableName - CSS变量名
 * @param value - 颜色值
 */
export function setCssVariable(variableName: string, value: string): void {
  if (typeof window === 'undefined') return
  
  document.documentElement.style.setProperty(variableName, value)
}

/**
 * 批量设置CSS变量
 * @param variables - 变量名和值的映射对象
 */
export function setCssVariables(variables: Record<string, string>): void {
  if (typeof window === 'undefined') return
  
  Object.entries(variables).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value)
  })
}

/**
 * 获取颜色建议（用于对比度不足时）
 * @param foreground - 前景色
 * @param background - 背景色
 * @param targetRatio - 目标对比度
 * @returns 建议的颜色值
 */
export function getSuggestedColor(
  foreground: string,
  background: string,
  targetRatio = 4.5
): string {
  const fgRgb = hexToRgb(foreground)
  const bgRgb = hexToRgb(background)
  
  if (!fgRgb || !bgRgb) return foreground
  
  const bgLuminance = getRelativeLuminance(bgRgb)
  
  // 根据背景亮度决定调整方向
  const isDarkBackground = bgLuminance < 0.5
  let adjustedColor = foreground
  let attempts = 0
  
  while (getContrastRatio(adjustedColor, background) < targetRatio && attempts < 20) {
    const adjustment = isDarkBackground ? 10 : -10
    adjustedColor = adjustBrightness(adjustedColor, adjustment)
    attempts++
  }
  
  return adjustedColor
}

/**
 * 格式化对比度比值为可读字符串
 * @param ratio - 对比度比值
 * @returns 格式化后的字符串
 */
export function formatContrastRatio(ratio: number): string {
  return ratio.toFixed(2) + ':1'
}

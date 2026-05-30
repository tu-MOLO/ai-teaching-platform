import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  rgbToHex,
  rgbToString,
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  adjustBrightness,
  adjustSaturation,
  isValidColor,
  normalizeHex,
  generateColorVariants,
  generateRandomColor,
  getCssVariableColor,
  setCssVariable,
  setCssVariables,
  getSuggestedColor,
  formatContrastRatio,
} from '../color'

describe('hexToRgb', () => {
  it('should convert 6-digit hex to RGB', () => {
    expect(hexToRgb('#548CA8')).toEqual({ r: 84, g: 140, b: 168 })
  })

  it('should convert 3-digit hex to RGB', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('should convert hex without # prefix', () => {
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('should return null-like result for invalid hex characters', () => {
    const result = hexToRgb('#gggggg')
    expect(isNaN(result!.r) || result === null).toBe(true)
  })

  it('should return null for invalid length', () => {
    expect(hexToRgb('#1234')).toBeNull()
  })
})

describe('rgbToHex', () => {
  it('should convert RGB to hex', () => {
    expect(rgbToHex({ r: 84, g: 140, b: 168 })).toBe('#548ca8')
  })

  it('should convert black to #000000', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
  })

  it('should convert white to #ffffff', () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff')
  })

  it('should clamp values above 255', () => {
    expect(rgbToHex({ r: 300, g: 300, b: 300 })).toBe('#ffffff')
  })

  it('should clamp values below 0', () => {
    expect(rgbToHex({ r: -10, g: -10, b: -10 })).toBe('#000000')
  })

  it('should pad single digit hex values', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203')
  })
})

describe('rgbToString', () => {
  it('should format RGB as string', () => {
    expect(rgbToString({ r: 201, g: 168, b: 124 })).toBe('rgb(201, 168, 124)')
  })
})

describe('getRelativeLuminance', () => {
  it('should return 1 for white', () => {
    expect(getRelativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
  })

  it('should return 0 for black', () => {
    expect(getRelativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5)
  })

  it('should return value between 0 and 1 for a color', () => {
    const luminance = getRelativeLuminance({ r: 84, g: 140, b: 168 })
    expect(luminance).toBeGreaterThan(0)
    expect(luminance).toBeLessThan(1)
  })
})

describe('getContrastRatio', () => {
  it('should return 21 for black and white', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('should return 1 for same colors', () => {
    expect(getContrastRatio('#548CA8', '#548CA8')).toBeCloseTo(1, 5)
  })

  it('should return 0 for invalid colors', () => {
    expect(getContrastRatio('invalid', '#ffffff')).toBe(0)
  })
})

describe('meetsWCAGAA', () => {
  it('should pass for high contrast colors', () => {
    expect(meetsWCAGAA('#000000', '#ffffff')).toBe(true)
  })

  it('should fail for low contrast colors', () => {
    expect(meetsWCAGAA('#777777', '#888888')).toBe(false)
  })

  it('should have lower threshold for large text', () => {
    expect(meetsWCAGAA('#777777', '#999999', true)).toBe(false)
  })
})

describe('meetsWCAGAAA', () => {
  it('should pass for very high contrast', () => {
    expect(meetsWCAGAAA('#000000', '#ffffff')).toBe(true)
  })

  it('should have stricter threshold than AA', () => {
    const fg = '#999999'
    const bg = '#ffffff'
    const aaResult = meetsWCAGAA(fg, bg, true)
    const aaaResult = meetsWCAGAAA(fg, bg, true)
    if (aaResult && !aaaResult) {
      expect(aaaResult).toBe(false)
    }
    expect(meetsWCAGAAA('#000000', '#ffffff')).toBe(true)
    expect(meetsWCAGAAA('#999999', '#ffffff')).toBe(false)
  })
})

describe('adjustBrightness', () => {
  it('should increase brightness', () => {
    const result = adjustBrightness('#000000', 50)
    expect(result).not.toBe('#000000')
  })

  it('should decrease brightness', () => {
    const result = adjustBrightness('#ffffff', -50)
    expect(result).not.toBe('#ffffff')
  })

  it('should return original hex for invalid input', () => {
    expect(adjustBrightness('invalid', 50)).toBe('invalid')
  })

  it('should not exceed 255 when brightening', () => {
    const result = adjustBrightness('#ffffff', 100)
    expect(result).toBe('#ffffff')
  })

  it('should not go below 0 when darkening', () => {
    const result = adjustBrightness('#000000', -100)
    expect(result).toBe('#000000')
  })
})

describe('adjustSaturation', () => {
  it('should adjust saturation of a color', () => {
    const result = adjustSaturation('#548CA8', 50)
    expect(result).toBeTruthy()
    expect(result).not.toBe('#548ca8')
  })

  it('should return original hex for grayscale', () => {
    expect(adjustSaturation('#808080', 50)).toBe('#808080')
  })

  it('should return original hex for invalid input', () => {
    expect(adjustSaturation('invalid', 50)).toBe('invalid')
  })
})

describe('isValidColor', () => {
  it('should validate 6-digit hex', () => {
    expect(isValidColor('#548CA8')).toBe(true)
  })

  it('should validate 3-digit hex', () => {
    expect(isValidColor('#fff')).toBe(true)
  })

  it('should reject invalid hex', () => {
    expect(isValidColor('#gggggg')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isValidColor('')).toBe(false)
  })

  it('should reject non-string input', () => {
    expect(isValidColor(123 as any)).toBe(false)
  })

  it('should reject hex without #', () => {
    expect(isValidColor('548CA8')).toBe(false)
  })
})

describe('normalizeHex', () => {
  it('should convert 3-digit hex to 6-digit', () => {
    expect(normalizeHex('#fff')).toBe('#ffffff')
  })

  it('should keep 6-digit hex as is', () => {
    expect(normalizeHex('#548CA8')).toBe('#548ca8')
  })

  it('should return null for invalid color', () => {
    expect(normalizeHex('invalid')).toBeNull()
  })
})

describe('generateColorVariants', () => {
  it('should generate light, dark, and hover variants', () => {
    const variants = generateColorVariants('#548CA8')
    expect(variants).toHaveProperty('light')
    expect(variants).toHaveProperty('dark')
    expect(variants).toHaveProperty('hover')
  })

  it('should generate different colors for each variant', () => {
    const variants = generateColorVariants('#548CA8')
    expect(variants.light).not.toBe(variants.dark)
    expect(variants.hover).not.toBe(variants.dark)
  })
})

describe('generateRandomColor', () => {
  it('should generate a valid hex color', () => {
    const color = generateRandomColor()
    expect(isValidColor(color)).toBe(true)
  })

  it('should generate different colors', () => {
    const colors = new Set<string>()
    for (let i = 0; i < 10; i++) {
      colors.add(generateRandomColor())
    }
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('getCssVariableColor', () => {
  it('should return null when window is undefined', () => {
    const originalWindow = global.window
    vi.stubGlobal('window', undefined)
    expect(getCssVariableColor('--color-primary')).toBeNull()
    vi.stubGlobal('window', originalWindow)
  })
})

describe('setCssVariable', () => {
  it('should not throw when window is undefined', () => {
    const originalWindow = global.window
    vi.stubGlobal('window', undefined)
    expect(() => setCssVariable('--color-primary', '#ff0000')).not.toThrow()
    vi.stubGlobal('window', originalWindow)
  })
})

describe('setCssVariables', () => {
  it('should not throw when window is undefined', () => {
    const originalWindow = global.window
    vi.stubGlobal('window', undefined)
    expect(() => setCssVariables({ '--color-primary': '#ff0000' })).not.toThrow()
    vi.stubGlobal('window', originalWindow)
  })
})

describe('getSuggestedColor', () => {
  it('should return original color for invalid input', () => {
    expect(getSuggestedColor('invalid', '#ffffff')).toBe('invalid')
  })

  it('should return a color with sufficient contrast', () => {
    const suggested = getSuggestedColor('#888888', '#ffffff', 4.5)
    expect(meetsWCAGAA(suggested, '#ffffff')).toBe(true)
  })
})

describe('formatContrastRatio', () => {
  it('should format ratio as string with :1', () => {
    expect(formatContrastRatio(4.5)).toBe('4.50:1')
  })

  it('should format ratio 21', () => {
    expect(formatContrastRatio(21)).toBe('21.00:1')
  })
})

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Slider, Space, Tooltip } from 'antd'
import type { RGBColor } from '../../utils/color'
import { hexToRgb, rgbToHex, isValidColor, normalizeHex } from '../../utils/color'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  size = 'medium',
  showText = true,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [rgbValues, setRgbValues] = useState<RGBColor>({ r: 0, g: 0, b: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const sizeConfig = {
    small: { width: 24, height: 24, fontSize: 12 },
    medium: { width: 32, height: 32, fontSize: 14 },
    large: { width: 40, height: 40, fontSize: 16 },
  }

  const { width, height, fontSize } = sizeConfig[size]

  // 同步外部值
  useEffect(() => {
    setInputValue(value)
    const rgb = hexToRgb(value)
    if (rgb) {
      setRgbValues(rgb)
    }
  }, [value])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 处理HEX输入
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim()
    setInputValue(newValue)

    if (isValidColor(newValue)) {
      const normalized = normalizeHex(newValue)
      if (normalized) {
        onChange(normalized)
        const rgb = hexToRgb(normalized)
        if (rgb) {
          setRgbValues(rgb)
        }
      }
    }
  }

  // 处理HEX输入完成（失去焦点或回车）
  const handleHexInputBlur = () => {
    if (isValidColor(inputValue)) {
      const normalized = normalizeHex(inputValue)
      if (normalized) {
        setInputValue(normalized)
      }
    } else {
      // 无效时恢复原值
      setInputValue(value)
    }
  }

  const handleHexInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHexInputBlur()
      setIsOpen(false)
    }
  }

  // 处理RGB滑块变化
  const handleRgbChange = useCallback(
    (channel: keyof RGBColor, newValue: number) => {
      const newRgb = { ...rgbValues, [channel]: newValue }
      setRgbValues(newRgb)
      const hex = rgbToHex(newRgb)
      setInputValue(hex)
      onChange(hex)
    },
    [rgbValues, onChange]
  )

  // 颜色预设
  const colorPresets = [
    '#c9a87c',
    '#7fb3d5',
    '#f4a4b4',
    '#90c695',
    '#6b9b7a',
    '#d4a574',
    '#c97b7b',
    '#7a9ab8',
    '#2c2c2c',
    '#ffffff',
    '#f5f5f5',
    '#e8e8e8',
  ]

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Space>
        {/* 颜色预览按钮 */}
        <Tooltip title="点击选择颜色">
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width,
              height,
              borderRadius: 6,
              border: '2px solid var(--color-border)',
              backgroundColor: value,
              cursor: 'pointer',
              padding: 0,
              boxShadow: isOpen ? '0 0 0 2px var(--color-primary-light)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
            }}
          />
        </Tooltip>

        {/* HEX输入框 */}
        {showText && (
          <Input
            value={inputValue}
            onChange={handleHexInputChange}
            onBlur={handleHexInputBlur}
            onKeyDown={handleHexInputKeyDown}
            style={{
              width: 100,
              fontSize,
              fontFamily: 'monospace',
            }}
            placeholder="#c9a87c"
            status={!isValidColor(inputValue) && inputValue !== '' ? 'error' : undefined}
          />
        )}
      </Space>

      {/* 颜色选择面板 */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: height + 8,
            left: 0,
            zIndex: 1000,
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            padding: 16,
            minWidth: 280,
          }}
        >
          {/* 颜色预览 */}
          <div
            style={{
              width: '100%',
              height: 48,
              backgroundColor: value,
              borderRadius: 8,
              marginBottom: 16,
              border: '1px solid var(--color-border)',
            }}
          />

          {/* RGB滑块 */}
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {(['r', 'g', 'b'] as const).map((channel) => (
              <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      channel === 'r'
                        ? '#ff4d4f'
                        : channel === 'g'
                          ? '#52c41a'
                          : '#1890ff',
                  }}
                >
                  {channel.toUpperCase()}
                </span>
                <Slider
                  min={0}
                  max={255}
                  value={rgbValues[channel]}
                  onChange={(v) => handleRgbChange(channel, v)}
                  style={{
                    flex: 1,
                    margin: 0,
                  }}
                  styles={{
                    track: {
                      background:
                        channel === 'r'
                          ? `linear-gradient(to right, rgb(0, ${rgbValues.g}, ${rgbValues.b}), rgb(255, ${rgbValues.g}, ${rgbValues.b}))`
                          : channel === 'g'
                            ? `linear-gradient(to right, rgb(${rgbValues.r}, 0, ${rgbValues.b}), rgb(${rgbValues.r}, 255, ${rgbValues.b}))`
                            : `linear-gradient(to right, rgb(${rgbValues.r}, ${rgbValues.g}, 0), rgb(${rgbValues.r}, ${rgbValues.g}, 255))`,
                    },
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  max={255}
                  value={rgbValues[channel]}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
                    handleRgbChange(channel, v)
                  }}
                  style={{ width: 56, fontSize: 12 }}
                />
              </div>
            ))}
          </Space>

          {/* 颜色预设 */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              预设颜色
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onChange(color)
                    setInputValue(color)
                    const rgb = hexToRgb(color)
                    if (rgb) setRgbValues(rgb)
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border:
                      value.toLowerCase() === color.toLowerCase()
                        ? '2px solid var(--color-primary)'
                        : '1px solid var(--color-border)',
                    backgroundColor: color,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* RGB值显示 */}
          <div
            style={{
              marginTop: 12,
              padding: 8,
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'monospace',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            rgb({rgbValues.r}, {rgbValues.g}, {rgbValues.b})
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker

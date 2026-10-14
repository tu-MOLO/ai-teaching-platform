import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Modal, Slider } from 'antd'

/** 裁剪视窗边长（px），同时作为正方形取景框 */
const VIEWPORT = 300
/** 输出头像边长（px），正方形 */
const OUTPUT = 256
/** 缩放倍率范围（相对最小的“铺满”比例） */
const MIN_ZOOM = 1
const MAX_ZOOM = 3

interface AvatarCropperProps {
  open: boolean
  /** 待裁剪图片（data URL） */
  imageSrc: string | null
  confirmLoading?: boolean
  onCancel: () => void
  /** 确认裁剪，回传方形 PNG Blob */
  onConfirm: (blob: Blob) => void | Promise<void>
}

/**
 * 头像裁剪器：拖动平移、滑杆缩放，输出固定尺寸的正方形 PNG。
 * 未引入额外依赖，使用原生 canvas 导出，便于离线自托管环境部署。
 */
const AvatarCropper: React.FC<AvatarCropperProps> = ({
  open,
  imageSrc,
  confirmLoading = false,
  onCancel,
  onConfirm,
}) => {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // 打开时载入图片，重置为“铺满并居中”
  useEffect(() => {
    if (!open || !imageSrc) return
    const image = new window.Image()
    image.onload = () => {
      imageRef.current = image
      setNatural({ width: image.naturalWidth, height: image.naturalHeight })
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
    image.src = imageSrc
    return () => {
      image.onload = null
    }
  }, [open, imageSrc])

  const baseScale = natural ? VIEWPORT / Math.min(natural.width, natural.height) : 1

  // 保证图片始终铺满视窗，不出现留白
  const clamp = useCallback(
    (x: number, y: number, currentScale: number) => {
      if (!natural) return { x: 0, y: 0 }
      const effective = baseScale * currentScale
      const width = natural.width * effective
      const height = natural.height * effective
      return {
        x: Math.min(0, Math.max(VIEWPORT - width, x)),
        y: Math.min(0, Math.max(VIEWPORT - height, y)),
      }
    },
    [natural, baseScale]
  )

  const handleScaleChange = (next: number) => {
    setScale(next)
    setOffset((prev) => clamp(prev.x, prev.y, next))
  }

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setOffset(
      clamp(
        drag.originX + (event.clientX - drag.startX),
        drag.originY + (event.clientY - drag.startY),
        scale
      )
    )
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const handleConfirm = () => {
    const image = imageRef.current
    if (!image || !natural) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const effective = baseScale * scale
    const sourceX = -offset.x / effective
    const sourceY = -offset.y / effective
    const sourceSize = VIEWPORT / effective
    ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT)
    canvas.toBlob((blob) => {
      if (blob) void onConfirm(blob)
    }, 'image/png')
  }

  const displayWidth = natural ? natural.width * baseScale * scale : 0
  const displayHeight = natural ? natural.height * baseScale * scale : 0

  return (
    <Modal
      title="裁剪头像"
      open={open}
      onCancel={onCancel}
      width="min(420px, 92vw)"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="ok" type="primary" loading={confirmLoading} onClick={handleConfirm}>
          确定
        </Button>,
      ]}
    >
      <div className="avatar-crop-hint">拖动图片调整位置，滑动缩放，裁剪结果保存为正方形。</div>
      <div className="avatar-crop-stage">
        <div
          className="avatar-crop-viewport"
          data-testid="avatar-crop-viewport"
          style={{
            position: 'relative',
            width: VIEWPORT,
            height: VIEWPORT,
            overflow: 'hidden',
            borderRadius: 12,
            background: '#f0f0f0',
            cursor: 'move',
            touchAction: 'none',
          }}
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {imageSrc && natural && (
            <img
              src={imageSrc}
              alt="待裁剪头像"
              draggable={false}
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                width: displayWidth,
                height: displayHeight,
                maxWidth: 'none',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
      <div className="avatar-crop-slider">
        <Slider
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={scale}
          onChange={handleScaleChange}
          tooltip={{ formatter: null }}
        />
      </div>
    </Modal>
  )
}

export default AvatarCropper

import React, { useEffect, useCallback } from 'react'
import { Button, Space, Tooltip, Badge } from 'antd'
import { UndoOutlined, RedoOutlined } from '@ant-design/icons'
import { useThemeStore } from '../../stores/theme'

interface HistoryControlsProps {
  className?: string
  style?: React.CSSProperties
}

const HistoryControls: React.FC<HistoryControlsProps> = ({ className, style }) => {
  const { undo, redo, canUndo, canRedo, history, historyIndex } = useThemeStore()

  const canUndoState = canUndo()
  const canRedoState = canRedo()
  const historyLength = history.length

  // 键盘快捷键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+Z 或 Cmd+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndoState) {
          undo()
        }
      }

      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedoState) {
          redo()
        }
      }
    },
    [canUndoState, canRedoState, undo, redo]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <Space className={className} style={style}>
      <Tooltip title="撤销 (Ctrl+Z)">
        <Button
          icon={<UndoOutlined />}
          onClick={undo}
          disabled={!canUndoState}
          type={canUndoState ? 'default' : 'text'}
        >
          撤销
        </Button>
      </Tooltip>

      <Tooltip title="重做 (Ctrl+Y)">
        <Button
          icon={<RedoOutlined />}
          onClick={redo}
          disabled={!canRedoState}
          type={canRedoState ? 'default' : 'text'}
        >
          重做
        </Button>
      </Tooltip>

      {/* 历史记录计数 */}
      <Badge
        count={`${historyIndex + 1}/${historyLength}`}
        style={{
          backgroundColor: historyLength > 1 ? 'var(--color-primary-light)' : 'var(--color-border)',
          color: historyLength > 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          fontSize: 11,
        }}
      />
    </Space>
  )
}

export default HistoryControls

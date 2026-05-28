import React from 'react'
import { Tag } from 'antd'

interface ModuleTagProps {
  label: string
  color: string
  closable?: boolean
  onClose?: () => void
}

const ModuleTag: React.FC<ModuleTagProps> = ({ label, color, closable, onClose }) => {
  return (
    <Tag color={color} closable={closable} onClose={onClose}>
      {label}
    </Tag>
  )
}

export default ModuleTag

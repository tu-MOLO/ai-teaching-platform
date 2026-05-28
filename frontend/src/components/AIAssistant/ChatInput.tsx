import React, { useState } from 'react'
import { Input, Button, Tag, Space } from 'antd'
import { SendOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface ModuleOption {
  readonly key: string
  readonly label: string
  readonly color: string
}

interface ChatInputProps {
  onSend: (content: string, module?: string) => void
  disabled?: boolean
  moduleOptions: readonly ModuleOption[]
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, moduleOptions }) => {
  const [value, setValue] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | undefined>(undefined)

  const handleSend = () => {
    if (!value.trim() || disabled) return
    onSend(value.trim(), selectedModule)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleModule = (key: string) => {
    setSelectedModule(prev => prev === key ? undefined : key)
  }

  return (
    <div className="chat-input-area">
      {selectedModule && (
        <div className="chat-input-tags">
          <Tag
            color={moduleOptions.find(m => m.key === selectedModule)?.color}
            closable
            onClose={() => setSelectedModule(undefined)}
          >
            {moduleOptions.find(m => m.key === selectedModule)?.label}
          </Tag>
        </div>
      )}
      <div className="chat-input-modules">
        <Space size={[4, 4]} wrap>
          {moduleOptions.map(opt => (
            <Tag
              key={opt.key}
              color={selectedModule === opt.key ? opt.color : undefined}
              style={{ cursor: 'pointer', opacity: selectedModule && selectedModule !== opt.key ? 0.5 : 1 }}
              onClick={() => toggleModule(opt.key)}
            >
              {opt.label}
            </Tag>
          ))}
        </Space>
      </div>
      <div className="chat-input-row">
        <TextArea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={disabled}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!value.trim() || disabled}
        />
      </div>
    </div>
  )
}

export default ChatInput

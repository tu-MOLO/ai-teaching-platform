import React from 'react'
import { Card, Empty, Typography } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import './index.css'

const { Title, Paragraph } = Typography

const AIAssistant: React.FC = () => {
  return (
    <div className="ai-assistant-page">
      <Card className="ai-assistant-card">
        <Empty
          image={<RobotOutlined className="ai-assistant-icon" />}
          description={
            <div className="ai-assistant-content">
              <Title level={3}>AI助手</Title>
              <Paragraph className="ai-assistant-description">
                AI助手功能正在开发中，敬请期待...
              </Paragraph>
              <Paragraph type="secondary" className="ai-assistant-subtitle">
                智能教学辅助、自动批改、个性化推荐等功能即将上线
              </Paragraph>
            </div>
          }
        />
      </Card>
    </div>
  )
}

export default AIAssistant

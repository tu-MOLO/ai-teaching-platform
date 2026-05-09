import React from 'react';
import { Card, Typography, Tag, Row, Col, Space } from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import './index.css';

const { Title, Text, Paragraph } = Typography;

const features = [
  {
    icon: <FileTextOutlined />,
    title: '智能教案生成',
    description: '基于课程目标和学生情况，一键生成结构化教案'
  },
  {
    icon: <BulbOutlined />,
    title: '个性化学习建议',
    description: '根据学生档案和能力雷达图，提供针对性学习建议'
  },
  {
    icon: <CheckCircleOutlined />,
    title: '自动作业批改',
    description: '支持客观题自动评分，主观题辅助评估'
  },
  {
    icon: <ExperimentOutlined />,
    title: '学情分析报告',
    description: 'AI驱动的班级和学生个体学情趋势分析'
  },
];

const AIAssistant: React.FC = () => {
  return (
    <div className="ai-assistant-page">
      <Card className="ai-assistant-card" variant="borderless">
        <div className="ai-assistant-content">
          <div className="ai-assistant-header">
            <RobotOutlined className="ai-assistant-header-icon" />
            <div>
              <Space align="center">
                <Title level={3} style={{ margin: 0 }}>AI 智能助手</Title>
                <Tag color="blue">即将上线</Tag>
              </Space>
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                AI功能正在研发中，上线后将为您提供智能化的教学辅助体验
              </Paragraph>
            </div>
          </div>

          <Title level={5} style={{ marginTop: 32, marginBottom: 16 }}>
            <RocketOutlined style={{ marginRight: 8 }} />
            计划推出的功能
          </Title>

          <Row gutter={[16, 16]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} key={index}>
                <Card className="ai-feature-card" size="small" hoverable>
                  <Space>
                    <span className="ai-feature-icon">{feature.icon}</span>
                    <div>
                      <Text strong>{feature.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {feature.description}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;
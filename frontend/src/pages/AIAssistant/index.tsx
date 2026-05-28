import React from 'react';
import { Typography, Tag, Space } from 'antd';
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
  { icon: <FileTextOutlined />, title: '智能教案生成', description: '基于课程目标和学生情况，一键生成结构化教案' },
  { icon: <BulbOutlined />, title: '个性化学习建议', description: '根据学生档案和能力雷达图，提供针对性学习建议' },
  { icon: <CheckCircleOutlined />, title: '自动作业批改', description: '支持客观题自动评分，主观题辅助评估' },
  { icon: <ExperimentOutlined />, title: '学情分析报告', description: 'AI驱动的班级和学生个体学情趋势分析' },
];

const AIAssistant: React.FC = () => {
  return (
    <div className="ai-assistant-page">
      <div className="ai-assistant-header">
        <RobotOutlined className="ai-assistant-header-icon" />
        <div className="ai-assistant-header-body">
          <Space align="center" style={{ marginBottom: 8 }}>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              AI 智能助手
            </Title>
            <Tag color="warning">即将上线</Tag>
          </Space>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            AI功能正在研发中，上线后将为您提供智能化的教学辅助体验
          </Paragraph>
        </div>
      </div>

      <div className="section-heading">
        <RocketOutlined className="section-heading-icon" />
        <span className="section-heading-text">计划推出的功能</span>
      </div>

      <div className="ai-features-grid">
        {features.map((feature, index) => (
          <div key={index} className="ai-feature-card">
            <Space align="start" size="middle">
              <div className="ai-feature-icon">{feature.icon}</div>
              <div className="ai-feature-body">
                <Text strong className="ai-feature-title">{feature.title}</Text>
                <Text className="ai-feature-desc">{feature.description}</Text>
              </div>
            </Space>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIAssistant;

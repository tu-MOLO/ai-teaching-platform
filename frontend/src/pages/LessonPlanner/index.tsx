import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spin, message } from 'antd';
import { PlusOutlined, FileTextOutlined, CheckCircleOutlined, InboxOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getLessonPlans } from '../../services/lessonPlan';
import './index.css';

// 状态卡片配置
interface StatusCardConfig {
  key: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  icon: React.ReactNode;
  description: string;
  themeColor: string;
  bgColor: string;
}

const statusCards: StatusCardConfig[] = [
  {
    key: 'draft',
    title: '草稿箱',
    status: 'draft',
    icon: <FileTextOutlined />,
    description: '编辑中或待完善的教案',
    themeColor: '#d4a574',
    bgColor: 'rgba(212, 165, 116, 0.1)',
  },
  {
    key: 'published',
    title: '已完成',
    status: 'published',
    icon: <CheckCircleOutlined />,
    description: '已完善并投入使用的教案',
    themeColor: '#6b9b7a',
    bgColor: 'rgba(107, 155, 122, 0.1)',
  },
  {
    key: 'archived',
    title: '已归档',
    status: 'archived',
    icon: <InboxOutlined />,
    description: '历史教案归档存储',
    themeColor: '#8a8a8a',
    bgColor: 'rgba(138, 138, 138, 0.1)',
  },
];

const LessonPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({
    draft: 0,
    published: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(false);

  // 获取各状态教案数量
  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const [draftRes, publishedRes, archivedRes] = await Promise.all([
        getLessonPlans({ status: 'draft', page_size: 1 }),
        getLessonPlans({ status: 'published', page_size: 1 }),
        getLessonPlans({ status: 'archived', page_size: 1 }),
      ]);

      setCounts({
        draft: draftRes.total || 0,
        published: publishedRes.total || 0,
        archived: archivedRes.total || 0,
      });
    } catch (error) {
      message.error('获取教案统计数据失败');
      console.error('Failed to fetch lesson plan counts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // 处理卡片点击
  const handleCardClick = (status: string) => {
    navigate(`/lesson-planner/list/${status}`);
  };

  return (
    <div className="lesson-planner">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">教案中心</h1>
          <p className="page-subtitle">管理和分类查看您的教学教案</p>
        </div>
        <button
          className="btn-primary-custom"
          onClick={() => navigate('/lesson-planner/create')}
        >
          <PlusOutlined />
          新建教案
        </button>
      </div>

      {/* 状态入口卡片区域 */}
      <div className="status-cards-container">
        {loading ? (
          <div className="loading-wrapper">
            <Spin size="large" />
          </div>
        ) : (
          <div className="status-cards-grid">
            {statusCards.map((card) => (
              <div
                key={card.key}
                className="status-card"
                onClick={() => handleCardClick(card.status)}
                style={{ '--card-theme-color': card.themeColor } as React.CSSProperties}
              >
                {/* 图标区域 */}
                <div
                  className="status-card-icon-wrapper"
                  style={{
                    background: card.bgColor,
                    color: card.themeColor,
                  }}
                >
                  {card.icon}
                </div>

                {/* 内容区域 */}
                <div className="status-card-content">
                  <h3 className="status-card-title">{card.title}</h3>
                  <div className="status-card-count" style={{ color: card.themeColor }}>
                    {counts[card.status] || 0}
                  </div>
                  <p className="status-card-description">{card.description}</p>
                </div>

                {/* 操作按钮 */}
                <div className="status-card-action">
                  <span className="status-card-action-text">点击进入</span>
                  <ArrowRightOutlined className="status-card-action-icon" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快速提示区域 */}
      <Card className="tips-card">
        <div className="tips-content">
          <h4 className="tips-title">使用提示</h4>
          <ul className="tips-list">
            <li>草稿箱中的教案可随时编辑和完善</li>
            <li>已完成的教案表示已定稿并可投入使用</li>
            <li>已归档的教案将不再显示在常规列表中，但可随时恢复</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default LessonPlanner;

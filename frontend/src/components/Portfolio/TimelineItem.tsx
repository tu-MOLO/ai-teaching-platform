/**
 * TimelineItem 时间轴项目组件
 *
 * 用于展示学生档案时间轴中的单个记录项，支持作品、评价、观察记录、里程碑等多种类型。
 * 根据记录类型显示不同的图标、标签和评价维度进度条。
 *
 * @component
 * @example
 * ```tsx
 * import TimelineItem from './components/Portfolio/TimelineItem';
 * import type { PortfolioItem } from '@/types/portfolio';
 *
 * const record: PortfolioItem = {
 *   id: '1',
 *   student_id: 'student-123',
 *   type: 'evaluation',
 *   title: '期末评价',
 *   content: '学生在本次评价中表现良好',
 *   cognitive_score: 4,
 *   skill_score: 3.5,
 *   created_at: '2024-01-15T10:00:00Z'
 * };
 *
 * <TimelineItem item={record} onDelete={(id) => console.log('删除', id)} onEdit={(id) => console.log('编辑', id)} />
 * ```
 *
 * @interface TimelineItemProps
 * @property {PortfolioItem} item - 档案记录项数据
 * @property {function} onDelete - 删除回调函数
 * @property {function} onEdit - 编辑回调函数
 */

import React from 'react';
import { Card, Typography, Tag, Space, Progress, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePortfolioTypesStore } from '@/stores/portfolioTypes';
import type { PortfolioItem } from '@/types/portfolio';
import { fetchResourceFileBlob } from '@/services/resource';

const { Title, Text, Paragraph } = Typography;

/**
 * 时间轴项目组件Props接口
 */
export interface TimelineItemProps {
  /** 档案记录项数据 */
  item: PortfolioItem;
  /** 删除回调函数，传入记录ID */
  onDelete?: (id: string) => void;
  /** 编辑回调函数，传入记录ID */
  onEdit?: (id: string) => void;
}

/**
 * 时间轴项目组件
 *
 * 展示单个档案记录项的详细信息，根据类型显示不同的内容和样式
 *
 * @param props - 组件属性
 * @returns React组件
 */
const TimelineItem: React.FC<TimelineItemProps> = ({ item, onDelete, onEdit }) => {
  // 使用 store 获取类型的图标和名称
  const { getIconForType, getNameForType } = usePortfolioTypesStore();

  // 解析附件JSON字符串为数组
  const attachments: string[] = item.attachments ? JSON.parse(item.attachments) : [];

  // 评价维度配置
  const evaluationDimensions = [
    { key: 'cognitive_score', label: '认知理解', value: item.cognitive_score },
    { key: 'skill_score', label: '操作技能', value: item.skill_score },
    { key: 'creativity_score', label: '创意表达', value: item.creativity_score },
    { key: 'cooperation_score', label: '合作参与', value: item.cooperation_score },
    { key: 'attention_score', label: '注意力维持', value: item.attention_score },
  ];

  return (
    <Card className="timeline-item-card" size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 标题区域：图标 + 标题 + 类型标签 + 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space wrap>
            <Text strong style={{ fontSize: '18px' }}>{getIconForType(item.type)}</Text>
            <Title level={5} style={{ margin: 0 }}>{item.title}</Title>
            <Tag color="blue">{getNameForType(item.type)}</Tag>
          </Space>
          <Space size="small">
            {onEdit && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(item.id)}
              >
                编辑
              </Button>
            )}
            {onDelete && (
              <Popconfirm
                title="确认删除"
                description={`确定要删除这条"${getNameForType(item.type)}"记录吗？此操作不可恢复。`}
                onConfirm={() => onDelete(item.id)}
                okText="删除"
                okType="danger"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>

        {/* 内容描述 */}
        {item.content && <Paragraph style={{ marginBottom: 0 }}>{item.content}</Paragraph>}

        {/* 评价维度进度条（仅评价类型显示） */}
        {item.type === 'evaluation' && (
          <div className="evaluation-scores">
            <Text strong>评价维度:</Text>
            <div style={{ marginTop: 8 }}>
              {evaluationDimensions.map(({ key, label, value }) => (
                value !== undefined && value !== null && (
                  <Space key={key} style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{label}</Text>
                    <Progress
                      percent={value}
                      size="small"
                      showInfo={false}
                      status="active"
                      style={{ width: 120 }}
                    />
                  </Space>
                )
              ))}
            </div>
          </div>
        )}

        {/* 附件列表 */}
        {attachments.length > 0 && (
          <div className="attachments">
            <Text strong>附件:</Text>
            <div style={{ marginTop: 4 }}>
              {attachments.map((attachment: string, index: number) => (
                <Tag
                  key={`${attachment}-${index}`}
                  style={{ marginRight: 8, cursor: 'pointer' }}
                  onClick={async () => {
                    try {
                      const blob = await fetchResourceFileBlob(attachment);
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `附件_${index + 1}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    } catch {
                      // 下载失败，静默处理
                    }
                  }}
                >
                  附件 {index + 1}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 记录时间 */}
        <Text type="secondary" style={{ fontSize: '12px', marginTop: 8 }}>
          记录时间: {new Date(item.created_at).toLocaleString()}
        </Text>
      </Space>
    </Card>
  );
};

export default TimelineItem;

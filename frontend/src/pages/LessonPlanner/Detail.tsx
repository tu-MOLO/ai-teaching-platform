import React, { useState, useEffect } from 'react';
import { Card, Button, Descriptions, Tag, Space, Typography, message, Modal, Spin } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  InboxOutlined,
  UndoOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLessonPlan,
  deleteLessonPlan,
  publishLessonPlan,
  unpublishLessonPlan,
  archiveLessonPlan,
  restoreLessonPlan,
  type LessonPlan,
} from '../../services/lessonPlan';
import { refreshDashboardStats } from '../../stores/dashboard';
import './index.css';

const { Title } = Typography;



const LessonPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessonPlan = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getLessonPlan(id);
        setLessonPlan(data);
      } catch (error) {
        message.error('获取教案详情失败');
        console.error('Failed to fetch lesson plan:', error);
        navigate('/lesson-planner');
      } finally {
        setLoading(false);
      }
    };

    fetchLessonPlan();
  }, [id, navigate]);

  const handleDelete = () => {
    if (!id) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除教案 "${lessonPlan?.title}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteLessonPlan(id);
          message.success('删除成功');
          // 刷新仪表盘数据
          refreshDashboardStats();
          navigate('/lesson-planner');
        } catch (error) {
          message.error('删除失败');
          console.error('Failed to delete lesson plan:', error);
        }
      },
    });
  };

  const handlePublish = async () => {
    if (!id || !lessonPlan) return;
    try {
      await publishLessonPlan(id);
      message.success('教案已标记为完成');
      // 刷新数据
      const data = await getLessonPlan(id);
      setLessonPlan(data);
      // 刷新仪表盘数据
      refreshDashboardStats();
    } catch (error) {
      message.error('操作失败');
      console.error('Failed to publish lesson plan:', error);
    }
  };

  const handleUnpublish = async () => {
    if (!id || !lessonPlan) return;
    Modal.confirm({
      title: '确认取消完成',
      content: `确定要取消完成教案 "${lessonPlan.title}" 吗？取消后教案将变为草稿状态，可继续编辑。`,
      okText: '确认取消完成',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unpublishLessonPlan(id);
          message.success('教案已取消完成，回到草稿状态');
          // 刷新数据
          const data = await getLessonPlan(id);
          setLessonPlan(data);
          // 刷新仪表盘数据
          refreshDashboardStats();
        } catch (error) {
          message.error('操作失败');
          console.error('Failed to unpublish lesson plan:', error);
        }
      },
    });
  };

  const handleArchive = async () => {
    if (!id || !lessonPlan) return;
    Modal.confirm({
      title: '确认归档',
      content: `确定要归档教案 "${lessonPlan.title}" 吗？归档后教案将不再显示在列表中。`,
      okText: '确认归档',
      cancelText: '取消',
      onOk: async () => {
        try {
          await archiveLessonPlan(id);
          message.success('教案归档成功');
          // 刷新仪表盘数据
          refreshDashboardStats();
          // 返回列表页
          navigate('/lesson-planner');
        } catch (error) {
          message.error('归档失败');
          console.error('Failed to archive lesson plan:', error);
        }
      },
    });
  };

  const handleRestore = async () => {
    if (!id || !lessonPlan) return;
    Modal.confirm({
      title: '确认恢复',
      content: `确定要恢复教案 "${lessonPlan.title}" 吗？恢复后教案将变为草稿状态。`,
      okText: '确认恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          await restoreLessonPlan(id);
          message.success('教案恢复成功');
          // 刷新数据
          const data = await getLessonPlan(id);
          setLessonPlan(data);
          // 刷新仪表盘数据
          refreshDashboardStats();
        } catch (error) {
          message.error('恢复失败');
          console.error('Failed to restore lesson plan:', error);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="lesson-planner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!lessonPlan) {
    return (
      <div className="lesson-planner">
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileTextOutlined style={{ fontSize: 64, color: 'var(--color-text-tertiary)' }} />
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: 8 }}>教案不存在</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>该教案可能已被删除或不存在</div>
            </div>
            <Button
              type="primary"
              style={{ marginTop: 32 }}
              onClick={() => navigate('/lesson-planner')}
            >
              <ArrowLeftOutlined />
              返回教案列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="lesson-planner">
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/lesson-planner')}
            >
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>{lessonPlan.title}</Title>
          </Space>
        }
        extra={
          <Space>
            {/* 草稿状态按钮组 */}
            {lessonPlan?.status === 'draft' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handlePublish}
                  style={{ background: '#6b9b7a', borderColor: '#6b9b7a' }}
                >
                  标记完成
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/lesson-planner/${id}/edit`)}
                >
                  编辑
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  删除
                </Button>
              </>
            )}

            {/* 已完成状态按钮组 */}
            {lessonPlan?.status === 'published' && (
              <>
                <Button
                  icon={<CloseCircleOutlined />}
                  onClick={handleUnpublish}
                  style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
                >
                  取消完成
                </Button>
                <Button
                  icon={<InboxOutlined />}
                  onClick={handleArchive}
                  style={{ color: '#8c8c8c', borderColor: '#8c8c8c' }}
                >
                  归档
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/lesson-planner/${id}/edit`)}
                >
                  编辑
                </Button>
              </>
            )}

            {/* 已归档状态按钮组 */}
            {lessonPlan?.status === 'archived' && (
              <>
                <Button
                  type="primary"
                  icon={<UndoOutlined />}
                  onClick={handleRestore}
                  style={{ background: '#1890ff', borderColor: '#1890ff' }}
                >
                  恢复
                </Button>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/lesson-planner')}
                >
                  返回列表
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="学科">{lessonPlan.subject}</Descriptions.Item>
          <Descriptions.Item label="年级">{lessonPlan.grade}</Descriptions.Item>
          <Descriptions.Item label="时长">{lessonPlan.duration} 分钟</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag
              color={
                lessonPlan.status === 'published'
                  ? 'green'
                  : lessonPlan.status === 'archived'
                    ? 'gray'
                    : 'orange'
              }
            >
              {lessonPlan.status === 'published'
                ? '已完成'
                : lessonPlan.status === 'archived'
                  ? '已归档'
                  : '草稿'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(lessonPlan.created_at).toLocaleDateString()}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {lessonPlan.updated_at ? new Date(lessonPlan.updated_at).toLocaleDateString() : '-'}
          </Descriptions.Item>
        </Descriptions>

        {lessonPlan.teaching_objectives && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>教学目标</Title>
            <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {lessonPlan.teaching_objectives}
            </div>
          </div>
        )}

        {lessonPlan.teaching_content && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>教学内容</Title>
            <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {lessonPlan.teaching_content}
            </div>
          </div>
        )}

        {lessonPlan.teaching_methods && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>教学方法</Title>
            <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {lessonPlan.teaching_methods}
            </div>
          </div>
        )}

        {lessonPlan.teaching_process && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>教学过程</Title>
            <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {lessonPlan.teaching_process}
            </div>
          </div>
        )}

        {lessonPlan.teaching_resources && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>教学资源</Title>
            <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {lessonPlan.teaching_resources}
            </div>
          </div>
        )}

        {lessonPlan.notes && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>备注</Title>
            <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {lessonPlan.notes}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LessonPlanDetail;

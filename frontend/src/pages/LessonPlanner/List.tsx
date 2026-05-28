import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '../../constants/pagination';
import { Card, Button, Table, Space, Tag, message, Input, Empty, Modal } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  ArrowLeftOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  RollbackOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getLessonPlans, 
  deleteLessonPlan, 
  publishLessonPlan, 
  unpublishLessonPlan,
  archiveLessonPlan,
  restoreLessonPlan,
  type LessonPlan 
} from '../../services/lessonPlan';
import { refreshDashboardStats } from '../../stores/dashboard';
import './index.css';

const { Search } = Input;

// 状态配置
const statusConfig: Record<string, { title: string; color: string; label: string }> = {
  draft: { title: '草稿箱', color: '#d4a574', label: '草稿' },
  published: { title: '已完成', color: '#6b9b7a', label: '已完成' },
  archived: { title: '已归档', color: '#8a8a8a', label: '已归档' },
};

const LessonPlanList: React.FC = () => {
  const navigate = useNavigate();
  const { status = 'draft' } = useParams<{ status: string }>();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [pagination, setPagination] = useState({ current: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });

  const currentStatus = statusConfig[status] || statusConfig.draft;

  // 获取教案列表
  const fetchLessonPlans = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await getLessonPlans({
        status,
        search: searchText || undefined,
        page,
        page_size: pagination.pageSize,
      });
      setLessonPlans(response.data || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: response.total || 0,
      }));
    } catch (error) {
      message.error('获取教案列表失败');
      console.error('Failed to fetch lesson plans:', error);
    } finally {
      setLoading(false);
    }
  }, [status, searchText, pagination.pageSize]);

  useEffect(() => {
    fetchLessonPlans(1);
  }, [fetchLessonPlans]);

  // 处理删除
  const handleDelete = (id: string, title: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除教案 "${title}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteLessonPlan(id);
          message.success('删除成功');
          fetchLessonPlans(pagination.current);
          refreshDashboardStats();
        } catch (error) {
          message.error('删除失败');
          console.error('Failed to delete lesson plan:', error);
        }
      },
    });
  };

  // 处理标记完成
  const handlePublish = async (id: string, title: string) => {
    Modal.confirm({
      title: '确认完成',
      content: `确定要完成教案 "${title}" 吗？完成后将标记为已定稿状态。`,
      okText: '确认完成',
      cancelText: '取消',
      onOk: async () => {
        try {
          await publishLessonPlan(id);
          message.success(`教案 "${title}" 标记为完成`);
          fetchLessonPlans(pagination.current);
          refreshDashboardStats();
        } catch (error) {
          message.error('操作失败');
          console.error('Failed to publish lesson plan:', error);
        }
      },
    });
  };

  // 处理取消完成
  const handleUnpublish = (id: string, title: string) => {
    Modal.confirm({
      title: '确认取消完成',
      content: `确定要取消完成教案 "${title}" 吗？取消后将回到草稿箱继续编辑。`,
      okText: '确认取消',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unpublishLessonPlan(id);
          message.success(`教案 "${title}" 已取消完成`);
          fetchLessonPlans(pagination.current);
          refreshDashboardStats();
        } catch (error) {
          message.error('操作失败');
          console.error('Failed to unpublish lesson plan:', error);
        }
      },
    });
  };

  // 处理归档
  const handleArchive = (id: string, title: string) => {
    Modal.confirm({
      title: '确认归档',
      content: `确定要归档教案 "${title}" 吗？归档后可以在已归档列表中查看。`,
      okText: '确认归档',
      cancelText: '取消',
      onOk: async () => {
        try {
          await archiveLessonPlan(id);
          message.success(`教案 "${title}" 已归档`);
          fetchLessonPlans(pagination.current);
          refreshDashboardStats();
        } catch (error) {
          message.error('归档失败');
          console.error('Failed to archive lesson plan:', error);
        }
      },
    });
  };

  // 处理恢复
  const handleRestore = (id: string, title: string) => {
    Modal.confirm({
      title: '确认恢复',
      content: `确定要恢复教案 "${title}" 吗？恢复后将回到草稿箱。`,
      okText: '确认恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          await restoreLessonPlan(id);
          message.success(`教案 "${title}" 已恢复`);
          fetchLessonPlans(pagination.current);
          refreshDashboardStats();
        } catch (error) {
          message.error('恢复失败');
          console.error('Failed to restore lesson plan:', error);
        }
      },
    });
  };

  const handlePageChange = (page: number) => {
    fetchLessonPlans(page);
  };

  // 渲染草稿箱操作按钮
  const renderDraftActions = (plan: LessonPlan, inCard = false) => {
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    
    return (
      <>
        <button
          className="action-btn action-btn-view"
          onClick={(e) => {
            inCard && stopPropagation(e);
            navigate(`/lesson-planner/${plan.id}`);
          }}
        >
          <EyeOutlined /> 查看
        </button>
        <button
          className="action-btn action-btn-edit"
          onClick={(e) => {
            inCard && stopPropagation(e);
            navigate(`/lesson-planner/${plan.id}/edit`);
          }}
        >
          <EditOutlined /> 编辑
        </button>
        <button
          className="action-btn action-btn-publish"
          onClick={(e) => {
            inCard && stopPropagation(e);
            handlePublish(plan.id, plan.title);
          }}
        >
          <CheckCircleOutlined /> 标记完成
        </button>
        <button
          className="action-btn action-btn-delete"
          onClick={(e) => {
            inCard && stopPropagation(e);
            handleDelete(plan.id, plan.title);
          }}
        >
          <DeleteOutlined /> 删除
        </button>
      </>
    );
  };

  // 渲染已完成操作按钮
  const renderPublishedActions = (plan: LessonPlan, inCard = false) => {
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    
    return (
      <>
        <button
          className="action-btn action-btn-view"
          onClick={(e) => {
            inCard && stopPropagation(e);
            navigate(`/lesson-planner/${plan.id}`);
          }}
        >
          <EyeOutlined /> 查看
        </button>
        <button
          className="action-btn action-btn-edit"
          onClick={(e) => {
            inCard && stopPropagation(e);
            handleUnpublish(plan.id, plan.title);
          }}
        >
          <CloseCircleOutlined /> 取消完成
        </button>
        <button
          className="action-btn action-btn-delete"
          onClick={(e) => {
            inCard && stopPropagation(e);
            handleArchive(plan.id, plan.title);
          }}
        >
          <InboxOutlined /> 归档
        </button>
      </>
    );
  };

  // 渲染已归档操作按钮
  const renderArchivedActions = (plan: LessonPlan, inCard = false) => {
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    
    return (
      <>
        <button
          className="action-btn action-btn-view"
          onClick={(e) => {
            inCard && stopPropagation(e);
            navigate(`/lesson-planner/${plan.id}`);
          }}
        >
          <EyeOutlined /> 查看
        </button>
        <button
          className="action-btn action-btn-publish"
          onClick={(e) => {
            inCard && stopPropagation(e);
            handleRestore(plan.id, plan.title);
          }}
        >
          <RollbackOutlined /> 恢复
        </button>
      </>
    );
  };

  // 根据状态获取操作按钮
  const renderActionsByStatus = (plan: LessonPlan, inCard = false) => {
    switch (status) {
      case 'draft':
        return renderDraftActions(plan, inCard);
      case 'published':
        return renderPublishedActions(plan, inCard);
      case 'archived':
        return renderArchivedActions(plan, inCard);
      default:
        return renderDraftActions(plan, inCard);
    }
  };

  // 卡片视图
  const renderCardView = () => (
    <div className="lesson-grid">
      {lessonPlans.map(plan => (
        <div key={plan.id} className="lesson-card" onClick={() => navigate(`/lesson-planner/${plan.id}`)}>
          <div className="lesson-card-header">
            <div className="lesson-card-subject">{plan.subject}</div>
            <h3 className="lesson-card-title">{plan.title}</h3>
          </div>
          <div className="lesson-card-body">
            <div className="lesson-card-meta">
              <div className="lesson-card-meta-item">
                <UserOutlined />
                <span>{plan.grade}</span>
              </div>
              <div className="lesson-card-meta-item">
                <ClockCircleOutlined />
                <span>{plan.duration} 分钟</span>
              </div>
            </div>
            <div className="lesson-card-footer">
              <div className={`lesson-card-status ${plan.status}`}>
                <span className="status-dot"></span>
                <span>{statusConfig[plan.status]?.label || plan.status}</span>
              </div>
              <div className="lesson-card-actions">
                {renderActionsByStatus(plan, true)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 表格视图
  const columns = [
    {
      title: '教案标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{text}</div>
      ),
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string) => (
        <Tag style={{
          background: 'rgba(84, 140, 168, 0.1)',
          color: 'var(--color-primary)',
          border: 'none',
          borderRadius: '4px'
        }}>
          {text}
        </Tag>
      ),
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration} 分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <div className={`lesson-card-status ${s}`}>
          <span className="status-dot"></span>
          <span>{statusConfig[s]?.label || s}</span>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LessonPlan) => (
        <Space size="small">
          {renderActionsByStatus(record)}
        </Space>
      ),
    },
  ];

  return (
    <div className="lesson-planner">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="page-title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>
            <button
              className="action-btn action-btn-view"
              onClick={() => navigate('/lesson-planner')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeftOutlined /> 返回
            </button>
            <h1 className="page-title" style={{ margin: 0 }}>{currentStatus.title}</h1>
          </div>
          <p className="page-subtitle">{`查看和管理${currentStatus.title}中的教案`}</p>
        </div>
        <button
          className="btn-primary-custom"
          onClick={() => navigate('/lesson-planner/create')}
        >
          <PlusOutlined />
          新建教案
        </button>
      </div>

      {/* 主内容区 */}
      <Card className="planner-card">
        {/* 工具栏 */}
        <div className="toolbar">
          <div className="toolbar-left">
            <Search
              placeholder="搜索教案标题或学科..."
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => fetchLessonPlans(1)}
              className="search-input"
            />
          </div>
          <div className="toolbar-right">
            <Space>
              <Button
                type={viewMode === 'table' ? 'primary' : 'default'}
                onClick={() => setViewMode('table')}
              >
                列表
              </Button>
              <Button
                type={viewMode === 'card' ? 'primary' : 'default'}
                onClick={() => setViewMode('card')}
              >
                卡片
              </Button>
            </Space>
          </div>
        </div>

        {/* 内容区域 */}
        {lessonPlans.length > 0 ? (
          viewMode === 'card' ? (
            renderCardView()
          ) : (
            <Table
              columns={columns}
              dataSource={lessonPlans}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条记录`,
                onChange: handlePageChange,
              }}
              className="planner-table"
            />
          )
        ) : (
          <Empty
            image={<FileTextOutlined style={{ fontSize: 64, color: 'var(--color-text-tertiary)' }} />}
            description={
              <div className="empty-state">
                <div className="empty-state-title">暂无{currentStatus.title}教案</div>
                <div className="empty-state-desc">
                  {status === 'draft' && '点击上方按钮创建您的第一个教案'}
                  {status === 'published' && '草稿箱中的教案可以标记为完成'}
                  {status === 'archived' && '已完成的教案可以归档到这里'}
                </div>
              </div>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default LessonPlanList;

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Divider, Empty, Progress, Space, Spin, Table, Tag } from 'antd';
import { message, modal } from '@/utils/feedback';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  LockOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  backIEPToDraft,
  deleteIEP,
  generateGrowthReport,
  getIEP,
  getIEPCompare,
  lockIEP,
  reviseIEP,
  submitIEP,
  type GrowthReportAI,
  type IEP,
  type IEPCompare,
} from '../../services/iep';
import { exportIEP } from '../../services/iepExport';
import IEPCompareRadar from './IEPCompareRadar';
import ReportModal from './ReportModal';
import './index.css';

const levelText = ['不能完成', '大量辅助', '少量辅助', '独立完成'];
const goalStatusMeta: Record<string, { label: string; color: string }> = {
  not_started: { label: '未开始', color: 'default' },
  in_progress: { label: '进行中', color: 'processing' },
  achieved: { label: '已达成', color: 'success' },
  maintain: { label: '维持', color: 'gold' },
};

const renderLevel = (level: number | null | undefined) =>
  level === null || level === undefined ? (
    <span style={{ color: '#aaa' }}>未评估</span>
  ) : (
    <Tag>{`${level} ${levelText[level]}`}</Tag>
  );

const IEPDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [iep, setIep] = useState<IEP | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<GrowthReportAI | null>(null);
  const [compare, setCompare] = useState<IEPCompare | null>(null);

  const fetchIEP = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setIep(await getIEP(id));
    } catch (error) {
      message.error('加载 IEP 失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchIEP();
  }, [fetchIEP]);

  // 修订版本：沿 parent 链加载上一版本做期初/期末对比
  useEffect(() => {
    let active = true;
    if (iep?.parent_id) {
      getIEPCompare(iep.id)
        .then((data) => {
          if (active) setCompare(data);
        })
        .catch(() => {
          if (active) setCompare(null);
        });
    } else {
      setCompare(null);
    }
    return () => {
      active = false;
    };
  }, [iep?.id, iep?.parent_id]);

  const handleDelete = () => {
    modal.confirm({
      title: '确认删除',
      content: '确定删除这份 IEP 吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteIEP(id!);
        message.success('已删除');
        navigate('/iep');
      },
    });
  };

  const handleRevise = async () => {
    const revised = await reviseIEP(id!);
    message.success('已创建新一轮草稿');
    navigate(`/iep/${revised.id}/edit`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportIEP(id!, iep?.student_name || iep?.term || 'iep');
      message.success('PDF 已导出');
    } catch (error) {
      message.error('导出失败');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      setReport(await generateGrowthReport(id!));
      setReportOpen(true);
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          '成长报告生成失败'
      );
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!iep) {
    return <Empty description="未找到该 IEP" />;
  }

  // 目标达成统计（口径：达成率 = 已达成短期目标 / 全部短期目标；未开始计入分母）
  const allShortGoals = iep.long_term_goals.flatMap((g) => g.short_term_goals);
  const goalCounts: Record<string, number> = {
    total: allShortGoals.length,
    achieved: 0,
    in_progress: 0,
    not_started: 0,
    maintain: 0,
  };
  allShortGoals.forEach((s) => {
    goalCounts[s.status] = (goalCounts[s.status] || 0) + 1;
  });
  const achievementRate =
    goalCounts.total > 0
      ? Math.round((goalCounts.achieved / goalCounts.total) * 100)
      : 0;

  return (
    <div className="iep-page">
      <div className="iep-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/iep')}>
            返回列表
          </Button>
          <h1 className="iep-title" style={{ margin: 0 }}>
            {iep.student_name || '学生'} · {iep.term}
          </h1>
          <Tag>v{iep.revision_no}</Tag>
          <Tag
            color={
              iep.status === 'draft'
                ? '#d4a574'
                : iep.status === 'review'
                ? '#548ca8'
                : '#6b9b7a'
            }
          >
            {iep.status === 'draft'
              ? '草稿'
              : iep.status === 'review'
              ? '待审定'
              : '已定稿'}
          </Tag>
        </Space>

        <Space wrap>
          {iep.status === 'draft' && (
            <>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/iep/${iep.id}/edit`)}
              >
                编辑
              </Button>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={async () => {
                  await submitIEP(iep.id);
                  message.success('已提交审定');
                  fetchIEP();
                }}
              >
                提交审定
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                删除
              </Button>
            </>
          )}
          {iep.status === 'review' && (
            <>
              <Button
                icon={<RollbackOutlined />}
                onClick={async () => {
                  await backIEPToDraft(iep.id);
                  message.success('已退回草稿');
                  fetchIEP();
                }}
              >
                退回草稿
              </Button>
              <Button
                type="primary"
                icon={<LockOutlined />}
                onClick={async () => {
                  await lockIEP(iep.id);
                  message.success('已定稿');
                  fetchIEP();
                }}
              >
                定稿
              </Button>
              <Button
                icon={<FileTextOutlined />}
                loading={reportLoading}
                onClick={handleGenerateReport}
              >
                AI 成长报告
              </Button>
            </>
          )}
          {iep.status === 'locked' && (
            <>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={handleRevise}
              >
                修订（新一轮）
              </Button>
              <Button
                icon={<DownloadOutlined />}
                loading={exporting}
                onClick={handleExport}
              >
                导出 PDF
              </Button>
              <Button
                icon={<FileTextOutlined />}
                loading={reportLoading}
                onClick={handleGenerateReport}
              >
                AI 成长报告
              </Button>
            </>
          )}
        </Space>
      </div>

      <Card className="iep-detail-section">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="学生基本情况" span={2}>
            {iep.student_profile || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="评价方式" span={2}>
            {iep.evaluation_plan || '—'}
          </Descriptions.Item>
          {iep.status === 'locked' && (
            <Descriptions.Item label="审定时间" span={2}>
              {iep.reviewed_at
                ? new Date(iep.reviewed_at).toLocaleString()
                : '—'}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card className="iep-detail-section" title="目标达成情况">
        {goalCounts.total === 0 ? (
          <Empty description="暂无短期目标" />
        ) : (
          <>
            <Progress
              percent={achievementRate}
              status={achievementRate === 100 ? 'success' : 'active'}
              style={{ marginBottom: 12 }}
            />
            <Space wrap>
              <Tag color="success">已达成 {goalCounts.achieved}</Tag>
              <Tag color="processing">进行中 {goalCounts.in_progress}</Tag>
              <Tag>未开始 {goalCounts.not_started}</Tag>
              <Tag color="gold">维持 {goalCounts.maintain}</Tag>
            </Space>
            <p style={{ color: '#999', margin: '8px 0 0' }}>
              口径：达成率 = 已达成短期目标数 / 全部短期目标数；未开始目标计入分母。
            </p>
          </>
        )}
      </Card>

      <Card className="iep-detail-section" title="发展领域评估">
        {iep.domain_assessments.length === 0 && <Empty description="暂无评估" />}
        {iep.domain_assessments.map((d, di) => (
          <div key={di} style={{ marginBottom: 20 }}>
            <Space style={{ marginBottom: 8 }}>
              <strong>{d.domain_name}</strong>
              <span style={{ color: '#888' }}>领域整体：</span>
              {renderLevel(d.overall_level)}
            </Space>
            <Table
              size="small"
              rowKey={(r) => r.item_name}
              pagination={false}
              dataSource={d.items}
              columns={[
                { title: '观察条目', dataIndex: 'item_name' },
                {
                  title: '水平',
                  dataIndex: 'level',
                  width: 160,
                  render: (v: number | null) => renderLevel(v),
                },
                {
                  title: '备注',
                  dataIndex: 'note',
                  render: (v: string | null) => v || '—',
                },
              ]}
            />
            {d.summary && (
              <p style={{ color: '#666', marginTop: 6 }}>小结：{d.summary}</p>
            )}
          </div>
        ))}
      </Card>

      {compare && compare.previous_term && (
        <IEPCompareRadar compare={compare} />
      )}

      <Card className="iep-detail-section" title="长短期目标">
        {iep.long_term_goals.length === 0 && <Empty description="暂无目标" />}
        {iep.long_term_goals.map((g, gi) => (
          <div key={gi} className="iep-goal-block">
            <Space style={{ marginBottom: 8 }}>
              <Tag color="#548ca8">{g.domain_name || '未分领域'}</Tag>
              <strong>长期目标：</strong>
              <span>{g.goal}</span>
            </Space>
            <Table
              size="small"
              rowKey={(r, i) => `${r.behavior}-${i}`}
              pagination={false}
              dataSource={g.short_term_goals}
              columns={[
                { title: '条件', dataIndex: 'condition', render: (v) => v || '—' },
                { title: '行为', dataIndex: 'behavior' },
                { title: '标准', dataIndex: 'criterion', render: (v) => v || '—' },
                {
                  title: '支持级别',
                  dataIndex: 'support_level',
                  width: 150,
                  render: (v: number | null) => renderLevel(v),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (s: string) => (
                    <Tag color={goalStatusMeta[s]?.color}>
                      {goalStatusMeta[s]?.label || s}
                    </Tag>
                  ),
                },
                {
                  title: '教学方法',
                  dataIndex: 'teaching_methods',
                  render: (v: string[] | null) =>
                    v && v.length ? v.join('、') : '—',
                },
              ]}
            />
          </div>
        ))}
      </Card>

      <Card title="支持措施">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="教学支持">
            {iep.supports?.teaching?.join('；') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="康复支持">
            {iep.supports?.rehab?.join('；') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="家庭支持">
            {iep.supports?.family?.join('；') || '—'}
          </Descriptions.Item>
        </Descriptions>
        <Divider />
      </Card>

      <ReportModal
        open={reportOpen}
        report={report}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
};

export default IEPDetailPage;

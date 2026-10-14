import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tabs, Tag } from 'antd';
import { message, modal } from '@/utils/feedback';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/Common/EmptyState';
import {
  deleteIEP,
  listIEPs,
  reviseIEP,
  type IEPSummary,
  type IEPStatusValue,
} from '../../services/iep';
import { studentService } from '../../services/student';
import type { Student } from '../../services/student';
import './index.css';

const statusMeta: Record<
  IEPStatusValue,
  { label: string; color: string }
> = {
  draft: { label: '草稿', color: '#d4a574' },
  review: { label: '待审定', color: '#548ca8' },
  locked: { label: '已定稿', color: '#6b9b7a' },
};

const IEPListPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<IEPSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [statusTab, setStatusTab] = useState<IEPStatusValue | 'all'>('all');
  const [studentFilter, setStudentFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchData = useCallback(
    async (page = 1, pageSize = pagination.pageSize) => {
      setLoading(true);
      try {
        const resp = await listIEPs({
          page,
          page_size: pageSize,
          status: statusTab === 'all' ? undefined : statusTab,
          student_id: studentFilter,
          search: search || undefined,
        });
        setData(resp.data || []);
        setPagination((prev) => ({
          ...prev,
          current: page,
          pageSize,
          total: resp.total,
        }));
      } catch (error) {
        message.error('获取 IEP 列表失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [statusTab, studentFilter, search, pagination.pageSize]
  );

  useEffect(() => {
    studentService
      .getStudents({ page_size: 100 })
      .then((resp) => setStudents(resp.data || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab, studentFilter]);

  const handleDelete = (record: IEPSummary) => {
    modal.confirm({
      title: '确认删除',
      content: `确定删除 ${record.student_name || '该学生'} 的这份 IEP 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteIEP(record.id);
          message.success('已删除');
          fetchData(pagination.current);
        } catch (error) {
          message.error('删除失败');
          console.error(error);
        }
      },
    });
  };

  const handleRevise = async (record: IEPSummary) => {
    try {
      const revised = await reviseIEP(record.id);
      message.success('已基于定稿创建新一轮草稿');
      navigate(`/iep/${revised.id}/edit`);
    } catch (error) {
      message.error('创建修订版本失败');
      console.error(error);
    }
  };

  const columns = [
    {
      title: '学生',
      dataIndex: 'student_name',
      key: 'student_name',
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text || '—'}</span>
      ),
    },
    { title: '学期', dataIndex: 'term', key: 'term' },
    {
      title: '版本',
      dataIndex: 'revision_no',
      key: 'revision_no',
      width: 80,
      render: (n: number) => <Tag>v{n}</Tag>,
    },
    {
      title: '长期目标',
      dataIndex: 'long_term_goal_count',
      key: 'long_term_goal_count',
      width: 90,
      align: 'center' as const,
    },
    {
      title: '短期目标',
      dataIndex: 'short_term_goal_count',
      key: 'short_term_goal_count',
      width: 90,
      align: 'center' as const,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: IEPStatusValue) => (
        <Tag color={statusMeta[s].color} style={{ borderRadius: 4 }}>
          {statusMeta[s].label}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (t: string) =>
        t ? new Date(t).toLocaleDateString() : '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: IEPSummary) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/iep/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/iep/${record.id}/edit`)}
            >
              编辑
            </Button>
          )}
          {record.status === 'locked' && (
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleRevise(record)}
            >
              修订
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="iep-page">
      <div className="iep-header">
        <div>
          <h1 className="iep-title">个别化教育计划（IEP）</h1>
          <p className="iep-subtitle">
            一人一案：发展评估 → 长短目标 → 教师审定，AI 仅起草、教师定稿
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/iep/create')}
        >
          新建 IEP
        </Button>
      </div>

      <Card>
        <Space className="iep-filters" wrap>
          <Select
            allowClear
            showSearch
            placeholder="按学生筛选"
            style={{ width: 200 }}
            optionFilterProp="label"
            value={studentFilter}
            onChange={(v) => setStudentFilter(v)}
            options={students.map((s) => ({
              label: `${s.name}（${s.grade || ''}）`,
              value: s.id,
            }))}
          />
          <Input.Search
            allowClear
            placeholder="搜索学期"
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => fetchData(1)}
          />
        </Space>

        <Tabs
          activeKey={statusTab}
          onChange={(k) => setStatusTab(k as IEPStatusValue | 'all')}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'review', label: '待审定' },
            { key: 'locked', label: '已定稿' },
          ]}
        />

        {data.length > 0 ? (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            onChange={(p) =>
              fetchData(p.current || 1, p.pageSize || pagination.pageSize)
            }
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        ) : (
          <EmptyState
            icon={<FileProtectOutlined />}
            title="暂无 IEP"
            description="点击右上角「新建 IEP」开始为学生制定一人一案"
          />
        )}
      </Card>
    </div>
  );
};

export default IEPListPage;

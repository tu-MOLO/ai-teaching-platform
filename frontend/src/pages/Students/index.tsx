import React, { useState, useEffect } from 'react';
import { DEFAULT_PAGE_SIZE } from '../../constants/pagination';
import { Button, Table, Space, Tag, message, Input, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student';
import { refreshDashboardStats } from '../../stores/dashboard';
import ConfigurableSelect from '../../components/Common/ConfigurableSelect';

const { Search } = Input;
interface Student {
  id: string;
  name: string;
  gender: string;
  grade: string;
  class_name: string;
  status: 'active' | 'inactive';
}

const formatGender = (gender: string): string => {
  const map: Record<string, string> = { male: '男', female: '女', other: '其他' };
  return map[gender] || gender;
};

const Students: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });

  const fetchStudents = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const response = await studentService.getStudents({
        page,
        page_size: pageSize,
        keyword: searchText || undefined,
        grade: gradeFilter || undefined,
      });
      const items = response.data || [];
      const formattedStudents: Student[] = items.map((item: any) => ({
        id: item.id, name: item.name, gender: item.gender,
        grade: item.grade, class_name: item.class_name,
        status: (item.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
      }));
      setStudents(formattedStudents);
      setPagination({
        current: response.page || page,
        pageSize: response.page_size || pageSize,
        total: response.total || 0,
      });
    } catch (error) {
      message.error('获取学生列表失败');
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(1); }, [searchText, gradeFilter]);

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除学生 "${name}" 吗？此操作不可恢复。`,
      okText: '确认删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await studentService.deleteStudent(id);
          message.success('删除成功');
          fetchStudents(pagination.current, pagination.pageSize);
          refreshDashboardStats();
        } catch (error) {
          message.error('删除失败，请重试');
          console.error('Delete student error:', error);
        }
      },
    });
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '性别', dataIndex: 'gender', key: 'gender', render: (gender: string) => formatGender(gender) },
    { title: '年级', dataIndex: 'grade', key: 'grade' },
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => (
      <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '在读' : '已停用'}</Tag>
    )},
    { title: '操作', key: 'action', render: (_: any, record: Student) => (
      <Space size="middle">
        <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/students/${record.id}/edit`)}>编辑</Button>
        <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id, record.name)}>删除</Button>
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            <TeamOutlined className="page-title-icon" />
            学生管理
          </h1>
          <p className="page-description">管理学生信息，查看和编辑学生资料</p>
        </div>
        <div className="page-header-right">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/students/create')}>
            添加学生
          </Button>
        </div>
      </div>

      <div className="table-section">
        <div className="table-section-toolbar">
          <div className="table-section-toolbar-left">
            <Search
              placeholder="搜索学生姓名..."
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <ConfigurableSelect
              groupKey="student_grade"
              placeholder="选择年级"
              value={gradeFilter || undefined}
              onChange={(value) => setGradeFilter((value as string) || '')}
              allowClear
              style={{ width: 200 }}
            />
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: false,
            onChange: (page, pageSize) => fetchStudents(page, pageSize),
          }}
        />
      </div>
    </div>
  );
};

export default Students;

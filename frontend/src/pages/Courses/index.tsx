import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, Tag, message, Typography, Input, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCourses, deleteCourse } from '../../services/course';
import { refreshDashboardStats } from '../../stores/dashboard';

const { Title } = Typography;
const { Search } = Input;

interface Course {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  schedule: string;
  status: 'active' | 'inactive';
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await getCourses();
      setCourses(response.data || []);
    } catch (error) {
      message.error('获取课程列表失败');
      console.error('Fetch courses error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除课程 "${name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteCourse(id);
          message.success('删除成功');
          fetchCourses();
          // 刷新仪表盘数据
          refreshDashboardStats();
        } catch (error) {
          message.error('删除失败，请重试');
          console.error('Delete course error:', error);
        }
      },
    });
  };

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '任课教师',
      dataIndex: 'teacher',
      key: 'teacher',
    },
    {
      title: '上课时间',
      dataIndex: 'schedule',
      key: 'schedule',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '进行中' : '已结束'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Course) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/courses/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => handleDelete(record.id, record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const filteredData = courses.filter(course =>
    course.name.toLowerCase().includes(searchText.toLowerCase()) ||
    course.teacher.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <Title level={4}>课程管理</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/courses/create')}
            >
              新建课程
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索课程名称或教师..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default Courses;

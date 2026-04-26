import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, Tag, message, Typography, Input, Select, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student';
import { refreshDashboardStats } from '../../stores/dashboard';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

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

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getStudents();
      const items = response.data || [];
      // 将后端数据格式转换为前端需要的格式
      const formattedStudents: Student[] = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender,
        grade: item.grade,
        class_name: item.class_name,
        status: (item.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
      }));
      setStudents(formattedStudents);
    } catch (error) {
      message.error('获取学生列表失败');
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除学生 "${name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await studentService.deleteStudent(id);
          message.success('删除成功');
          fetchStudents(); // 刷新列表
          // 刷新仪表盘数据
          refreshDashboardStats();
        } catch (error) {
          message.error('删除失败，请重试');
          console.error('Delete student error:', error);
        }
      },
    });
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => formatGender(gender),
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '班级',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '在读' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Student) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => navigate(`/students/${record.id}/edit`)}
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

  const filteredData = students.filter(student =>
    (student.name.toLowerCase().includes(searchText.toLowerCase()) ||
    student.class_name.toLowerCase().includes(searchText.toLowerCase())) &&
    (gradeFilter === '' || student.grade === gradeFilter)
  );

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <Title level={4}>学生管理</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/students/create')}
            >
              添加学生
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索学生姓名..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300, marginRight: 16 }}
          />
          <Select
            placeholder="选择年级"
            value={gradeFilter || undefined}
            onChange={(value) => setGradeFilter(value)}
            style={{ width: 200 }}
          >
            <Option value="">全部年级</Option>
            <Option value="培智一年级">培智一年级</Option>
            <Option value="培智二年级">培智二年级</Option>
            <Option value="培智三年级">培智三年级</Option>
          </Select>
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

export default Students;

import React, { useState, useEffect } from 'react';
import { DEFAULT_PAGE_SIZE } from '../../constants/pagination';
import { Card, Input, Table, Space, message, Empty, Modal } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student';
import ConfigurableSelect from '../../components/Common/ConfigurableSelect';
import type { Student } from '../../types/student';
import './index.css';

// 扩展Student类型用于页面展示
interface StudentDisplay extends Student {
  age?: number;
  progress?: number;
}

/**
 * 转换性别显示
 * 将 'male'/'female' 转换为 '男'/'女'
 */
const formatGender = (gender: string): string => {
  const genderMap: Record<string, string> = {
    'male': '男',
    'female': '女',
    '男': '男',
    '女': '女',
  };
  return genderMap[gender] || gender;
};

/**
 * 根据出生日期计算年龄
 */
const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * 格式化日期显示
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
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
      const studentList = response.data || [];
      const processedStudents = studentList.map((student: Student) => {
        const displayStudent: StudentDisplay = { ...student };
        displayStudent.gender = formatGender(student.gender);
        if (!displayStudent.age && student.birth_date) {
          displayStudent.age = calculateAge(student.birth_date);
        }
        return displayStudent;
      });
      setStudents(processedStudents);
      setPagination({
        current: response.page || page,
        pageSize: response.page_size || pageSize,
        total: response.total || 0,
      });
    } catch (error) {
      message.error('获取学生档案失败');
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [searchText, gradeFilter]);

  const handleDelete = async (id: string, name: string) => {
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
          fetchStudents(pagination.current, pagination.pageSize);
        } catch (error) {
          message.error('删除学生失败');
          console.error('Delete student error:', error);
        }
      },
    });
  };

  const filteredStudents = students.filter(student => student.is_active !== false);

  // 卡片视图
  const renderCardView = () => (
    <div className="student-grid">
      {filteredStudents.map(student => (
        <div key={student.id} className="student-card" onClick={() => navigate(`/portfolio/${student.id}`)}>
          <div className="student-card-header">
            <div className="student-avatar">
              <UserOutlined />
            </div>
            <div className="student-info">
              <h3 className="student-name">{student.name}</h3>
              <p className="student-class">{student.class_name}</p>
            </div>
            <div className={`student-status ${student.is_active ? 'active' : 'inactive'}`}>
              {student.is_active ? '在读' : '已停用'}
            </div>
          </div>
          <div className="student-card-body">
            <div className="student-meta">
              <div className="student-meta-item">
                <span className="student-meta-label">性别</span>
                <span className="student-meta-value">{student.gender}</span>
              </div>
              <div className="student-meta-item">
                <span className="student-meta-label">年龄</span>
                <span className="student-meta-value">{student.age} 岁</span>
              </div>
              <div className="student-meta-item">
                <span className="student-meta-label">年级</span>
                <span className="student-meta-value">{student.grade}</span>
              </div>
              <div className="student-meta-item">
                <span className="student-meta-label">入学日期</span>
                <span className="student-meta-value">{formatDate(student.enrollment_date)}</span>
              </div>
            </div>
            <div className="student-progress">
              <div className="progress-header">
                <span className="progress-label">学习进度</span>
                <span className="progress-value">{student.progress ?? 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${student.progress ?? 0}%` }}></div>
              </div>
            </div>
          </div>
          <div className="student-card-footer">
            <button 
              className="action-btn action-btn-view"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/portfolio/${student.id}`);
              }}
            >
              <EyeOutlined /> 查看档案
            </button>
            <button 
              className="action-btn action-btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/students/${student.id}/edit?returnTo=/portfolio`);
              }}
            >
              <EditOutlined /> 编辑
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // 表格视图
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{text}</div>
      ),
    },
    {
      title: '班级',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => formatGender(gender),
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      render: (age: number) => `${age} 岁`,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <div className={`student-status ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? '在读' : '已停用'}
        </div>
      ),
    },
    {
      title: '学习进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number | undefined) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="progress-bar" style={{ width: '80px', flex: 1 }}>
            <div className="progress-fill" style={{ width: `${progress ?? 0}%` }}></div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{progress ?? 0}%</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: StudentDisplay) => (
        <Space size="small">
          <button 
            className="action-btn action-btn-view"
            onClick={() => navigate(`/portfolio/${record.id}`)}
          >
            <EyeOutlined /> 查看
          </button>
          <button 
            className="action-btn action-btn-edit"
            onClick={() => navigate(`/students/${record.id}/edit?returnTo=/portfolio`)}
          >
            <EditOutlined /> 编辑
          </button>
          <button 
            className="action-btn action-btn-delete"
            onClick={() => handleDelete(record.id, record.name)}
          >
            <DeleteOutlined /> 删除
          </button>
        </Space>
      ),
    },
  ];

  return (
    <div className="portfolio-page">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">学生档案</h1>
          <p className="page-subtitle">管理学生信息和成长记录</p>
        </div>
          <button 
            className="btn-add"
            onClick={() => navigate('/students/create?returnTo=/portfolio')}
          >
            <PlusOutlined />
            添加学生
        </button>
      </div>

      {/* 主内容区 */}
      <Card className="portfolio-card">
        {/* 筛选栏 */}
        <div className="filter-bar">
          <Input
            placeholder="搜索学生姓名..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="filter-input"
          />
          <ConfigurableSelect
            groupKey="student_grade"
            placeholder="选择年级"
            value={gradeFilter || undefined}
            onChange={(value) => setGradeFilter((value as string) || '')}
            className="filter-select"
            allowClear
          />
          
          {/* 视图切换 */}
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
            >
              <AppstoreOutlined /> 卡片
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <UnorderedListOutlined /> 列表
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        {filteredStudents.length > 0 ? (
          viewMode === 'card' ? (
            renderCardView()
          ) : (
            <Table
              columns={columns}
              dataSource={filteredStudents}
              rowKey="id"
              loading={loading}
              pagination={{ 
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 名学生`,
                onChange: (page, pageSize) => fetchStudents(page, pageSize),
              }}
              className="portfolio-table"
            />
          )
        ) : (
          <Empty
            image={<TeamOutlined style={{ fontSize: 64, color: 'var(--color-text-tertiary)' }} />}
            description={
              <div className="empty-state">
                <div className="empty-state-title">暂无学生</div>
                <div className="empty-state-desc">点击上方按钮添加您的第一个学生</div>
              </div>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default Portfolio;

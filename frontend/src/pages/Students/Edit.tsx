import React, { useState, useEffect } from 'react';
import { Card, message, Typography, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentForm, StudentFormData } from '@/components';
import { studentService } from '../../services/student';
import { refreshDashboardStats } from '../../stores/dashboard';
import type { Student } from '../../types/student';

const { Title } = Typography;

const EditStudent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (id) {
      fetchStudent(id);
    }
  }, [id]);

  const fetchStudent = async (studentId: string) => {
    setFetchLoading(true);
    try {
      const data = await studentService.getStudent(studentId);
      setStudent(data);
    } catch (error) {
      message.error('获取学生信息失败');
      console.error('Fetch student error:', error);
      navigate('/students');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (values: StudentFormData) => {
    if (!id) return;
    
    setLoading(true);
    try {
      // 根据年龄计算出生日期
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - (values.age || 0);
      const birth_date = `${birthYear}-01-01`;

      await studentService.updateStudent(id, {
        name: values.name,
        gender: values.gender,
        grade: values.grade,
        class_name: values.class_name,
        birth_date: birth_date,
      });
      message.success('学生信息更新成功');
      // 刷新仪表盘数据
      refreshDashboardStats();
      navigate('/students');
    } catch (error) {
      message.error('更新失败，请重试');
      console.error('Update student error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/students');
  };

  const getInitialData = (): Partial<StudentFormData> | undefined => {
    if (!student) return undefined;
    return {
      name: student.name,
      gender: student.gender as '男' | '女',
      grade: student.grade,
      class_name: student.class_name,
      status: student.is_active !== false ? 'active' : 'inactive',
    };
  };

  if (fetchLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title={<Title level={4}>编辑学生</Title>}>
        <StudentForm
          initialData={getInitialData()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default EditStudent;

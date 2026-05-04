import React, { useState } from 'react';
import { Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { StudentForm, StudentFormData } from '@/components';
import { studentService } from '../../services/student';
import { refreshDashboardStats } from '../../stores/dashboard';

const { Title } = Typography;

const toDateString = (value?: { format: (template: string) => string }) =>
  value ? value.format('YYYY-MM-DD') : undefined;

const CreateStudent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: StudentFormData) => {
    setLoading(true);
    try {
      await studentService.createStudent({
        name: values.name,
        gender: values.gender,
        grade: values.grade,
        class_name: values.class_name,
        birth_date: values.birth_date.format('YYYY-MM-DD'),
        enrollment_date: toDateString(values.enrollment_date),
        is_active: values.is_active,
      });
      message.success('创建成功');
      // 刷新仪表盘数据
      refreshDashboardStats();
      navigate('/students');
    } catch (error) {
      message.error('添加失败，请重试');
      console.error('Create student error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/students');
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title={<Title level={4}>添加学生</Title>}>
        <StudentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default CreateStudent;

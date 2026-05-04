import React, { useState } from 'react';
import { Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import StudentForm, { StudentFormData } from '../../components/Students/StudentForm';
import { studentService } from '../../services/student';

const toDateString = (value?: { format: (template: string) => string }) =>
  value ? value.format('YYYY-MM-DD') : undefined

const CreatePortfolioStudent: React.FC = () => {
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
      message.success('学生添加成功');
      navigate('/portfolio');
    } catch (error) {
      message.error('添加学生失败，请重试');
      console.error('Create student error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/portfolio');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="添加学生" variant="borderless">
        <StudentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default CreatePortfolioStudent;

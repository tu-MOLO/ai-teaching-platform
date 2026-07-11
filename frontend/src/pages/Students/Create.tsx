import React, { useState } from 'react';
import { Card, message, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentForm, StudentFormData } from '@/components';
import { studentService } from '../../services/student';
import { refreshDashboardStats } from '../../stores/dashboard';
import { BusinessError } from '../../types/error';

const { Title } = Typography;

const toDateString = (value?: { format: (template: string) => string }) =>
  value ? value.format('YYYY-MM-DD') : undefined;

const CreateStudent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get('returnTo') || '/students';

  const handleSubmit = async (values: StudentFormData) => {
    // 提交前关闭所有打开的下拉弹层，避免后续重渲染时引发 removeChild DOM 错误
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setLoading(true);
    try {
      if (!values.birth_date) {
        message.error('请选择出生日期');
        return;
      }
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
      refreshDashboardStats();
      navigate(returnTo);
    } catch (error) {
      if (error instanceof BusinessError) {
        message.error(error.message || '添加失败，请检查输入信息');
      } else {
        message.error('添加失败，请重试');
      }
      console.error('Create student error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(returnTo);
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

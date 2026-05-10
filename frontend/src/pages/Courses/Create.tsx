import React, { useState } from 'react';
import { Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CourseForm, CourseFormData } from '@/components';
import { createCourse } from '../../services/course';
import { refreshDashboardStats } from '../../stores/dashboard';
import { BusinessError } from '../../types/error';

const { Title } = Typography;

/**
 * 创建课程页面
 */
const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  /**
   * 处理表单提交
   */
  const handleSubmit = async (values: CourseFormData) => {
    setLoading(true);
    try {
      await createCourse(values);
      message.success('创建成功');
      // 刷新仪表盘数据
      refreshDashboardStats();
      navigate('/courses');
    } catch (error) {
      if (error instanceof BusinessError) {
        message.error(error.message || '课程创建失败，请检查输入信息');
      } else {
        message.error('课程创建失败');
      }
      console.error('Create course error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    navigate('/courses');
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title={<Title level={4}>新建课程</Title>}>
        <CourseForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          initialData={{ status: 'active' }}
        />
      </Card>
    </div>
  );
};

export default CreateCourse;

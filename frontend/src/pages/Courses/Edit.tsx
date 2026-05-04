import React, { useState, useEffect } from 'react';
import { Card, message, Typography, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CourseForm, CourseFormData } from '@/components';
import { getCourse, updateCourse } from '../../services/course';
import { refreshDashboardStats } from '../../stores/dashboard';

const { Title } = Typography;

/**
 * 编辑课程页面
 */
const EditCourse: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseData, setCourseData] = useState<Partial<CourseFormData>>({});

  /**
   * 加载课程详情
   */
  useEffect(() => {
    if (!id) {
      message.error('课程ID不存在');
      navigate('/courses');
      return;
    }

    const fetchCourse = async () => {
      setLoading(true);
      try {
        const data = await getCourse(id);
        setCourseData({
          name: data.name,
          subject: data.subject,
          grade: data.grade,
          teacher: data.teacher,
          schedule: data.schedule || '',
          status: data.status,
        });
      } catch (error) {
        message.error('加载课程信息失败');
        console.error('Fetch course error:', error);
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, navigate]);

  /**
   * 处理表单提交
   */
  const handleSubmit = async (values: CourseFormData) => {
    if (!id) return;

    setSaving(true);
    try {
      await updateCourse(id, values);
      message.success('课程更新成功');
      // 刷新仪表盘数据
      refreshDashboardStats();
      navigate('/courses');
    } catch (error) {
      message.error('课程更新失败，请重试');
      console.error('Update course error:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    navigate('/courses');
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title={<Title level={4}>编辑课程</Title>}>
        <CourseForm
          initialData={courseData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
        />
      </Card>
    </div>
  );
};

export default EditCourse;

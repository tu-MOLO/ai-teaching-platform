import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Space, message, InputNumber, Typography, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import type { LessonPlanFormData } from '../../types/forms';
import { getLessonPlan, updateLessonPlan, type LessonPlan } from '../../services/lessonPlan';
import ConfigurableSelect from '../../components/Common/ConfigurableSelect';
import { refreshDashboardStats } from '../../stores/dashboard';
import './index.css';

const { Title } = Typography;
const { TextArea } = Input;

const EditLessonPlan: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  // lessonPlan 状态保留以备将来扩展使用
  const [, setLessonPlan] = useState<LessonPlan | null>(null);

  // 获取教案详情
  useEffect(() => {
    const fetchLessonPlan = async () => {
      if (!id) return;
      setFetchLoading(true);
      try {
        const data = await getLessonPlan(id);
        setLessonPlan(data);
        // 设置表单初始值
        form.setFieldsValue({
          title: data.title,
          subject: data.subject,
          grade: data.grade,
          duration: data.duration,
          teaching_objectives: data.teaching_objectives,
          teaching_content: data.teaching_content,
          teaching_resources: data.teaching_resources,
        });
      } catch (error) {
        message.error('获取教案详情失败');
        console.error('Failed to fetch lesson plan:', error);
        navigate('/lesson-planner');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchLessonPlan();
  }, [id, form, navigate]);

  const handleSubmit = async (values: LessonPlanFormData) => {
    if (!id) return;
    setLoading(true);
    try {
      await updateLessonPlan(id, values);
      message.success('教案更新成功');
      // 刷新仪表盘数据
      refreshDashboardStats();
      navigate('/lesson-planner');
    } catch (error) {
      message.error('更新失败');
      console.error('Failed to update lesson plan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="lesson-planner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="lesson-planner">
      <Card title={<Title level={4}>编辑教案</Title>}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 800 }}
        >
          <Form.Item
            name="title"
            label="教案标题"
            rules={[{ required: true, message: '请输入教案标题' }]}
          >
            <Input placeholder="请输入教案标题" />
          </Form.Item>

          <Form.Item
            name="subject"
            label="学科"
            rules={[{ required: true, message: '请选择学科' }]}
          >
            <ConfigurableSelect groupKey="lesson_plan_subject" placeholder="选择学科" />
          </Form.Item>

          <Form.Item
            name="grade"
            label="年级"
            rules={[{ required: true, message: '请选择年级' }]}
          >
            <ConfigurableSelect groupKey="lesson_plan_grade" placeholder="选择年级" />
          </Form.Item>

          <Form.Item
            name="duration"
            label="课程时长(分钟)"
            rules={[{ required: true, message: '请输入课程时长' }]}
          >
            <InputNumber min={15} max={120} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item
            name="teaching_objectives"
            label="教学目标"
            rules={[{ required: true, message: '请输入教学目标' }]}
          >
            <TextArea rows={4} placeholder="请输入教学目标" />
          </Form.Item>

          <Form.Item
            name="teaching_content"
            label="教学内容"
            rules={[{ required: true, message: '请输入教学内容' }]}
          >
            <TextArea rows={6} placeholder="请输入教学内容" />
          </Form.Item>

          <Form.Item
            name="teaching_resources"
            label="教学材料"
          >
            <TextArea rows={3} placeholder="请输入所需教学材料" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
              <Button onClick={() => navigate('/lesson-planner')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditLessonPlan;

import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Radio, Space, Spin, Typography, message } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import ConfigurableSelect from '../../components/Common/ConfigurableSelect'
import { refreshDashboardStats } from '../../stores/dashboard'
import { createLessonPlan, getLessonPlan, updateLessonPlan } from '../../services/lessonPlan'
import type { LessonPlanFormData } from '../../types/forms'
import { BusinessError } from '../../types/error'
import './index.css'

const { Title, Text } = Typography
const { TextArea } = Input

const CreateLessonPlan: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<LessonPlanFormData>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published'>('draft')
  const isEdit = Boolean(id)

  useEffect(() => {
    if (!isEdit || !id) {
      return
    }

    const fetchLessonPlan = async () => {
      setLoading(true)
      try {
        const data = await getLessonPlan(id)
        form.setFieldsValue({
          title: data.title,
          subject: data.subject,
          grade: data.grade,
          duration: data.duration,
          teaching_objectives: data.teaching_objectives,
          teaching_content: data.teaching_content,
          teaching_methods: data.teaching_methods,
          teaching_process: data.teaching_process,
          teaching_resources: data.teaching_resources,
          notes: data.notes,
        })
      } catch (error) {
        message.error('获取教案详情失败')
        navigate('/lesson-planner')
      } finally {
        setLoading(false)
      }
    }

    fetchLessonPlan()
  }, [form, id, isEdit, navigate])

  const handleSubmit = async (values: LessonPlanFormData) => {
    setSaving(true)
    try {
      if (isEdit && id) {
        const { ...restValues } = values
        await updateLessonPlan(id, restValues)
        message.success('教案更新成功')
      } else {
        const status: 'draft' | 'published' = values.status === 'published' ? 'published' : 'draft'
        await createLessonPlan({ ...values, status }, status)
        message.success(status === 'published' ? '教案创建并标记为完成' : '教案创建成功')
      }

      refreshDashboardStats()
      navigate('/lesson-planner')
    } catch (error) {
      if (error instanceof BusinessError) {
        message.error(error.message || (isEdit ? '更新失败，请检查输入信息' : '创建失败，请检查输入信息'));
      } else {
        message.error(isEdit ? '更新失败' : '创建失败');
      }
      console.error('Failed to save lesson plan:', error);
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div
        className="lesson-planner"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="lesson-planner">
      <Card title={<Title level={4}>{isEdit ? '编辑教案' : '新建教案'}</Title>}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 800 }}
          initialValues={{ duration: 40, status: 'draft' }}
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
            label="课程时长（分钟）"
            rules={[{ required: true, message: '请输入课程时长' }]}
          >
            <InputNumber min={15} max={120} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="teaching_objectives" label="教学目标">
            <TextArea rows={4} placeholder="请输入教学目标" />
          </Form.Item>

          <Form.Item name="teaching_content" label="教学内容">
            <TextArea rows={6} placeholder="请输入教学内容" />
          </Form.Item>

          <Form.Item name="teaching_methods" label="教学方法">
            <TextArea rows={3} placeholder="请输入教学方法" />
          </Form.Item>

          <Form.Item name="teaching_process" label="教学过程">
            <TextArea rows={6} placeholder="请输入教学过程" />
          </Form.Item>

          <Form.Item name="teaching_resources" label="教学资源">
            <TextArea rows={3} placeholder="请输入所需教学资源" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          {!isEdit && (
            <Form.Item name="status" label="教案状态">
              <Radio.Group onChange={(event) => setPublishStatus(event.target.value)}>
                <Space direction="vertical">
                  <Radio value="draft">
                    <span style={{ fontWeight: 500 }}>保存为草稿</span>
                    <Text type="secondary" style={{ display: 'block', marginLeft: 24, fontSize: 13 }}>
                      教案将保存为草稿状态，后续可以继续完善。
                    </Text>
                  </Radio>
                  <Radio value="published">
                    <span style={{ fontWeight: 500 }}>创建并标记完成</span>
                    <Text type="secondary" style={{ display: 'block', marginLeft: 24, fontSize: 13 }}>
                      教案会直接创建为已发布状态，可立即投入使用。
                    </Text>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>
                {isEdit ? '保存' : publishStatus === 'published' ? '创建并标记完成' : '创建教案'}
              </Button>
              <Button onClick={() => navigate('/lesson-planner')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default CreateLessonPlan

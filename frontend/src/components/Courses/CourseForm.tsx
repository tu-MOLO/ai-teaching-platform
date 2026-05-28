import React from 'react'
import { Form, Input, Button, Space } from 'antd'
import ConfigurableSelect from '../Common/ConfigurableSelect'

export interface CourseFormData {
  name: string
  subject: string
  grade: string
  schedule: string
  status: 'active' | 'inactive' | 'draft'
}

interface CourseFormProps {
  initialData?: Partial<CourseFormData>
  currentUserName: string
  onSubmit: (values: CourseFormData) => void
  onCancel: () => void
  loading?: boolean
}

const CourseForm: React.FC<CourseFormProps> = ({
  initialData,
  currentUserName,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm<CourseFormData>()

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={initialData}
      style={{ maxWidth: 800 }}
    >
      <Form.Item
        name="name"
        label="课程名称"
        rules={[
          { required: true, message: '请输入课程名称' },
          { max: 50, message: '课程名称不能超过 50 个字符' },
        ]}
      >
        <Input placeholder="请输入课程名称" />
      </Form.Item>

      <Form.Item
        name="subject"
        label="学科"
        rules={[{ required: true, message: '请选择学科' }]}
      >
        <ConfigurableSelect groupKey="course_subject" placeholder="请选择学科" />
      </Form.Item>

      <Form.Item
        name="grade"
        label="年级"
        rules={[{ required: true, message: '请选择年级' }]}
      >
        <ConfigurableSelect groupKey="course_grade" placeholder="请选择年级" />
      </Form.Item>

      <Form.Item label="任课教师">
        <Input value={currentUserName} disabled />
      </Form.Item>

      <Form.Item
        name="schedule"
        label="上课时间"
        rules={[
          { required: true, message: '请输入上课时间' },
          { max: 100, message: '上课时间描述不能超过 100 个字符' },
        ]}
      >
        <Input placeholder="例如：周一、周三 9:00-9:40" />
      </Form.Item>

      <Form.Item
        name="status"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <ConfigurableSelect groupKey="course_status" placeholder="请选择状态" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存
          </Button>
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default CourseForm

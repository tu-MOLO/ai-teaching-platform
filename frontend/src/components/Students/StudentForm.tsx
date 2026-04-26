import React from 'react'
import { Form, Input, Button, Space, DatePicker, Switch } from 'antd'
import type { Dayjs } from 'dayjs'
import ConfigurableSelect from '../Common/ConfigurableSelect'
import zhCN from 'antd/es/date-picker/locale/zh_CN'

export interface StudentFormData {
  name: string
  gender: string
  grade: string
  class_name: string
  birth_date: Dayjs
  enrollment_date?: Dayjs
  is_active: boolean
}

interface StudentFormProps {
  initialData?: Partial<StudentFormData>
  onSubmit: (values: StudentFormData) => void
  onCancel: () => void
  loading?: boolean
}

const StudentForm: React.FC<StudentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm<StudentFormData>()

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      style={{ maxWidth: 600 }}
      initialValues={{
        gender: '男',
        is_active: true,
        ...initialData,
      }}
    >
      <Form.Item
        name="name"
        label="姓名"
        rules={[
          { required: true, message: '请输入学生姓名' },
          { max: 20, message: '姓名不能超过 20 个字符' },
        ]}
      >
        <Input placeholder="请输入学生姓名" />
      </Form.Item>

      <Form.Item
        name="gender"
        label="性别"
        rules={[{ required: true, message: '请选择性别' }]}
      >
        <ConfigurableSelect groupKey="student_gender" placeholder="选择性别" />
      </Form.Item>

      <Form.Item
        name="grade"
        label="年级"
        rules={[{ required: true, message: '请选择年级' }]}
      >
        <ConfigurableSelect groupKey="student_grade" placeholder="选择年级" />
      </Form.Item>

      <Form.Item
        name="class_name"
        label="班级"
        rules={[{ required: true, message: '请选择班级' }]}
      >
        <ConfigurableSelect groupKey="student_class" placeholder="选择班级" />
      </Form.Item>

      <Form.Item
        name="birth_date"
        label="出生日期"
        rules={[{ required: true, message: '请选择出生日期' }]}
      >
        <DatePicker style={{ width: '100%' }} locale={zhCN} placeholder="请选择出生日期" />
      </Form.Item>

      <Form.Item
        name="enrollment_date"
        label="入学日期"
      >
        <DatePicker style={{ width: '100%' }} locale={zhCN} placeholder="请选择入学日期" />
      </Form.Item>

      <Form.Item
        name="is_active"
        label="在读"
        valuePropName="checked"
      >
        <Switch checkedChildren="在读" unCheckedChildren="已停用" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default StudentForm

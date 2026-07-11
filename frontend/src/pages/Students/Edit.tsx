import React, { useEffect, useState } from 'react'
import { Card, Spin, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { StudentForm, type StudentFormData } from '@/components'
import { studentService } from '../../services/student'
import { refreshDashboardStats } from '../../stores/dashboard'
import { BusinessError } from '../../types/error'
import type { Student } from '../../types/student'

const { Title } = Typography

const toDateString = (value?: { format: (template: string) => string }) =>
  value ? value.format('YYYY-MM-DD') : undefined

const EditStudent: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [student, setStudent] = useState<Student | null>(null)

  const returnTo = searchParams.get('returnTo') || '/students'

  useEffect(() => {
    if (!id) {
      return
    }

    const fetchStudent = async () => {
      setFetchLoading(true)
      try {
        const data = await studentService.getStudent(id)
        setStudent(data)
      } catch (error) {
        message.error('获取学生信息失败')
        console.error('Fetch student error:', error)
        navigate(returnTo)
      } finally {
        setFetchLoading(false)
      }
    }

    fetchStudent()
  }, [id, navigate, returnTo])

  const handleSubmit = async (values: StudentFormData) => {
    if (!id) {
      return
    }

    // 提交前关闭所有打开的下拉弹层，避免后续重渲染时引发 removeChild DOM 错误
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setLoading(true)
    try {
      await studentService.updateStudent(id, {
        name: values.name,
        gender: values.gender,
        grade: values.grade,
        class_name: values.class_name,
        birth_date: toDateString(values.birth_date),
        enrollment_date: toDateString(values.enrollment_date),
        is_active: values.is_active,
      })
      message.success('学生信息更新成功')
      refreshDashboardStats()
      navigate(returnTo)
    } catch (error) {
      if (error instanceof BusinessError) {
        message.error(error.message || '更新失败，请检查输入信息')
      } else {
        message.error('更新失败，请重试')
      }
      console.error('Update student error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitialData = (): Partial<StudentFormData> | undefined => {
    if (!student) {
      return undefined
    }

    return {
      name: student.name,
      gender: student.gender,
      grade: student.grade,
      class_name: student.class_name,
      birth_date: student.birth_date ? dayjs(student.birth_date) : undefined,
      enrollment_date: student.enrollment_date ? dayjs(student.enrollment_date) : undefined,
      is_active: student.is_active !== false,
    }
  }

  if (fetchLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title={<Title level={4}>编辑学生</Title>}>
        <StudentForm
          key={student?.id || 'loading'}
          initialData={getInitialData()}
          onSubmit={handleSubmit}
          onCancel={() => navigate(returnTo)}
          loading={loading}
        />
      </Card>
    </div>
  )
}

export default EditStudent

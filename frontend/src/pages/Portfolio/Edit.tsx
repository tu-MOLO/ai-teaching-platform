import React, { useEffect, useState } from 'react'
import { Card, message } from 'antd'
import dayjs from 'dayjs'
import { useNavigate, useParams } from 'react-router-dom'
import StudentForm, { type StudentFormData } from '../../components/Students/StudentForm'
import { studentService } from '../../services/student'
import type { Student } from '../../types/student'

const toDateString = (value?: { format: (template: string) => string }) =>
  value ? value.format('YYYY-MM-DD') : undefined

const EditPortfolioStudent: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [initialData, setInitialData] = useState<Partial<StudentFormData>>()

  useEffect(() => {
    if (!id) {
      return
    }

    const fetchStudent = async () => {
      try {
        const student: Student = await studentService.getStudent(id)
        setInitialData({
          name: student.name,
          gender: student.gender,
          grade: student.grade,
          class_name: student.class_name,
          birth_date: student.birth_date ? dayjs(student.birth_date) : undefined,
          enrollment_date: student.enrollment_date ? dayjs(student.enrollment_date) : undefined,
          is_active: student.is_active !== false,
        })
      } catch (error) {
        message.error('获取学生信息失败')
        console.error('Fetch student error:', error)
        navigate('/portfolio')
      } finally {
        setFetching(false)
      }
    }

    fetchStudent()
  }, [id, navigate])

  const handleSubmit = async (values: StudentFormData) => {
    if (!id) {
      return
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
      navigate('/portfolio')
    } catch (error) {
      message.error('更新学生信息失败，请重试')
      console.error('Update student error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card title="编辑学生" variant="borderless" loading={fetching}>
        {!fetching && (
          <StudentForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/portfolio')}
            loading={loading}
          />
        )}
      </Card>
    </div>
  )
}

export default EditPortfolioStudent

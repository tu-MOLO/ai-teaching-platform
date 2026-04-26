import React, { useState, useEffect } from 'react';
import { Card, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import StudentForm, { StudentFormData } from '../../components/Students/StudentForm';
import { studentService } from '../../services/student';
import type { Student } from '../../types/student';

const EditPortfolioStudent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<StudentFormData>>();
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;
      try {
        const student: Student = await studentService.getStudent(id);
        // 将Student数据转换为StudentFormData格式
        const formData: Partial<StudentFormData> = {
          name: student.name,
          gender: student.gender as '男' | '女',
          grade: student.grade,
          class_name: student.class_name,
          status: student.is_active !== false ? 'active' : 'inactive',
        };
        // 如果有birth_date，计算年龄
        if (student.birth_date) {
          const birthYear = new Date(student.birth_date).getFullYear();
          const currentYear = new Date().getFullYear();
          formData.age = currentYear - birthYear;
        }
        setInitialData(formData);
      } catch (error) {
        message.error('获取学生信息失败');
        console.error('Fetch student error:', error);
        navigate('/portfolio');
      } finally {
        setFetching(false);
      }
    };

    fetchStudent();
  }, [id, navigate]);

  const handleSubmit = async (values: StudentFormData) => {
    if (!id) return;
    setLoading(true);
    try {
      await studentService.updateStudent(id, values);
      message.success('学生信息更新成功');
      navigate('/portfolio');
    } catch (error) {
      message.error('更新学生信息失败，请重试');
      console.error('Update student error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/portfolio');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="编辑学生" variant="borderless" loading={fetching}>
        {!fetching && (
          <StudentForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
      </Card>
    </div>
  );
};

export default EditPortfolioStudent;

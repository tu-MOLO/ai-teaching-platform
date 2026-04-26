/**
 * StudentCard 学生卡片组件
 *
 * 用于展示学生基本信息的卡片组件，包含姓名、班级、年级和状态信息，
 * 并提供跳转到学生档案详情页的链接。
 *
 * @component
 * @example
 * ```tsx
 * import StudentCard from './components/Portfolio/StudentCard';
 * import type { Student } from '@/types/student';
 *
 * const student: Student = {
 *   id: 'student-123',
 *   name: '小明',
 *   gender: '男',
 *   grade: '培智一年级',
 *   class_name: '1班',
 *   age: 8,
 *   is_active: true,
 *   created_at: '2024-01-01T00:00:00Z'
 * };
 *
 * <StudentCard student={student} />
 * ```
 *
 * @interface StudentCardProps
 * @property {Student} student - 学生数据对象
 */

import React from 'react';
import { Card, Typography, Tag, Space } from 'antd';
import { Link } from 'react-router-dom';
import type { Student } from '@/types/student';

const { Title, Text } = Typography;

/**
 * 学生卡片组件Props接口
 */
export interface StudentCardProps {
  /** 学生数据对象 */
  student: Student;
}

/**
 * 转换性别显示
 * 将 'male'/'female' 转换为 '男'/'女'
 */
const formatGender = (gender: string): string => {
  const genderMap: Record<string, string> = {
    'male': '男',
    'female': '女',
    '男': '男',
    '女': '女',
  };
  return genderMap[gender] || gender;
};

/**
 * 根据出生日期计算年龄
 */
const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * 格式化日期显示
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

/**
 * 学生卡片组件
 *
 * 展示学生基本信息并提供档案查看入口
 *
 * @param props - 组件属性
 * @returns React组件
 */
const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  // 计算年龄：优先使用 student.age，否则根据 birth_date 计算
  const age = student.age ?? (student.birth_date ? calculateAge(student.birth_date) : undefined);

  return (
    <Card className="student-card" hoverable>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 学生姓名和状态 */}
        <Space>
          <Title level={5} style={{ margin: 0 }}>{student.name}</Title>
          <Tag color={student.is_active ? 'green' : 'red'}>
            {student.is_active ? '在读' : '已停用'}
          </Tag>
        </Space>

        {/* 性别信息 */}
        <Text type="secondary">性别: {formatGender(student.gender)}</Text>

        {/* 班级信息 */}
        <Text type="secondary">班级: {student.class_name}</Text>

        {/* 年级信息 */}
        <Text type="secondary">年级: {student.grade}</Text>

        {/* 年龄信息 */}
        {age !== undefined && (
          <Text type="secondary">年龄: {age} 岁</Text>
        )}

        {/* 入学日期 */}
        {student.enrollment_date && (
          <Text type="secondary">入学日期: {formatDate(student.enrollment_date)}</Text>
        )}

        {/* 查看档案链接 */}
        <Link to={`/portfolio/${student.id}`} style={{ marginTop: 8 }}>
          查看档案 →
        </Link>
      </Space>
    </Card>
  );
};

export default StudentCard;

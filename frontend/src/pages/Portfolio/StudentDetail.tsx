import React, { useEffect, useState, useMemo } from 'react'
import { Button, Card, Typography, Timeline, Space, message, Empty, Input, Select } from 'antd'
import { EditOutlined, FileTextOutlined, PlusOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { studentService } from '@/services/student'
import { portfolioService } from '@/services/portfolio'
import { AbilityRadar, TimelineItem } from '@/components'
import { usePortfolioTypesStore } from '@/stores/portfolioTypes'
import type { Student } from '@/types/student'
import type { PortfolioItem } from '@/types/portfolio'
import './index.css'

const { Title } = Typography
const { Option } = Select

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

const PORTFOLIO_PAGE_SIZE = 100;

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  
  // 获取自定义记录类型
  const { getAllTypes } = usePortfolioTypesStore()
  const portfolioTypes = getAllTypes()

  const fetchStudent = async () => {
    if (!id) return

    try {
      setLoading(true)
      const studentData = await studentService.getStudent(id)
      setStudent(studentData)
    } catch (error) {
      message.error('获取学生信息失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchPortfolio = async () => {
    if (!id) return

    try {
      const allItems: PortfolioItem[] = []
      let page = 1
      let totalPages = 1

      do {
        const response = await portfolioService.getPortfolios({
          student_id: id,
          page,
          page_size: PORTFOLIO_PAGE_SIZE,
        })
        allItems.push(...(response.data || []))
        totalPages = response.pages || 1
        page += 1
      } while (page <= totalPages)

      setPortfolioItems(allItems)
    } catch (error) {
      message.error('获取成长档案失败')
    }
  }

  // 处理删除记录
  const handleDeleteRecord = async (recordId: string) => {
    try {
      await portfolioService.deletePortfolioItem(recordId)
      message.success('记录删除成功')
      // 刷新列表
      fetchPortfolio()
    } catch (error) {
      message.error('删除记录失败')
    }
  }

  // 处理编辑记录
  const handleEditRecord = (recordId: string) => {
    navigate(`/portfolio/${id}/edit-record/${recordId}`)
  }

  // 过滤后的记录列表
  const filteredPortfolioItems = useMemo(() => {
    let filtered = [...portfolioItems]

    // 按类型筛选
    if (filterType) {
      filtered = filtered.filter(item => item.type === filterType)
    }

    // 按关键词搜索（标题或内容）
    if (searchText) {
      const keyword = searchText.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(keyword) ||
        (item.content && item.content.toLowerCase().includes(keyword))
      )
    }

    // 按时间倒序排列
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [portfolioItems, searchText, filterType])

  const handleExportReport = async () => {
    if (!id) return

    try {
      const fileBlob = await portfolioService.exportPortfolioReport(id)
      const url = window.URL.createObjectURL(fileBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${student?.name || '学生'}成长报告.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  useEffect(() => {
    fetchStudent()
    fetchPortfolio()
  }, [id])

  if (loading || !student) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="student-detail">
      <Card
        title={
          <Space>
            <Title level={4}>{student.name}的成长档案</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/portfolio/${id}/add-record`)}
            >
              添加记录
            </Button>
            <Button icon={<FileTextOutlined />} onClick={handleExportReport}>
              导出报告
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/students/${id}/edit?returnTo=/portfolio/${id}`)}>
              编辑
            </Button>
          </Space>
        }
        className="student-detail-card"
      >
        <div className="student-info">
          <Card size="small" title="基本信息">
            <p><strong>姓名:</strong> {student.name}</p>
            <p><strong>性别:</strong> {formatGender(student.gender)}</p>
            <p><strong>出生日期:</strong> {student.birth_date}</p>
            <p><strong>班级:</strong> {student.class_name}</p>
            <p><strong>年级:</strong> {student.grade}</p>
            {student.parent_contact && (
              <p><strong>家长联系方式:</strong> {student.parent_contact}</p>
            )}
          </Card>
        </div>

        <div className="ability-radar">
          <Title level={5}>能力发展雷达图</Title>
          {id && <AbilityRadar studentId={id} />}
        </div>

        <div className="portfolio-timeline">
          <Title level={5}>成长时间轴</Title>
          <Card className="timeline-card">
            {/* 搜索和筛选栏 */}
            {portfolioItems.length > 0 && (
              <div className="timeline-filter-bar" style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
                <Input
                  placeholder="搜索记录标题或内容..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
                <Select
                  placeholder="筛选类型"
                  value={filterType || undefined}
                  onChange={(value) => setFilterType(value)}
                  style={{ width: 180 }}
                  allowClear
                >
                  {portfolioTypes.map((type) => (
                    <Option key={type.id} value={type.id}>
                      <span style={{ marginRight: 8 }}>{type.icon}</span>
                      {type.name}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {portfolioItems.length === 0 ? (
              <Empty
                image={<ClockCircleOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                description="暂无成长记录"
                style={{ padding: '40px 0' }}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/portfolio/${id}/add-record`)}
                >
                  添加第一条记录
                </Button>
              </Empty>
            ) : filteredPortfolioItems.length === 0 ? (
              <Empty
                description="未找到匹配的记录"
                style={{ padding: '40px 0' }}
              />
            ) : (
              <Timeline mode="left">
                {filteredPortfolioItems.map((item) => (
                  <Timeline.Item key={item.id}>
                    <TimelineItem
                      item={item}
                      onDelete={handleDeleteRecord}
                      onEdit={handleEditRecord}
                    />
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>
        </div>
      </Card>
    </div>
  )
}

export default StudentDetail

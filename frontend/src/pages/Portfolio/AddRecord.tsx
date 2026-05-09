import React, { useState } from 'react'
import { Button, Card, Form, Input, Space, Typography, Upload, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { EvaluationForm } from '@/components'
import PortfolioTypeSelect from '@/components/Portfolio/PortfolioTypeSelect'
import { portfolioService } from '@/services/portfolio'
import { extractResourceIdFromFileUrl, uploadResource } from '@/services/resource'
import type { PortfolioItemCreate } from '@/types/portfolio'
import './index.css'

const { Title } = Typography
const { TextArea } = Input

const toScore = (value?: number): number | undefined => {
  if (typeof value !== 'number') {
    return undefined
  }
  return Math.round(value * 20)
}

const AddRecord: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (values: any) => {
    if (!id) {
      return
    }

    try {
      setLoading(true)

      const data: PortfolioItemCreate = {
        student_id: id,
        type: values.type,
        title: values.title,
        content: values.content,
        attachments: JSON.stringify(attachments),
        cognitive_score: toScore(values.evaluation?.['认知理解']),
        skill_score: toScore(values.evaluation?.['操作技能']),
        creativity_score: toScore(values.evaluation?.['创意表达']),
        cooperation_score: toScore(values.evaluation?.['合作参与']),
        attention_score: toScore(values.evaluation?.['注意力维持']),
      }

      await portfolioService.createPortfolioItem(data)
      message.success('添加记录成功')
      navigate(`/portfolio/${id}`)
    } catch (error) {
      message.error('添加记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (options: any) => {
    const { file, onSuccess, onError } = options

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      formData.append('description', `成长档案附件 - ${file.name}`)

      const response = await uploadResource(formData)

      if (!response.file_url) {
        throw new Error('上传响应中没有文件 URL')
      }

      const resourceId = extractResourceIdFromFileUrl(response.file_url)
      if (!resourceId) {
        throw new Error('上传响应中缺少资源标识')
      }

      setAttachments((prev) => [...prev, resourceId])
      message.success(`文件“${file.name}”上传成功`)
      onSuccess?.(response)
    } catch (error: any) {
      message.error(`文件“${file.name}”上传失败: ${error.message || '未知错误'}`)
      onError?.(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="add-record">
      <Card title={<Title level={4}>添加档案记录</Title>} className="add-record-card">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="type" label="记录类型" rules={[{ required: true, message: '请选择记录类型' }]}>
            <PortfolioTypeSelect placeholder="选择记录类型" />
          </Form.Item>

          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>

          <Form.Item name="content" label="内容描述">
            <TextArea rows={6} placeholder="请输入内容描述" />
          </Form.Item>

          <Form.Item name="evaluation" label="评价维度">
            <EvaluationForm />
          </Form.Item>

          <Form.Item label="附件">
            <Upload customRequest={handleFileUpload} multiple listType="text" disabled={uploading}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? '上传中...' : '上传附件'}
              </Button>
            </Upload>
            {attachments.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>已上传 {attachments.length} 个文件</div>
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存记录
              </Button>
              <Button onClick={() => navigate(`/portfolio/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default AddRecord

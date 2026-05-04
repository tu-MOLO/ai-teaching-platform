import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Space, Spin, Typography, Upload, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { EvaluationForm } from '@/components'
import PortfolioTypeSelect from '@/components/Portfolio/PortfolioTypeSelect'
import { portfolioService } from '@/services/portfolio'
import { uploadResource } from '@/services/resource'
import type { PortfolioItemUpdate } from '@/types/portfolio'
import './index.css'

const { Title } = Typography
const { TextArea } = Input

const EditRecord: React.FC = () => {
  const { id, recordId } = useParams<{ id: string; recordId: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!recordId) {
      return
    }

    const fetchRecord = async () => {
      try {
        setLoading(true)
        const record = await portfolioService.getPortfolioItem(recordId)

        form.setFieldsValue({
          type: record.type,
          title: record.title,
          content: record.content,
          evaluation: {
            cognitive: record.cognitive_score,
            skill: record.skill_score,
            creativity: record.creativity_score,
            cooperation: record.cooperation_score,
            attention: record.attention_score,
          },
        })

        if (record.attachments) {
          try {
            const parsedAttachments = JSON.parse(record.attachments)
            setAttachments(Array.isArray(parsedAttachments) ? parsedAttachments.filter(Boolean) : [])
          } catch {
            setAttachments([])
          }
        }
      } catch (error) {
        message.error('获取记录信息失败')
        navigate(`/portfolio/${id}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRecord()
  }, [form, id, navigate, recordId])

  const handleSubmit = async (values: any) => {
    if (!recordId) {
      return
    }

    try {
      setSaving(true)

      const data: PortfolioItemUpdate = {
        type: values.type,
        title: values.title,
        content: values.content,
        attachments: JSON.stringify(attachments),
        cognitive_score: values.evaluation?.cognitive,
        skill_score: values.evaluation?.skill,
        creativity_score: values.evaluation?.creativity,
        cooperation_score: values.evaluation?.cooperation,
        attention_score: values.evaluation?.attention,
      }

      await portfolioService.updatePortfolioItem(recordId, data)
      message.success('记录更新成功')
      navigate(`/portfolio/${id}`)
    } catch (error) {
      message.error('更新记录失败')
    } finally {
      setSaving(false)
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

      setAttachments((prev) => [...prev, response.file_url as string])
      message.success(`文件“${file.name}”上传成功`)
      onSuccess?.(response)
    } catch (error: any) {
      message.error(`文件“${file.name}”上传失败: ${error.message || '未知错误'}`)
      onError?.(error)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="edit-record" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <div className="edit-record">
      <Card title={<Title level={4}>编辑档案记录</Title>} className="edit-record-card">
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
            {attachments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>已上传附件：</div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment}-${index}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f5f5f5',
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>附件 {index + 1}</span>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            <Upload customRequest={handleFileUpload} multiple listType="text" disabled={uploading} showUploadList={false}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? '上传中...' : '上传新附件'}
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存修改
              </Button>
              <Button onClick={() => navigate(`/portfolio/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default EditRecord

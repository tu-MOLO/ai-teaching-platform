import React, { useState } from 'react';
import { Form, Input, Button, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import FileUpload from '../../components/ResourceCenter/FileUpload';
import { uploadResource } from '../../services/resource';
import ConfigurableSelect from '../../components/Common/ConfigurableSelect';
import { refreshDashboardStats } from '../../stores/dashboard';
import './index.css';

/** 最大文件大小：100MB（与后端配置保持一致） */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的字符串
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const UploadPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [description, setDescription] = useState<string>('');
  const navigate = useNavigate();

  const handleFileChange = (files: any[]) => {
    // 再次验证文件大小
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        message.error(
          `文件 ${file.name} 超过100MB限制（当前大小: ${formatFileSize(file.size)}）`
        );
        return false;
      }
      return true;
    });
    setFileList(validFiles);
  };

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请选择文件');
      return;
    }

    // 提交前再次验证文件大小
    const oversizedFiles = fileList.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      oversizedFiles.forEach(file => {
        message.error(
          `文件 ${file.name} 超过100MB限制（当前大小: ${formatFileSize(file.size)}）`
        );
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', values.title);
      formData.append('description', description || values.description || '');
      for (const tagId of values.tags || []) {
        formData.append('tag_ids', tagId);
      }
      formData.append('file', fileList[0]);

      await uploadResource(formData);
      message.success('资源上传成功');
      // 刷新仪表盘数据
      refreshDashboardStats();
      navigate('/resource-center');
    } catch (error) {
      message.error('资源上传失败');
      console.error('Failed to upload resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/resource-center');
  };

  return (
    <div className="resource-center">
      <div className="resource-header">
        <h1 className="resource-title">上传资源</h1>
      </div>

      <Form
        form={form}
        layout="vertical"
        className="upload-form"
        onFinish={handleSubmit}
      >
        <div className="upload-section">
          <h3 className="upload-section-title">文件上传</h3>
          <FileUpload onFileChange={handleFileChange} />
          {fileList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ color: '#666' }}>已选择文件：</p>
              <ul style={{ color: '#666', paddingLeft: 20 }}>
                {fileList.map((file, index) => (
                  <li key={index}>
                    {file.name} ({formatFileSize(file.size)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="upload-section">
          <h3 className="upload-section-title">基本信息</h3>
          <Form.Item
            name="title"
            label="资源标题"
            rules={[{ required: true, message: '请输入资源标题' }]}
          >
            <Input placeholder="请输入资源标题" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            rules={[{ required: true, message: '请选择至少一个标签' }]}
          >
            <ConfigurableSelect
              groupKey="resource_tag"
              mode="multiple"
              placeholder="请选择标签"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>

        <div className="upload-section">
          <h3 className="upload-section-title">资源描述</h3>
          <Form.Item
            name="description"
          >
            <div className="markdown-editor">
              <MDEditor value={description} onChange={(val) => setDescription(val || '')} />
            </div>
          </Form.Item>
        </div>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
            <Button onClick={handleCancel}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default UploadPage;

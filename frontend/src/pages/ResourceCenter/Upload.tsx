import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Button, Divider, message, Space, Select, Collapse } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import FileUpload from '../../components/ResourceCenter/FileUpload';
import { uploadResource } from '../../services/resource';
import { createTag, getTags, type Tag } from '../../services/tag';
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
  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [tagLoading, setTagLoading] = useState<boolean>(false);
  const [creatingTag, setCreatingTag] = useState<boolean>(false);
  const [draftTag, setDraftTag] = useState<string>('');
  const navigate = useNavigate();
  const selectedFile = fileList[0];

  const loadTags = async () => {
    setTagLoading(true);
    try {
      const items = await getTags();
      setTagOptions(items);
    } catch (error) {
      message.error('加载标签失败');
    } finally {
      setTagLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const tagSelectOptions = useMemo(
    () => tagOptions.map((tag) => ({ label: tag.name, value: tag.id })),
    [tagOptions]
  );

  const handleCreateTag = async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }

    const duplicate = tagOptions.find((tag) => tag.name === trimmed);
    if (duplicate) {
      const currentValues = form.getFieldValue('tags') || [];
      form.setFieldValue('tags', Array.from(new Set([...currentValues, duplicate.id])));
      return;
    }

    try {
      setCreatingTag(true);
      const created = await createTag({ name: trimmed });
      setTagOptions((prev) => [...prev, created]);
      const currentValues = form.getFieldValue('tags') || [];
      form.setFieldValue('tags', [...currentValues, created.id]);
      message.success('标签已新增');
    } catch (error: any) {
      message.error(error?.message || '新增标签失败');
    } finally {
      setCreatingTag(false);
    }
  };

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

    const nextFile = validFiles[0];
    const currentTitle = form.getFieldValue('title');
    if (nextFile && !currentTitle?.trim()) {
      const inferredTitle = nextFile.name.replace(/\.[^.]+$/, '');
      form.setFieldValue('title', inferredTitle);
    }
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
      formData.append('name', (values.title || selectedFile?.name || '').trim());
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
            <Input placeholder={selectedFile ? `留空请先参考文件名：${selectedFile.name}` : '请输入资源标题'} />
          </Form.Item>
          <div style={{ marginTop: -12, marginBottom: 16, color: '#666', fontSize: 12 }}>
            建议直接使用文件原名或稍作修改，先完成上传即可。
          </div>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="multiple"
              placeholder="可选；输入后按回车可快捷新增"
              style={{ width: '100%' }}
              loading={tagLoading}
              options={tagSelectOptions}
              showSearch
              allowClear
              notFoundContent={tagLoading ? '加载中...' : '暂无标签'}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space direction="vertical" style={{ padding: 8, width: '100%' }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        value={draftTag}
                        placeholder="快捷新增标签"
                        onChange={(event) => setDraftTag(event.target.value)}
                        onPressEnter={async () => {
                          await handleCreateTag(draftTag);
                          setDraftTag('');
                        }}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={creatingTag}
                        onClick={async () => {
                          await handleCreateTag(draftTag);
                          setDraftTag('');
                        }}
                      >
                        新增
                      </Button>
                    </Space.Compact>
                  </Space>
                </>
              )}
            />
          </Form.Item>
          <div style={{ marginTop: -12, marginBottom: 16, color: '#666', fontSize: 12 }}>
            标签不是必填项；输入标签名称后按回车可快捷新增真实标签
            {creatingTag ? '，正在创建...' : ''}
          </div>
        </div>

        <div className="upload-section">
          <Collapse
            items={[
              {
                key: 'description',
                label: '补充资源描述（可选）',
                children: (
                  <>
                    <div style={{ marginBottom: 12, color: '#666', fontSize: 12 }}>
                      需要补充说明时再填写，留空也可直接上传。
                    </div>
                    <Form.Item name="description" style={{ marginBottom: 0 }}>
                      <div className="markdown-editor">
                        <MDEditor
                          value={description}
                          onChange={(val) => setDescription(val || '')}
                          textareaProps={{ placeholder: '可填写适用场景、使用说明、课节建议等' }}
                        />
                      </div>
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
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

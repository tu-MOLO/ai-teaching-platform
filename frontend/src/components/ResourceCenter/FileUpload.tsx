/**
 * FileUpload 文件上传组件
 *
 * 基于 react-dropzone 的文件上传组件，支持拖拽和点击选择文件。
 * 提供文件大小验证（最大100MB）和数量限制（单文件上传）。
 *
 * @component
 * @example
 * ```tsx
 * import FileUpload from './components/ResourceCenter/FileUpload';
 *
 * const handleFileChange = (files: File[]) => {
 *   console.log('选择的文件:', files);
 *   // 处理文件上传逻辑
 * };
 *
 * <FileUpload onFileChange={handleFileChange} />
 * ```
 *
 * @interface FileUploadProps
 * @property {(files: File[]) => void} onFileChange - 文件选择变化时的回调函数
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { message, Progress } from 'antd';

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

/**
 * 文件上传组件Props接口
 */
export interface FileUploadProps {
  /** 文件选择变化时的回调函数 */
  onFileChange: (files: File[]) => void;
  /** 上传进度百分比（0-100） */
  uploadPercent?: number;
}

/**
 * 文件上传组件
 *
 * 支持拖拽上传和点击选择，包含文件大小和数量验证
 *
 * @param props - 组件属性
 * @returns React组件
 */
const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, uploadPercent }) => {
  /** 是否正在拖拽文件 */
  const [isDragging, setIsDragging] = useState<boolean>(false);

  /**
   * 处理文件拖放事件
   * @param acceptedFiles - 接受的文件列表
   */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // 验证文件大小
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        message.error(
          `文件 ${file.name} 超过100MB限制（当前大小: ${formatFileSize(file.size)}）`
        );
        return false;
      }
      return true;
    });

    // 通知父组件文件变化
    if (validFiles.length > 0) {
      onFileChange(validFiles);
        message.success(`已选择文件：${validFiles[0].name}`);
    }
  }, [onFileChange]);

  // 使用 react-dropzone 配置
  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  // 处理文件拒绝（超出大小限制或数量限制）
  React.useEffect(() => {
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            message.error(
              `文件 ${file.name} 超过100MB限制（当前大小: ${formatFileSize(file.size)}）`
            );
          } else if (error.code === 'too-many-files') {
            message.error('一次只能上传 1 个文件');
          }
        });
      });
    }
  }, [fileRejections]);

  return (
    <>
    <div
      {...getRootProps()}
      className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
      style={{
        border: `2px dashed ${isDragging ? '#1890ff' : '#d9d9d9'}`,
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging ? '#e6f7ff' : '#fafafa',
        transition: 'all 0.3s ease',
      }}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <input {...getInputProps()} />
      <div>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>📁</p>
        <p style={{ marginBottom: '8px', fontSize: '16px' }}>
          <strong>点击或拖拽文件到此处上传</strong>
        </p>
        <p style={{ fontSize: '14px', color: '#999' }}>
          支持图片、视频、文档等多种格式，单个文件不超过100MB
        </p>
      </div>
    </div>
    {uploadPercent != null && uploadPercent > 0 && (
      <div style={{ marginTop: 16 }}>
        <Progress
          percent={uploadPercent}
          status={uploadPercent >= 100 ? 'success' : 'active'}
          strokeColor={uploadPercent >= 100 ? '#52c41a' : '#1890ff'}
        />
        {uploadPercent >= 100 && (
          <p style={{ textAlign: 'center', color: '#52c41a', marginTop: 8 }}>
            上传完成！
          </p>
        )}
      </div>
    )}
    </>
  );
};

export default FileUpload;

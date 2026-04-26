import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined, LeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { ResourcePreview } from '@/components';
import { getResource, Resource } from '../../services/resource';
import './index.css';

/**
 * XSS防护工具函数
 * 注意：生产环境建议使用 DOMPurify 库进行更完善的XSS防护
 * 安装命令：npm install dompurify @types/dompurify
 * 
 * 使用DOMPurify的示例代码：
 * import DOMPurify from 'dompurify';
 * const clean = DOMPurify.sanitize(dirtyHtml);
 */

// 简单的HTML转义函数，防止XSS攻击
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// 危险标签和属性列表
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button',
  'link', 'style', 'meta', 'base', 'head', 'html', 'body', 'frame', 'frameset'
];

const DANGEROUS_ATTRIBUTES = [
  'onabort', 'onblur', 'onchange', 'onclick', 'ondblclick', 'onerror', 'onfocus',
  'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onmousedown', 'onmousemove',
  'onmouseout', 'onmouseover', 'onmouseup', 'onreset', 'onresize', 'onselect',
  'onsubmit', 'onunload', 'onmouseenter', 'onmouseleave', 'oncontextmenu',
  'oninput', 'oninvalid', 'ondrag', 'ondrop', 'onscroll', 'onwheel',
  'href', 'src', 'action', 'formaction', 'data-', 'style'
];

// 允许的安全标签列表
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'b', 'i', 'em', 'strong', 'u', 'strike', 'del', 'ins',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'div', 'span', 'blockquote', 'pre', 'code',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'sup', 'sub', 'small', 'big', 'mark', 'q', 'abbr', 'cite', 'dfn', 'kbd', 'samp', 'var'
];

// 允许的安全属性列表
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'title', 'target'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'table': ['border', 'cellpadding', 'cellspacing'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan'],
  '*': ['class', 'id', 'title', 'dir', 'lang']
};

/**
 * 检查URL是否安全（防止javascript:协议）
 */
const isSafeUrl = (url: string): boolean => {
  if (!url) return true;
  const lowerUrl = url.toLowerCase().trim();
  return !lowerUrl.startsWith('javascript:') &&
         !lowerUrl.startsWith('data:text/html') &&
         !lowerUrl.startsWith('vbscript:') &&
         !lowerUrl.startsWith('mocha:') &&
         !lowerUrl.startsWith('livescript:');
};

/**
 * 清理属性值
 */
const sanitizeAttribute = (tag: string, attr: string, value: string): string | null => {
  // 检查是否是允许的属性
  const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || [];
  const globalAttrs = ALLOWED_ATTRIBUTES['*'] || [];
  
  if (!allowedAttrs.includes(attr) && !globalAttrs.includes(attr)) {
    return null;
  }
  
  // 对href和src属性进行URL安全检查
  if ((attr === 'href' || attr === 'src') && !isSafeUrl(value)) {
    return '#';
  }
  
  // 转义属性值中的危险字符
  return value
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * 使用DOM解析的HTML清理函数
 * 比正则表达式更可靠，能正确处理嵌套标签
 */
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  try {
    // 创建DOM解析器
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    /**
     * 递归清理DOM节点
     */
    const cleanNode = (node: Node): Node | null => {
      // 文本节点直接返回
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || '');
      }
      
      // 元素节点需要清理
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        // 移除危险标签及其内容
        if (DANGEROUS_TAGS.includes(tagName)) {
          return null;
        }
        
        // 如果是不允许的标签，只保留其子内容
        if (!ALLOWED_TAGS.includes(tagName)) {
          const fragment = document.createDocumentFragment();
          element.childNodes.forEach(child => {
            const cleaned = cleanNode(child);
            if (cleaned) {
              fragment.appendChild(cleaned);
            }
          });
          return fragment;
        }
        
        // 创建新的安全元素
        const newElement = document.createElement(tagName);
        
        // 处理属性
        Array.from(element.attributes).forEach(attr => {
          const attrName = attr.name.toLowerCase();
          
          // 移除危险属性
          if (DANGEROUS_ATTRIBUTES.some(dangerous => attrName.startsWith(dangerous) || attrName === dangerous)) {
            return;
          }
          
          // 清理并设置允许的属性
          const cleanValue = sanitizeAttribute(tagName, attrName, attr.value);
          if (cleanValue !== null) {
            newElement.setAttribute(attrName, cleanValue);
          }
        });
        
        // 递归处理子节点
        element.childNodes.forEach(child => {
          const cleaned = cleanNode(child);
          if (cleaned) {
            newElement.appendChild(cleaned);
          }
        });
        
        return newElement;
      }
      
      // 其他类型的节点（注释等）直接移除
      return null;
    };
    
    // 清理body内容
    const body = doc.body;
    const fragment = document.createDocumentFragment();
    
    Array.from(body.childNodes).forEach(child => {
      const cleaned = cleanNode(child);
      if (cleaned) {
        fragment.appendChild(cleaned);
      }
    });
    
    // 创建临时容器获取HTML字符串
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    return tempDiv.innerHTML;
  } catch (error) {
    // 如果DOM解析失败，回退到转义HTML
    console.warn('HTML sanitization failed, falling back to escape:', error);
    return escapeHtml(html);
  }
};

export { escapeHtml, sanitizeHtml };

const ResourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchResource = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getResource(id);
      setResource(response);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // 资源不存在，静默处理，UI 会显示"资源不存在"
        console.log('Resource not found:', id);
      } else {
        message.error('获取资源详情失败');
        console.error('Failed to fetch resource:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResource();
  }, [id]);

  const handleDownload = () => {
    if (!resource?.file_url) return;
    window.open(resource.file_url, '_blank');
  };

  const handleBack = () => {
    navigate('/resource-center');
  };

  if (loading) {
    return <div className="resource-center">加载中...</div>;
  }

  if (!resource) {
    return <div className="resource-center">资源不存在</div>;
  }

  return (
    <div className="resource-center">
      <Button 
        icon={<LeftOutlined />} 
        onClick={handleBack}
        style={{ marginBottom: 24 }}
      >
        返回资源列表
      </Button>

      <div className="resource-detail">
        <div className="resource-detail-header">
          <h1 className="resource-detail-title">{resource.title}</h1>
          
          <div className="resource-detail-meta">
            <span>上传时间: {new Date(resource.created_at).toLocaleString()}</span>
            <span>文件大小: {resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : '未知'}</span>
            <span>文件类型: {resource.file_type}</span>
          </div>

          <div className="resource-detail-tags">
            {resource.tags.map(tag => (
              <span 
                key={tag.id} 
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '16px',
                  fontSize: '12px',
                  marginRight: '8px'
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <div className="resource-detail-preview">
          <ResourcePreview resource={resource} />
        </div>

        <div className="resource-detail-description">
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(resource.description_html || '') }} />
        </div>

        <div className="resource-detail-actions">
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleDownload}
          >
            下载文件
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetail;

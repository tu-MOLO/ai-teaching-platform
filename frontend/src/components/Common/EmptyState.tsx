import React from 'react';
import { InboxOutlined } from '@ant-design/icons';

export interface EmptyStateProps {
  /** 空状态图标，默认使用收件箱图标 */
  icon?: React.ReactNode;
  /** 主提示语 */
  title: React.ReactNode;
  /** 副提示语（可选） */
  description?: React.ReactNode;
  /** 操作按钮等（可选） */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * 统一空状态组件
 *
 * 各页面资源为空时复用同一套图标尺寸、提示语层级与上下留白，
 * 避免同类空状态在不同页面表现不一致。
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  style,
}) => (
  <div className="empty-state" style={style}>
    <div className="empty-state-icon" aria-hidden>
      {icon ?? <InboxOutlined />}
    </div>
    <div className="empty-state-title">{title}</div>
    {description ? <div className="empty-state-desc">{description}</div> : null}
    {action ? <div className="empty-state-action">{action}</div> : null}
  </div>
);

export default EmptyState;

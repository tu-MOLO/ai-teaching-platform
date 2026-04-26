import React from 'react'
import { Card, Button, Input, Tag, Badge, Alert, Space, Typography, Divider } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useThemeStore } from '../../stores/theme'

const { Title, Text, Paragraph } = Typography

const ThemePreview: React.FC = () => {
  const { currentColors } = useThemeStore()

  return (
    <Card
      title={<Title level={5} style={{ margin: 0 }}>实时预览</Title>}
      style={{ height: '100%' }}
      styles={{ body: { maxHeight: 600, overflow: 'auto' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={24}>
        
        {/* 按钮预览 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            按钮样式
          </Text>
          <Space wrap>
            <Button type="primary" icon={<SaveOutlined />}>
              主要按钮
            </Button>
            <Button>默认按钮</Button>
            <Button type="dashed">虚线按钮</Button>
            <Button type="link">链接按钮</Button>
            <Button danger icon={<DeleteOutlined />}>
              危险按钮
            </Button>
          </Space>
        </section>

        <Divider style={{ margin: '12px 0' }} />

        {/* 卡片预览 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            卡片样式
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <Card
              size="small"
              title="示例卡片"
              extra={<Button type="link" size="small">更多</Button>}
            >
              <Text>这是一个示例卡片内容，展示当前主题下的卡片样式。</Text>
            </Card>
            <Card
              size="small"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <Text type="secondary">次级背景卡片</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                使用次要背景色的卡片样式。
              </Paragraph>
            </Card>
          </div>
        </section>

        <Divider style={{ margin: '12px 0' }} />

        {/* 表单元素预览 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            表单元素
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input placeholder="普通输入框" style={{ maxWidth: 300 }} />
            <Input.Search
              placeholder="搜索输入框"
              style={{ maxWidth: 300 }}
              enterButton
            />
            <Space>
              <Tag color="success">成功标签</Tag>
              <Tag color="warning">警告标签</Tag>
              <Tag color="error">错误标签</Tag>
              <Tag color="processing">处理中</Tag>
            </Space>
            <Space>
              <Badge count={5}>
                <Button size="small">消息</Button>
              </Badge>
              <Badge dot>
                <Button size="small">通知</Button>
              </Badge>
              <Badge count={99} overflowCount={99}>
                <Button size="small">未读</Button>
              </Badge>
            </Space>
          </Space>
        </section>

        <Divider style={{ margin: '12px 0' }} />

        {/* 文字预览 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            文字层次
          </Text>
          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 8,
            }}
          >
            <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
              主要标题文字
            </Title>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              这是正文文字内容，展示当前主题下主要文字颜色的显示效果。
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              这是次要文字内容，用于描述、提示等辅助信息。
            </Text>
            <Text type="success">成功状态文字</Text>
            {' · '}
            <Text type="warning">警告状态文字</Text>
            {' · '}
            <Text type="danger">错误状态文字</Text>
          </div>
        </section>

        <Divider style={{ margin: '12px 0' }} />

        {/* 消息提示预览 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            消息提示
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="成功提示"
              description="操作已成功完成。"
              type="success"
              showIcon
              closable
            />
            <Alert
              message="警告提示"
              description="请注意检查相关信息。"
              type="warning"
              showIcon
              closable
            />
            <Alert
              message="错误提示"
              description="发生错误，请稍后重试。"
              type="error"
              showIcon
              closable
            />
            <Alert
              message="信息提示"
              description="这是一条普通信息。"
              type="info"
              showIcon
              closable
            />
          </Space>
        </section>

        <Divider style={{ margin: '12px 0' }} />

        {/* 状态图标预览 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            状态图标
          </Text>
          <Space size={24}>
            <Space direction="vertical" align="center">
              <CheckCircleOutlined
                style={{
                  fontSize: 24,
                  color: 'var(--color-success)',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>成功</Text>
            </Space>
            <Space direction="vertical" align="center">
              <ExclamationCircleOutlined
                style={{
                  fontSize: 24,
                  color: 'var(--color-warning)',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>警告</Text>
            </Space>
            <Space direction="vertical" align="center">
              <CloseCircleOutlined
                style={{
                  fontSize: 24,
                  color: 'var(--color-error)',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>错误</Text>
            </Space>
            <Space direction="vertical" align="center">
              <InfoCircleOutlined
                style={{
                  fontSize: 24,
                  color: 'var(--color-info)',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>信息</Text>
            </Space>
          </Space>
        </section>

        <Divider style={{ margin: '12px 0' }} />

        {/* 当前颜色摘要 */}
        <section>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            当前主色
          </Text>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: '主色', value: currentColors['--color-primary'] },
              { label: '背景', value: currentColors['--color-bg-primary'] },
              { label: '文字', value: currentColors['--color-text-primary'] },
              { label: '成功', value: currentColors['--color-success'] },
              { label: '警告', value: currentColors['--color-warning'] },
              { label: '错误', value: currentColors['--color-error'] },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    backgroundColor: item.value,
                    border: '1px solid var(--color-border)',
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace' }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Space>
    </Card>
  )
}

export default ThemePreview

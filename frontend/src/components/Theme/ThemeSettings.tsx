import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Modal,
  Input,
  Popconfirm,
  message,
  Divider,
} from 'antd'
import {
  SaveOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  SkinOutlined,
  FileAddOutlined,
} from '@ant-design/icons'
import { useThemeStore, type CustomTheme } from '../../stores/theme'
import { presetThemes } from '../../constants/themes'
import PresetThemeCard from './PresetThemeCard'
import ColorVariableEditor from './ColorVariableEditor'
import ThemePreview from './ThemePreview'
import HistoryControls from './HistoryControls'
import ContrastWarning, { ContrastDetails } from './ContrastWarning'

const { Title, Text } = Typography

const ThemeSettings: React.FC = () => {
  const {
    currentThemeId,
    isCustom,
    customThemes,
    setThemeByPreset,
    saveCustomTheme,
    deleteCustomTheme,
    loadCustomTheme,
    resetToDefault,
    canUndo,
    applyThemeToDom,
  } = useThemeStore()

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [customThemeName, setCustomThemeName] = useState('')
  const [editingCustomTheme, setEditingCustomTheme] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 初始化时应用主题
  useEffect(() => {
    applyThemeToDom()
  }, [])

  // 判断屏幕尺寸
  const isMobile = windowWidth < 768

  // 处理保存自定义方案
  const handleSaveCustomTheme = () => {
    if (!customThemeName.trim()) {
      message.warning('请输入方案名称')
      return
    }
    saveCustomTheme(customThemeName.trim())
    message.success('自定义方案保存成功')
    setIsSaveModalOpen(false)
    setCustomThemeName('')
  }

  // 处理删除自定义方案
  const handleDeleteCustomTheme = (id: string) => {
    deleteCustomTheme(id)
    message.success('方案已删除')
  }

  // 处理重命名自定义方案
  const handleRenameCustomTheme = (_theme: CustomTheme) => {
    if (!editName.trim()) {
      setEditingCustomTheme(null)
      return
    }
    // 更新自定义方案名称（需要修改 store 来支持更新）
    // 暂时先取消编辑状态
    setEditingCustomTheme(null)
    message.info('重命名功能需要扩展 Store')
  }

  // 处理重置默认
  const handleResetToDefault = () => {
    resetToDefault()
    message.success('已恢复默认配色')
  }

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* 顶部工具栏 */}
      <Card style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Space>
              <HistoryControls />
            </Space>
          </Col>
          <Col xs={24} sm={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <Space wrap>
              <Button
                icon={<SaveOutlined />}
                onClick={() => setIsSaveModalOpen(true)}
                disabled={!isCustom && !canUndo()}
              >
                保存方案
              </Button>
              <Popconfirm
                title="恢复默认配色"
                description="确定要恢复默认配色吗？这将清除所有自定义设置。"
                onConfirm={handleResetToDefault}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<ReloadOutlined />}>恢复默认</Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 预设配色方案 */}
      <section style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          <SkinOutlined style={{ marginRight: 8 }} />
          预设配色方案
        </Title>
        <Row gutter={[16, 16]}>
          {presetThemes.map((theme) => (
            <Col key={theme.id} xs={24} sm={12} lg={6}>
              <PresetThemeCard
                theme={theme}
                isSelected={currentThemeId === theme.id && !isCustom}
                onClick={() => setThemeByPreset(theme.id)}
              />
            </Col>
          ))}
        </Row>
      </section>

      {/* 自定义方案 */}
      {customThemes.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            <FileAddOutlined style={{ marginRight: 8 }} />
            我的自定义方案
          </Title>
          <Row gutter={[16, 16]}>
            {customThemes.map((theme) => (
              <Col key={theme.id} xs={24} sm={12} lg={6}>
                <Card
                  hoverable
                  onClick={() => loadCustomTheme(theme.id)}
                  style={{
                    borderRadius: 12,
                    border:
                      currentThemeId === 'custom' && isCustom
                        ? '2px solid var(--color-primary)'
                        : '1px solid var(--color-border)',
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {editingCustomTheme === theme.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onPressEnter={() => handleRenameCustomTheme(theme)}
                        onBlur={() => handleRenameCustomTheme(theme)}
                        autoFocus
                        size="small"
                        style={{ width: 120 }}
                      />
                    ) : (
                      <div>
                        <Text strong style={{ fontSize: 16 }}>
                          {theme.name}
                        </Text>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {new Date(theme.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    )}
                    <Space size={4}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCustomTheme(theme.id)
                          setEditName(theme.name)
                        }}
                      />
                      <Popconfirm
                        title="删除方案"
                        description="确定要删除这个自定义方案吗？"
                        onConfirm={(e) => {
                          e?.stopPropagation()
                          handleDeleteCustomTheme(theme.id)
                        }}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Space>
                  </div>

                  {/* 颜色预览 */}
                  <div style={{ display: 'flex', gap: 0, marginTop: 12, borderRadius: 4, overflow: 'hidden' }}>
                    {Object.values(theme.colors)
                      .slice(0, 5)
                      .map((color, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            height: 24,
                            minWidth: 0,
                            backgroundColor: color,
                            border: '1px solid var(--color-border-light)',
                            borderLeftWidth: idx === 0 ? 1 : 0,
                            marginLeft: idx === 0 ? 0 : -1,
                          }}
                        />
                      ))}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      )}

      <Divider />

      {/* 可访问性警告 */}
      <ContrastWarning />
      <ContrastDetails />

      <Divider />

      {/* 自定义颜色和预览 */}
      <Row gutter={[24, 24]}>
        {/* 颜色编辑区域 */}
        <Col xs={24} lg={12}>
          <ColorVariableEditor />
        </Col>

        {/* 实时预览区域 */}
        <Col xs={24} lg={12}>
          <ThemePreview />
        </Col>
      </Row>

      {/* 保存方案模态框 */}
      <Modal
        title="保存自定义配色方案"
        open={isSaveModalOpen}
        onOk={handleSaveCustomTheme}
        onCancel={() => {
          setIsSaveModalOpen(false)
          setCustomThemeName('')
        }}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>为您的自定义配色方案命名：</Text>
          <Input
            placeholder="例如：我的专属配色"
            value={customThemeName}
            onChange={(e) => setCustomThemeName(e.target.value)}
            onPressEnter={handleSaveCustomTheme}
            maxLength={20}
            showCount
          />
          {customThemes.length >= 10 && (
            <Text type="warning" style={{ fontSize: 12 }}>
              注意：您已保存10个自定义方案，保存新方案将删除最早的一个。
            </Text>
          )}
        </Space>
      </Modal>
    </div>
  )
}

export default ThemeSettings

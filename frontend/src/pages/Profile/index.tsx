import React, { useState, useEffect } from 'react'
import {
  Card,
  Avatar,
  Form,
  Input,
  Button,
  Row,
  Col,
  Statistic,
  Tag,
  Divider,
  message,
  Spin,
  Descriptions,
  Modal
} from 'antd'
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  MailOutlined,
  CalendarOutlined,
  LoginOutlined,
  IdcardOutlined,
  SafetyOutlined
} from '@ant-design/icons'
import { userService, UserProfile } from '../../services/user'
import dayjs from 'dayjs'
import './index.css'

/**
 * 格式化 UTC 时间为本地时间
 * 后端返回的是 UTC 时间字符串，需要转换为本地时区显示
 */
const formatUTCToLocal = (utcString: string | null | undefined): string => {
  if (!utcString) return '-'
  // 先解析为 UTC 时间，然后转换为本地时间
  const utcDate = new Date(utcString + 'Z')  // 确保被解析为 UTC
  return dayjs(utcDate).format('YYYY-MM-DD HH:mm')
}

const Profile: React.FC = () => {
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // 获取用户资料
  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await userService.getUserProfile()
      setProfile(data)
      form.setFieldsValue({
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        bio: data.bio
      })
    } catch (error) {
      message.error('获取用户资料失败')
      // 无数据时进入编辑模式，允许用户创建资料
      setProfile(null)
      setIsEditing(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  // 进入编辑模式
  const handleEdit = () => {
    setIsEditing(true)
  }

  // 取消编辑
  const handleCancel = () => {
    setIsEditing(false)
    // 重置表单数据
    if (profile) {
      form.setFieldsValue({
        username: profile.username,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        bio: profile.bio
      })
    }
  }

  // 保存修改
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const updatedProfile = await userService.updateUserProfile(values)
      setProfile(updatedProfile)
      setIsEditing(false)
      message.success(profile ? '个人资料更新成功' : '个人资料创建成功')
    } catch (error) {
      message.error(profile ? '更新失败，请重试' : '创建失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 打开修改密码弹窗
  const showPasswordModal = () => {
    setPasswordModalVisible(true)
    passwordForm.resetFields()
  }

  // 关闭修改密码弹窗
  const closePasswordModal = () => {
    setPasswordModalVisible(false)
    passwordForm.resetFields()
  }

  // 提交修改密码
  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields()
      setChangingPassword(true)
      await userService.changePassword(values.currentPassword, values.newPassword)
      message.success('密码修改成功')
      setPasswordModalVisible(false)
      passwordForm.resetFields()
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail)
      } else {
        message.error('密码修改失败，请检查当前密码是否正确')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // 获取角色标签颜色
  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      admin: 'red',
      teacher: 'blue'
    }
    return colorMap[role] || 'blue'
  }

  // 获取角色显示文本
  const getRoleText = (role: string) => {
    const textMap: Record<string, string> = {
      admin: '管理员',
      teacher: '教师'
    }
    return textMap[role] || '教师'
  }

  // 获取状态标签
  const getStatusTag = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Tag color="red">已禁用</Tag>
    }
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '活跃' },
      inactive: { color: 'default', text: '未激活' },
      suspended: { color: 'warning', text: '已暂停' },
      pending: { color: 'processing', text: '待审核' }
    }
    const config = statusMap[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <Spin size="large" />
      </div>
    )
  }

  // 无数据时显示创建/编辑表单
  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-title">完善个人资料</h1>
          <p className="profile-subtitle">请填写您的个人信息以完成资料设置</p>
        </div>

        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} lg={16}>
            <Card
              className="profile-card profile-detail-card"
              title={
                <div className="profile-card-title">
                  <IdcardOutlined />
                  <span>创建个人资料</span>
                </div>
              }
            >
              <Form
                form={form}
                layout="vertical"
                className="profile-form"
              >
                <Row gutter={24}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, message: '用户名至少3个字符' },
                        { max: 50, message: '用户名最多50个字符' }
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="请输入用户名"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label="邮箱地址"
                      rules={[
                        { required: true, message: '请输入邮箱地址' },
                        { type: 'email', message: '请输入有效的邮箱地址' }
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined />}
                        placeholder="请输入邮箱地址"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="full_name"
                      label="真实姓名"
                      rules={[
                        { max: 100, message: '真实姓名最多100个字符' }
                      ]}
                    >
                      <Input placeholder="请输入真实姓名" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label="手机号码"
                      rules={[
                        { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                      ]}
                    >
                      <Input placeholder="请输入手机号码" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="bio"
                  label="个人简介"
                  rules={[
                    { max: 500, message: '个人简介最多500个字符' }
                  ]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="介绍一下自己..."
                    showCount
                    maxLength={500}
                  />
                </Form.Item>

                <Form.Item>
                  <div className="profile-edit-actions" style={{ justifyContent: 'center', marginTop: 24 }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={handleSave}
                      size="large"
                      style={{ minWidth: 120 }}
                    >
                      保存资料
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">个人资料</h1>
        <p className="profile-subtitle">管理您的个人信息和账户设置</p>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：头像和基本信息 */}
        <Col xs={24} lg={8}>
          <Card className="profile-card profile-info-card">
            <div className="profile-avatar-section">
              <Avatar
                size={120}
                icon={<UserOutlined />}
                src={profile.avatar_url}
                className="profile-avatar"
              />
              <h2 className="profile-name">
                {profile.full_name || profile.username}
              </h2>
              <Tag color={getRoleColor(profile.role)} className="profile-role-tag">
                {getRoleText(profile.role)}
              </Tag>
              <p className="profile-bio-preview">
                {profile.bio || '暂无个人简介'}
              </p>
            </div>

            <Divider />

            <div className="profile-stats">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="登录次数"
                    value={profile.login_count}
                    prefix={<LoginOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="账户状态"
                    value={profile.is_verified ? '已验证' : '未验证'}
                    valueStyle={{
                      color: profile.is_verified ? '#52c41a' : '#faad14',
                      fontSize: '16px'
                    }}
                    prefix={<SafetyOutlined />}
                  />
                </Col>
              </Row>
            </div>
          </Card>

          <Card className="profile-card profile-meta-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="用户ID">
                <span className="profile-id">{profile.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {formatUTCToLocal(profile.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {profile.last_login_at
                  ? formatUTCToLocal(profile.last_login_at)
                  : '从未登录'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(profile.status, profile.is_active)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 右侧：详细信息表单 */}
        <Col xs={24} lg={16}>
          <Card
            className="profile-card profile-detail-card"
            title={
              <div className="profile-card-title">
                <IdcardOutlined />
                <span>详细信息</span>
              </div>
            }
            extra={
              !isEditing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  编辑资料
                </Button>
              ) : (
                <div className="profile-edit-actions">
                  <Button
                    icon={<CloseOutlined />}
                    onClick={handleCancel}
                    style={{ marginRight: 8 }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </div>
              )
            }
          >
            <Form
              form={form}
              layout="vertical"
              className="profile-form"
              disabled={!isEditing}
            >
              <Row gutter={24}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 3, message: '用户名至少3个字符' },
                      { max: 50, message: '用户名最多50个字符' }
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="请输入用户名"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    label="邮箱地址"
                    rules={[
                      { required: true, message: '请输入邮箱地址' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="请输入邮箱地址"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="full_name"
                    label="真实姓名"
                    rules={[
                      { max: 100, message: '真实姓名最多100个字符' }
                    ]}
                  >
                    <Input placeholder="请输入真实姓名" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    label="手机号码"
                    rules={[
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                    ]}
                  >
                    <Input placeholder="请输入手机号码" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="bio"
                label="个人简介"
                rules={[
                  { max: 500, message: '个人简介最多500个字符' }
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="介绍一下自己..."
                  showCount
                  maxLength={500}
                />
              </Form.Item>

              {!isEditing && (
                <div className="profile-readonly-hint">
                  <CalendarOutlined />
                  <span>
                    上次更新：{formatUTCToLocal(profile.updated_at)}
                  </span>
                </div>
              )}
            </Form>
          </Card>

          {/* 安全设置卡片 */}
          <Card
            className="profile-card profile-security-card"
            title={
              <div className="profile-card-title">
                <SafetyOutlined />
                <span>安全设置</span>
              </div>
            }
          >
            <div className="profile-security-item">
              <div className="security-item-info">
                <h4>修改密码</h4>
                <p>定期更换密码可以保护您的账户安全</p>
              </div>
              <Button type="default" onClick={showPasswordModal}>修改密码</Button>
            </div>
            <Divider />
            <div className="profile-security-item">
              <div className="security-item-info">
                <h4>邮箱验证</h4>
                <p>
                  {profile.is_verified
                    ? '您的邮箱已通过验证'
                    : '验证邮箱可以提高账户安全性'}
                </p>
              </div>
              <Button type="default" disabled={profile.is_verified}>
                {profile.is_verified ? '已验证' : '去验证'}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={handleChangePassword}
        onCancel={closePasswordModal}
        confirmLoading={changingPassword}
        okText="确认修改"
        cancelText="取消"
      >
        <Form
          form={passwordForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                }
              })
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Profile

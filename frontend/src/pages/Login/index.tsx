import React, { useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, message } from 'antd'
import { UserOutlined, LockOutlined, BookOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import { authService } from '../../services/auth'
import './index.css'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [resetVisible, setResetVisible] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { setUser } = useUserStore()
  const [resetForm] = Form.useForm()

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true)
      const response = await authService.login(values)
      login(response.access_token, response.refresh_token)
      setUser(response.user)
      message.success('欢迎回来')
      navigate('/')
    } catch {
      message.error('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: <BookOutlined />, text: '智能备课辅助' },
    { icon: <TeamOutlined />, text: '学生成长档案' },
    { icon: <RocketOutlined />, text: '教学数据分析' },
  ]

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields()
      setResetLoading(true)
      await authService.resetPassword({
        username: values.username,
        new_password: values.new_password,
      })
      message.success('密码已重置，请使用新密码登录')
      setResetVisible(false)
      resetForm.resetFields()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.message || '密码重置失败')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h1 className="brand-title">AI教学平台</h1>
            <p className="brand-subtitle">
              面向教学场景的管理平台，聚焦课程、学生、资源与教案的真实使用流程。
            </p>
            <div className="brand-features">
              {features.map((feature, index) => (
                <div key={index} className="brand-feature">
                  <div className="brand-feature-icon">{feature.icon}</div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="login-form-section">
          <div className="form-header">
            <h2 className="form-title">登录</h2>
            <p className="form-subtitle">输入账号信息以继续使用平台</p>
          </div>

          <Form name="login" className="login-form" initialValues={{ remember: true }} onFinish={onFinish}>
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
            </Form.Item>

            <div className="form-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="form-remember">记住我</Checkbox>
              </Form.Item>
              <a
                className="form-forgot"
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  setResetVisible(true)
                }}
              >
                重置密码
              </a>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-button" loading={loading} size="large">
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="form-footer">
            <div className="form-register">
              <span>还没有账号？</span>
              <Link to="/register" className="register-link">
                立即注册
              </Link>
            </div>
            <p>© 2026 AI教学平台</p>
          </div>
        </div>
      </div>

      <Modal
        title="重置密码"
        open={resetVisible}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetVisible(false)
          resetForm.resetFields()
        }}
        confirmLoading={resetLoading}
        okText="确认重置"
        cancelText="取消"
      >
        <Form form={resetForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="用户名或邮箱"
            rules={[{ required: true, message: '请输入用户名或邮箱' }]}
          >
            <Input placeholder="请输入用户名或邮箱" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8位' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                message: '需包含大写字母、小写字母和数字',
              },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Login

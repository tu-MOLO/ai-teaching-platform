import React, { useState } from 'react'
import { Button, Checkbox, Form, Input, message } from 'antd'
import { UserOutlined, LockOutlined, BookOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import { authService } from '../../services/auth'
import './index.css'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { setUser } = useUserStore()

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true)
      const response = await authService.login(values)
      login(response.access_token, response.refresh_token)
      setUser(response.user)
      message.success('欢迎回来！')
      navigate('/')
    } catch (error) {
      message.error('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: <BookOutlined />, text: '智能备课助手' },
    { icon: <TeamOutlined />, text: '学生成长档案' },
    { icon: <RocketOutlined />, text: 'AI 教学辅助' },
  ]

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* 左侧品牌区域 */}
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
              专为特殊教育设计的智能化教学管理系统，让每一堂课都更有温度
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

        {/* 右侧表单区域 */}
        <div className="login-form-section">
          <div className="form-header">
            <h2 className="form-title">欢迎登录</h2>
            <p className="form-subtitle">请输入您的账号信息以继续</p>
          </div>

          <Form
            name="login"
            className="login-form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <div className="form-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="form-remember">记住我</Checkbox>
              </Form.Item>
              <a className="form-forgot" href="#" onClick={(e) => { e.preventDefault(); message.info('密码重置功能开发中，请联系管理员'); }}>
                忘记密码？
              </a>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-button"
                loading={loading}
                size="large"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="form-footer">
            <div className="form-register">
              <span>还没有账号？</span>
              <Link to="/register" className="register-link">立即注册</Link>
            </div>
            <p>© 2026 AI教学平台 · 让教育更智能</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

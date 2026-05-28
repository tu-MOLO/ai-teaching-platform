import React, { useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, message } from 'antd'
import { UserOutlined, LockOutlined, BookOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import { authService } from '../../services/auth'
import { BusinessError } from '../../types/error'
import './index.css'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [resetVisible, setResetVisible] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetStep, setResetStep] = useState(1)
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [getQuestionLoading, setGetQuestionLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { setUser } = useUserStore()
  const [resetForm] = Form.useForm()

  const onFinish = async (values: { username: string; password: string; remember?: boolean }) => {
    try {
      setLoading(true)
      const response = await authService.login({
        username: values.username,
        password: values.password,
        remember_me: values.remember ?? true,
      })
      login(response.access_token)
      setUser(response.user)
      message.success('欢迎回来')
      navigate('/')
    } catch (error: unknown) {
      const businessError = error as BusinessError
      const code = businessError?.code
      if (code === '2006') {
        message.error('账户已被锁定，请稍后再试')
      } else if (code === '2007') {
        message.error('账户已被禁用，请联系管理员')
      } else if (code === '3002' || code === '2000') {
        message.error('用户名或密码错误')
      } else {
        message.error('登录失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: <BookOutlined />, text: '智能备课辅助' },
    { icon: <TeamOutlined />, text: '学生成长档案' },
    { icon: <RocketOutlined />, text: '教学数据分析' },
  ]

  const [isLegacy, setIsLegacy] = useState(false)

  const handleGetSecurityQuestion = async () => {
    try {
      const values = await resetForm.validateFields(['username'])
      setGetQuestionLoading(true)
      const response = await authService.getSecurityQuestion({ username: values.username })
      setSecurityQuestion(response.security_question)
      setIsLegacy(response.is_legacy)
      setResetStep(2)
      if (response.is_legacy) {
        message.warning('该账户未设置密保问题，无法通过密保重置密码，请联系管理员')
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.message || '获取密保问题失败')
    } finally {
      setGetQuestionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields(['security_answer', 'new_password', 'confirm_password'])
      setResetLoading(true)
      await authService.resetPassword({
        username: resetForm.getFieldValue('username'),
        security_answer: values.security_answer,
        new_password: values.new_password,
      })
      message.success('密码重置成功')
      handleResetModalClose()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.message || '密码重置失败')
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetModalClose = () => {
    setResetVisible(false)
    setResetStep(1)
    setSecurityQuestion('')
    setIsLegacy(false)
    resetForm.resetFields()
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
        title={`重置密码 - 步骤${resetStep}/2`}
        open={resetVisible}
        destroyOnClose
        onCancel={handleResetModalClose}
        footer={
          resetStep === 1
            ? [
                <Button key="cancel" onClick={handleResetModalClose}>
                  取消
                </Button>,
                <Button key="next" type="primary" loading={getQuestionLoading} onClick={handleGetSecurityQuestion}>
                  获取密保问题
                </Button>,
              ]
            : [
                <Button key="back" onClick={() => { setResetStep(1); setIsLegacy(false) }}>
                  返回
                </Button>,
                <Button key="cancel" onClick={handleResetModalClose}>
                  取消
                </Button>,
                ...(!isLegacy ? [
                  <Button key="submit" type="primary" loading={resetLoading} onClick={handleResetPassword}>
                    重置密码
                  </Button>,
                ] : []),
              ]
        }
      >
        <Form
          form={resetForm}
          layout="vertical"
          preserve={false}
          style={{ marginTop: 16 }}
        >
          {resetStep === 1 && (
            <Form.Item
              name="username"
              label="用户名或邮箱"
              rules={[{ required: true, message: '请输入用户名或邮箱' }]}
            >
              <Input placeholder="请输入用户名或邮箱" />
            </Form.Item>
          )}
          {resetStep === 2 && (
            <>
              <Form.Item label="密保问题">
                <Input value={securityQuestion} readOnly />
              </Form.Item>
              {isLegacy ? (
                <div style={{ color: '#faad14', marginBottom: 16 }}>
                  该账户未设置密保问题，无法通过密保重置密码，请联系管理员重置。
                </div>
              ) : (
                <>
                  <Form.Item
                    name="security_answer"
                    label="密保答案"
                    rules={[{ required: true, message: '请输入密保答案' }]}
                  >
                    <Input placeholder="请输入密保答案" />
                  </Form.Item>
                  <Form.Item
                    name="new_password"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 8, message: '密码至少8位' },
                      {
                        pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                        message: '需同时包含字母和数字',
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
                </>
              )}
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default Login

import React, { useState } from 'react'
import { Button, Form, Input, Select, message, Typography } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../../services/auth'
import './index.css'

const { Text } = Typography

const SECURITY_QUESTIONS = [
  "您的母校名称是什么？",
  "您母亲的姓名是什么？",
  "您第一只宠物的名字是什么？",
  "您出生的城市是哪里？",
  "您最喜欢的书是什么？",
]

interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  full_name?: string
  security_question: string
  security_answer: string
}

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const onFinish = async (values: RegisterFormData) => {
    try {
      setLoading(true)
      const { ...registerData } = values
      await authService.register(registerData)
      message.success('注册成功，请登录后完善个人资料')
      navigate('/login')
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || '注册失败，请稍后重试'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const validateUsername = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入用户名'))
    }
    if (value.length < 3 || value.length > 50) {
      return Promise.reject(new Error('用户名长度应为3-50个字符'))
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return Promise.reject(new Error('用户名只能包含字母、数字和下划线'))
    }
    return Promise.resolve()
  }

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入密码'))
    }
    if (value.length < 8) {
      return Promise.reject(new Error('密码长度至少为8位'))
    }
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(value)) {
      return Promise.reject(new Error('密码必须包含大写字母、小写字母和数字'))
    }
    return Promise.resolve()
  }

  const validateConfirmPassword = ({ getFieldValue }: any) => ({
    validator(_: any, value: string) {
      if (!value || getFieldValue('password') === value) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('两次输入的密码不一致'))
    },
  })

  return (
    <div className="register-container">
      <div className="register-wrapper">
        {/* 左侧品牌区域 */}
        <div className="register-brand">
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
          </div>
        </div>

        {/* 右侧表单区域 */}
        <div className="register-form-section">
          <div className="form-header">
            <Link to="/login" className="back-link">
              <ArrowLeftOutlined /> 返回登录
            </Link>
            <h2 className="form-title">创建账号</h2>
            <p className="form-subtitle">填写以下信息完成注册</p>
          </div>

          <Form
            form={form}
            name="register"
            className="register-form"
            onFinish={onFinish}
            layout="vertical"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ validator: validateUsername }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名（3-50个字符，支持字母、数字、下划线）"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱地址"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱地址"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="full_name"
              label="真实姓名"
              rules={[{ max: 100, message: '真实姓名不能超过100个字符' }]}
            >
              <Input
                prefix={<IdcardOutlined />}
                placeholder="请输入真实姓名（可选）"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ validator: validatePassword }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码（至少8位，包含大写字母、小写字母和数字）"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                validateConfirmPassword,
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="security_question"
              label="密保问题"
              rules={[{ required: true, message: '请选择密保问题' }]}
            >
              <Select
                placeholder="请选择密保问题"
                size="large"
                options={SECURITY_QUESTIONS.map(q => ({ label: q, value: q }))}
              />
            </Form.Item>

            <Form.Item
              name="security_answer"
              label="密保答案"
              rules={[{ required: true, message: '请输入密保答案' }]}
            >
              <Input
                placeholder="请输入密保答案"
                maxLength={100}
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="register-button"
                loading={loading}
                size="large"
                block
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          <div className="form-footer">
            <Text type="secondary">
              注册后可在个人设置中补充资料与邮箱信息。
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register

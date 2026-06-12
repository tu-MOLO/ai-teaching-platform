import type { APIRequestContext } from '@playwright/test'

interface TestUserCredentials {
  username: string
  email: string
  password: string
}

interface LoginResponse {
  token: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    refresh_expires_in: number
  }
  user: Record<string, unknown>
}

interface UnwrappedLoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Create a test user via the register API.
 * Returns credentials and access token.
 */
export async function createTestUser(
  request: APIRequestContext,
  overrides?: Partial<TestUserCredentials>,
): Promise<{ credentials: TestUserCredentials; token: string }> {
  const uuid = generateUUID()
  const credentials: TestUserCredentials = {
    username: overrides?.username || `e2e-${uuid.slice(0, 8)}`,
    email: overrides?.email || `e2e-${uuid}@test.com`,
    password: overrides?.password || 'Test@123456',
  }

  // Register
  await request.post('/api/v1/auth/register', {
    data: {
      username: credentials.username,
      email: credentials.email,
      password: credentials.password,
      full_name: 'E2E Test User',
      security_question: '您的母校名称是什么？',
      security_answer: '测试答案',
    },
  })

  // Login to get token
  const loginRes = await request.post('/api/v1/auth/login', {
    data: {
      username: credentials.username,
      password: credentials.password,
    },
  })

  const loginBody = (await loginRes.json()) as LoginResponse | UnwrappedLoginResponse

  // The backend interceptor unwraps `data` — try both shapes
  let token: string
  if ('token' in loginBody && loginBody.token) {
    token = loginBody.token.access_token
  } else if ('access_token' in loginBody) {
    token = (loginBody as UnwrappedLoginResponse).access_token
  } else {
    token = ''
  }

  return { credentials, token }
}

/**
 * Log in via API and return the access token.
 */
export async function loginViaApi(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const loginRes = await request.post('/api/v1/auth/login', {
    data: { username, password },
  })

  const loginBody = (await loginRes.json()) as LoginResponse | UnwrappedLoginResponse

  if ('token' in loginBody && loginBody.token) {
    return loginBody.token.access_token
  }
  if ('access_token' in loginBody) {
    return (loginBody as UnwrappedLoginResponse).access_token
  }

  return ''
}

/**
 * Create a course via API.
 */
export async function createCourse(
  request: APIRequestContext,
  token: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  const res = await request.post('/api/v1/courses', {
    headers: { Authorization: `Bearer ${token}` },
    data,
  })
  return res.json()
}

/**
 * Create a student for a course via API.
 */
export async function createStudent(
  request: APIRequestContext,
  token: string,
  courseId: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  const res = await request.post(`/api/v1/courses/${courseId}/students`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  })
  return res.json()
}

/**
 * Attempt to clean up test data.
 * Try DELETE calls where applicable; silently ignore failures.
 */
export async function cleanupTestData(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const endpoints = [
    '/api/v1/courses',
    '/api/v1/auth/logout',
  ]

  for (const endpoint of endpoints) {
    try {
      await request.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Ignore cleanup failures — test data may not exist
    }
  }
}
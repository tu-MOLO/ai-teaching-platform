import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import router from './router/index'
import { initTheme } from './stores/theme'
import { useAuthStore } from './stores/auth'
import { useUserStore } from './stores/user'
import { authService } from './services/auth'

function App() {
  useEffect(() => {
    initTheme()
    const bootstrap = async () => {
      await useAuthStore.getState().hydrate()
      // 刷新后补全当前用户信息（含头像），避免头部退化为默认占位
      if (useAuthStore.getState().isAuthenticated) {
        try {
          const profile = await authService.getProfile()
          useUserStore.getState().setUser(profile)
        } catch {
          // 会话失效时静默忽略，交由路由守卫处理
        }
      }
    }
    void bootstrap()
  }, [])

  const element = useRoutes(router)
  return element
}

export default App

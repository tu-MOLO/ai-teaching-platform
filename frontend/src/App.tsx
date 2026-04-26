import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import router from './router/index'
import { initTheme } from './stores/theme'

function App() {
  // 初始化主题
  useEffect(() => {
    initTheme()
  }, [])

  const element = useRoutes(router)
  return element
}

export default App

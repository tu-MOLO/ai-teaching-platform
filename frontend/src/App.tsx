import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import router from './router/index'
import { initTheme } from './stores/theme'
import { useAuthStore } from './stores/auth'

function App() {
  useEffect(() => {
    initTheme()
    useAuthStore.getState().hydrate()
  }, [])

  const element = useRoutes(router)
  return element
}

export default App

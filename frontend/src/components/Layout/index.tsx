import React, { useState, useEffect } from 'react'
import { Layout as AntLayout, Drawer } from 'antd'
import Sidebar from '../Sidebar'
import Header from '../Header'
import { Outlet } from 'react-router-dom'
import { useDashboardStore } from '../../stores/dashboard'
import './index.css'

const { Content } = AntLayout

const MOBILE_BREAKPOINT = 768

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileVisible, setMobileVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const startAutoRefresh = useDashboardStore((s) => s.startAutoRefresh)
  const stopAutoRefresh = useDashboardStore((s) => s.stopAutoRefresh)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    startAutoRefresh()
    return () => {
      stopAutoRefresh()
    }
  }, [startAutoRefresh, stopAutoRefresh])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startAutoRefresh()
      } else {
        stopAutoRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [startAutoRefresh, stopAutoRefresh])

  return (
    <AntLayout className="layout">
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      )}
      
      {/* 移动端抽屉侧边栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setMobileVisible(false)}
          open={mobileVisible}
          width={240}
          styles={{ body: { padding: 0 } }}
          className="mobile-sidebar-drawer"
        >
          <Sidebar mobile onClose={() => setMobileVisible(false)} />
        </Drawer>
      )}

      <AntLayout className={`layout-content ${!isMobile && collapsed ? 'layout-content-collapsed' : ''}`}>
        <Header onMenuClick={() => setMobileVisible(true)} isMobile={isMobile} />
        <Content className="content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout

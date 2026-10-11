import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/Common/ErrorBoundary.tsx'
import { App as AntApp } from 'antd'
import { MessageBridge } from './utils/feedback'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AntApp>
        <MessageBridge />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AntApp>
    </BrowserRouter>
  </React.StrictMode>,
)

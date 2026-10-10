import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setupInterceptors } from '@/services/api/interceptors'

// Initialize API interceptors (auth token injection, error toasts, logging)
setupInterceptors()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import { App as CapacitorApp } from '@capacitor/app'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Аппаратная «назад» на Android: идём назад по истории SPA, а из корня —
// выходим из приложения (по умолчанию Capacitor закрывает его сразу).
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) window.history.back()
  else CapacitorApp.exitApp()
}).catch(() => {})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

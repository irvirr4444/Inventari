import { bootstrapMobileClient } from './lib/mobileBootstrap'
import { installPointerDismissGuard } from './lib/pointerDismissGuard'
import { isCapacitorNativeApp } from './lib/capacitorClient'

bootstrapMobileClient()
installPointerDismissGuard()

if (isCapacitorNativeApp()) {
  void import('./pages/LoginPage')
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from './providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

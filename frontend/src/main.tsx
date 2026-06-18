import { bootstrapMobileClient } from './lib/mobileBootstrap'

bootstrapMobileClient()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CountryProvider } from './lib/country'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CountryProvider>
        <App />
      </CountryProvider>
    </QueryClientProvider>
  </StrictMode>,
)

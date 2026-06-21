import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../lib/auth/AuthProvider'
import { CountryProvider } from '../lib/country'
import { LokacioniProvider } from '../lib/lokacioni/LokacioniProvider'
import { TenantConfigProvider } from '../hooks/useTenantConfig'
import { useAuth } from '../lib/auth/AuthProvider'

function ConditionalProviders(props: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (user && !user.isLegacy) {
    return (
      <LokacioniProvider>
        <TenantConfigProvider>{props.children}</TenantConfigProvider>
      </LokacioniProvider>
    )
  }

  return <CountryProvider>{props.children}</CountryProvider>
}

const queryClient = new QueryClient()

export function AppProviders(props: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConditionalProviders>{props.children}</ConditionalProviders>
      </AuthProvider>
    </QueryClientProvider>
  )
}

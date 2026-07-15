import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../lib/auth/AuthProvider'
import { CountryProvider } from '../lib/country'
import { LokacioniProvider } from '../lib/lokacioni/LokacioniProvider'
import { TenantConfigProvider } from '../hooks/useTenantConfig'
import { useAuth } from '../lib/auth/AuthProvider'

function ConditionalProviders(props: { children: React.ReactNode }) {
  const { user } = useAuth()

  const inner =
    user && !user.isLegacy ? (
      <TenantConfigProvider>{props.children}</TenantConfigProvider>
    ) : (
      <CountryProvider>{props.children}</CountryProvider>
    )

  return <LokacioniProvider>{inner}</LokacioniProvider>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function AppProviders(props: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConditionalProviders>{props.children}</ConditionalProviders>
      </AuthProvider>
    </QueryClientProvider>
  )
}

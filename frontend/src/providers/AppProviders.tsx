import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../lib/auth/AuthProvider'
import { CountryProvider } from '../lib/country'
import { LokacioniProvider } from '../lib/lokacioni/LokacioniProvider'
import { useAuth } from '../lib/auth/AuthProvider'

function ConditionalProviders(props: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <CountryProvider>
      {user && !user.isLegacy ? (
        <LokacioniProvider>{props.children}</LokacioniProvider>
      ) : (
        props.children
      )}
    </CountryProvider>
  )
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

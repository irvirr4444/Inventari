import * as React from 'react'
import type { TenantConfig } from '@inventari/shared'
import { useAuth } from '../auth/AuthProvider'
import { DEFAULT_TENANT_CONFIG } from '../auth/types'

type TenantConfigContextValue = {
  config: TenantConfig
  trackPrice: boolean
}

const TenantConfigContext = React.createContext<TenantConfigContextValue | null>(null)

export function TenantConfigProvider(props: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (!user || user.isLegacy) {
    return <>{props.children}</>
  }

  const config = user.tenantConfig ?? DEFAULT_TENANT_CONFIG
  const value = React.useMemo(
    () => ({
      config,
      trackPrice: config.track_price,
    }),
    [config],
  )

  return (
    <TenantConfigContext.Provider value={value}>{props.children}</TenantConfigContext.Provider>
  )
}

export function useTenantConfig(): TenantConfigContextValue {
  const ctx = React.useContext(TenantConfigContext)
  if (!ctx) {
    throw new Error('useTenantConfig must be used within TenantConfigProvider for dynamic users')
  }
  return ctx
}

export function useTenantConfigOptional(): TenantConfigContextValue | null {
  return React.useContext(TenantConfigContext)
}

import type { TenantConfig, TenantConfigPatch } from '@inventari/shared'
import { http } from './http'

export async function fetchTenantConfig(): Promise<TenantConfig> {
  const res = await http<{ data: TenantConfig }>(`/tenant-config`)
  return res.data
}

export async function postTenantConfig(body: { track_price: boolean }): Promise<TenantConfig> {
  const res = await http<{ data: TenantConfig }>(`/tenant-config`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateTenantConfig(patch: TenantConfigPatch): Promise<TenantConfig> {
  const res = await http<{ data: TenantConfig }>(`/tenant-config`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

export async function completeOnboarding(): Promise<TenantConfig> {
  const res = await http<{ data: TenantConfig }>(`/tenant-config/complete`, {
    method: 'POST',
  })
  return res.data
}

export async function markTutorialSeen(): Promise<TenantConfig> {
  const res = await http<{ data: TenantConfig }>(`/tenant-config/tutorial-seen`, {
    method: 'POST',
  })
  return res.data
}

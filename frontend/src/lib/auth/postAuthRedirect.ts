import type { SessionUser } from './types'
import { DEFAULT_TENANT_CONFIG } from './types'

export function getPostAuthPath(user: SessionUser): string {
  if (!user.isLegacy && !(user.tenantConfig?.onboarding_complete ?? false)) {
    return '/onboarding'
  }
  return '/'
}

export function shouldShowOnboarding(user: SessionUser): boolean {
  return !user.isLegacy && !(user.tenantConfig?.onboarding_complete ?? false)
}

export function shouldShowTutorial(user: SessionUser): boolean {
  if (user.isLegacy || !user.tenantConfig) return false
  return user.tenantConfig.onboarding_complete && !user.tenantConfig.tutorial_seen
}

export function getTenantConfigFromUser(user: SessionUser) {
  return user.tenantConfig ?? DEFAULT_TENANT_CONFIG
}

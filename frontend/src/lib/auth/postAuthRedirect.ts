import type { SessionUser } from './types'

export function getPostAuthPath(user: SessionUser): string {
  if (!user.isLegacy && !user.has_locations) return '/onboarding/locations'
  return '/'
}

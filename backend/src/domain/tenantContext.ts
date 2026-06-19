import type { SessionUser } from './user.js'

export type TenantContext = SessionUser

export function tenantContext(user: SessionUser): TenantContext {
  return user
}

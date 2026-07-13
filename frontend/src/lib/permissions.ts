import type { LokacioniAkses } from '@inventari/shared'
import type { LocationAccessEntry, SessionUser } from './auth/types'

const ACCESS_RANK: Record<LokacioniAkses, number> = {
  view: 1,
  add: 2,
  edit_delete: 3,
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === 'admin'
}

export function canViewLocation(
  user: SessionUser | null | undefined,
  locationId: string,
): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return user.locationAccess.some((entry) => entry.lokacioni_id === locationId)
}

export function hasMinimumAccess(
  user: SessionUser | null | undefined,
  locationId: string,
  minimum: LokacioniAkses,
): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  const entry = user.locationAccess.find((a) => a.lokacioni_id === locationId)
  if (!entry) return false
  return ACCESS_RANK[entry.akses] >= ACCESS_RANK[minimum]
}

export function canAddInLocation(
  user: SessionUser | null | undefined,
  locationId: string,
): boolean {
  return hasMinimumAccess(user, locationId, 'add')
}

export function canEditDeleteInLocation(
  user: SessionUser | null | undefined,
  locationId: string,
): boolean {
  return hasMinimumAccess(user, locationId, 'edit_delete')
}

export function canAddProducts(user: SessionUser | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return user.locationAccess.some((entry) => ACCESS_RANK[entry.akses] >= ACCESS_RANK.add)
}

export function canEditDeleteProducts(user: SessionUser | null | undefined): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  return user.locationAccess.some(
    (entry) => ACCESS_RANK[entry.akses] >= ACCESS_RANK.edit_delete,
  )
}

export function canEditDeleteBatch(
  user: SessionUser | null | undefined,
  lokacioniId?: string | null,
  destinationLokacioniId?: string | null,
): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (lokacioniId && !canEditDeleteInLocation(user, lokacioniId)) return false
  if (destinationLokacioniId && !canEditDeleteInLocation(user, destinationLokacioniId)) {
    return false
  }
  return Boolean(lokacioniId)
}

export function filterLocationsByMinimumAccess<T extends { id: string }>(
  user: SessionUser | null | undefined,
  locations: T[],
  minimum: LokacioniAkses,
): T[] {
  if (!user) return []
  if (isAdmin(user)) return locations
  return locations.filter((loc) => hasMinimumAccess(user, loc.id, minimum))
}

export function accessLabel(akses: LokacioniAkses): string {
  switch (akses) {
    case 'view':
      return 'Shiko'
    case 'add':
      return 'Shto'
    case 'edit_delete':
      return 'Ndrysho/Fshi'
  }
}

export function roleLabel(role: SessionUser['role']): string {
  return role === 'admin' ? 'Admin' : 'Përdorues'
}

export type { LocationAccessEntry }

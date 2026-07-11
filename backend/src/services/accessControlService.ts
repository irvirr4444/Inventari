import type { LokacioniAkses } from '@inventari/shared'
import type { LocationAccessEntry, SessionUser } from '../domain/user.js'
import { AppError } from '../errors.js'

export type AccessLevel = LokacioniAkses

const ACCESS_RANK: Record<AccessLevel, number> = {
  view: 1,
  add: 2,
  edit_delete: 3,
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === 'admin'
}

export function tenantIdFor(user: SessionUser): string {
  return user.accountOwnerId
}

export function requireAdmin(user: SessionUser): void {
  if (!isAdmin(user)) {
    throw new AppError(403, 'Admin access required')
  }
}

export function hasMinimumAccess(
  user: SessionUser,
  lokacioniId: string,
  minimum: AccessLevel,
): boolean {
  if (isAdmin(user)) return true
  const entry = user.locationAccess.find((a) => a.lokacioni_id === lokacioniId)
  if (!entry) return false
  return ACCESS_RANK[entry.akses] >= ACCESS_RANK[minimum]
}

export function requireLocationAccess(
  user: SessionUser,
  lokacioniId: string | null | undefined,
  minimum: AccessLevel,
): void {
  if (isAdmin(user)) return
  if (!lokacioniId) {
    throw new AppError(403, 'Location access required')
  }
  if (!hasMinimumAccess(user, lokacioniId, minimum)) {
    throw new AppError(403, 'Insufficient location access')
  }
}

export function listAllowedLocationIds(
  user: SessionUser,
  minimum: AccessLevel = 'view',
): string[] {
  if (isAdmin(user)) return []
  return user.locationAccess
    .filter((entry) => ACCESS_RANK[entry.akses] >= ACCESS_RANK[minimum])
    .map((entry) => entry.lokacioni_id)
}

export function canViewBatchInLocations(
  user: SessionUser,
  lokacioniId: string | null | undefined,
  destinationLokacioniId: string | null | undefined,
): boolean {
  if (isAdmin(user)) return true
  if (lokacioniId && hasMinimumAccess(user, lokacioniId, 'view')) return true
  if (destinationLokacioniId && hasMinimumAccess(user, destinationLokacioniId, 'view')) {
    return true
  }
  return false
}

export function requireBatchEditAccess(
  user: SessionUser,
  lokacioniId: string | null | undefined,
  destinationLokacioniId?: string | null,
): void {
  requireLocationAccess(user, lokacioniId, 'edit_delete')
  if (destinationLokacioniId) {
    requireLocationAccess(user, destinationLokacioniId, 'edit_delete')
  }
}

export function filterLocationIdsForUser(
  user: SessionUser,
  locationIds: string[],
  minimum: AccessLevel = 'view',
): string[] {
  if (isAdmin(user)) return locationIds
  const allowed = new Set(listAllowedLocationIds(user, minimum))
  return locationIds.filter((id) => allowed.has(id))
}

export function accessMapForUser(user: SessionUser): Map<string, AccessLevel> {
  return new Map(user.locationAccess.map((entry) => [entry.lokacioni_id, entry.akses]))
}

export function highestAccessInAnyLocation(
  user: SessionUser,
  minimum: AccessLevel,
): boolean {
  if (isAdmin(user)) return true
  return user.locationAccess.some((entry) => ACCESS_RANK[entry.akses] >= ACCESS_RANK[minimum])
}

export type { LocationAccessEntry }

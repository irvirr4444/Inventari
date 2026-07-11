import type {
  CreateManagedUserBody,
  LocationAccessEntry,
  LokacioniAkses,
  ManagedUser,
  PerdoruesRole,
  ReplaceLocationAccessBody,
  UpdateManagedUserBody,
} from '@inventari/shared'
import { http } from './http'

export type { ManagedUser, LocationAccessEntry, LokacioniAkses, PerdoruesRole }

export async function listUsers(opts?: { search?: string }): Promise<ManagedUser[]> {
  const qs = new URLSearchParams()
  if (opts?.search?.trim()) qs.set('search', opts.search.trim())
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await http<{ data: ManagedUser[] }>(`/users${suffix}`)
  return res.data
}

export async function createUser(input: CreateManagedUserBody): Promise<ManagedUser> {
  const res = await http<{ data: ManagedUser }>(`/users`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateUser(
  id: string,
  patch: UpdateManagedUserBody,
): Promise<ManagedUser> {
  const res = await http<{ data: ManagedUser }>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.data
}

export type DeleteUserResult = {
  ok: true
  deleted: boolean
}

export async function deleteUser(id: string): Promise<DeleteUserResult> {
  return http<DeleteUserResult>(`/users/${id}`, { method: 'DELETE' })
}

export async function getUserAccess(id: string): Promise<LocationAccessEntry[]> {
  const res = await http<{ location_access: LocationAccessEntry[] }>(`/users/${id}/access`)
  return res.location_access
}

export async function replaceUserAccess(
  id: string,
  body: ReplaceLocationAccessBody,
): Promise<LocationAccessEntry[]> {
  const res = await http<{ location_access: LocationAccessEntry[] }>(`/users/${id}/access`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return res.location_access
}

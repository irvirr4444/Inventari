import type { SessionUser } from '../auth/types'
import { http } from './http'

type SessionResponse =
  | { ok: false }
  | { ok: true; user: SessionUser & { has_locations: boolean } }

export async function login(input: { email: string; password: string }): Promise<void> {
  await http<{ ok: true }>(`/login`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function signup(input: {
  email: string
  password: string
  emri?: string
}): Promise<void> {
  await http<{ ok: true }>(`/auth/signup`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function loginWithGoogle(idToken: string): Promise<void> {
  await http<{ ok: true }>(`/auth/google`, {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
}

export async function logout(): Promise<void> {
  await http<{ ok: true }>(`/logout`, {
    method: 'POST',
  })
}

export async function fetchSession(): Promise<SessionResponse> {
  return http<SessionResponse>(`/session`)
}

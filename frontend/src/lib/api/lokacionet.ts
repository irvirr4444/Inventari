import type { Lokacioni } from '../lokacioni/types'
import { http } from './http'

export async function listLokacionet(opts?: {
  includeInactive?: boolean
}): Promise<Lokacioni[]> {
  const qs = opts?.includeInactive ? '?include_inactive=1' : ''
  const res = await http<{ data: Lokacioni[] }>(`/lokacionet${qs}`)
  return res.data
}

export async function createLokacioni(input: {
  emri: string
  kodi: string
  flag_emoji?: string | null
  rradhitja?: number
}): Promise<Lokacioni> {
  const res = await http<{ data: Lokacioni }>(`/lokacionet`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function patchLokacioni(
  id: string,
  patch: Partial<
    Pick<Lokacioni, 'emri' | 'kodi' | 'flag_emoji' | 'rradhitja' | 'show_in_summary' | 'aktiv'>
  >,
): Promise<{ lokacioni: Lokacioni; stock_warning?: string }> {
  return http(`/lokacionet/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

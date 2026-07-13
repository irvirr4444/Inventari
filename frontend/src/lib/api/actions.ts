import type { Country } from '../country'
import { http } from './http'

export type Veprimi = {
  id: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  data: string
  shteti: Country
  kodi_produktit: string
  cmimi_njesi: number
  sasia: number
  totali?: number
  created_at?: string
}

export async function createActionBatch(input: {
  shteti: Country
  destination_shteti?: Country
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  data?: string
  ora?: string
  pershkrimi?: string
  items: Array<{ kodi_produktit: string; cmimi_njesi: number; sasia: number; shenim?: string }>
}): Promise<{
  data: Veprimi[]
  meta?: {
    mirrored_to_albania?: boolean
    mirrored_count?: number
    transfer?: boolean
    transfer_count?: number
    transfer_from?: Country
    transfer_to?: Country
  }
}> {
  return http<{
    data: Veprimi[]
    meta?: {
      mirrored_to_albania?: boolean
      mirrored_count?: number
      transfer?: boolean
      transfer_count?: number
      transfer_from?: Country
      transfer_to?: Country
    }
  }>(`/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createDynamicActionBatch(input: {
  lokacioni_id: string
  destination_lokacioni_id?: string
  lloji: 'Hyrje' | 'Dalje' | 'Transfer'
  data?: string
  ora?: string
  pershkrimi?: string
  items: Array<{ kodi_produktit: string; cmimi_njesi: number; sasia: number; shenim?: string }>
}): Promise<{
  data: Veprimi[]
  meta?: {
    transfer?: boolean
    transfer_count?: number
  }
}> {
  return http<{
    data: Veprimi[]
    meta?: {
      transfer?: boolean
      transfer_count?: number
    }
  }>(`/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lokacioni } from './types'
import { listLokacionet } from '../api/lokacionet'
import { queryKeys } from '../queryKeys'
import { useAuth } from '../auth/AuthProvider'

type LokacioniContextValue = {
  lokacionet: Lokacioni[]
  activeLokacionet: Lokacioni[]
  loading: boolean
  refresh: () => Promise<void>
}

const LokacioniContext = React.createContext<LokacioniContextValue | null>(null)

export function LokacioniProvider(props: { children: React.ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.lokacionet(user?.id),
    queryFn: () => listLokacionet({ includeInactive: true }),
    enabled: Boolean(user && !user.isLegacy),
  })

  const lokacionet = query.data ?? []
  const activeLokacionet = lokacionet.filter((l) => l.aktiv)

  const refresh = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.lokacionet(user?.id) })
  }, [queryClient, user?.id])

  return (
    <LokacioniContext.Provider
      value={{
        lokacionet,
        activeLokacionet,
        loading: query.isLoading,
        refresh,
      }}
    >
      {props.children}
    </LokacioniContext.Provider>
  )
}

export function useLokacioni() {
  const ctx = React.useContext(LokacioniContext)
  if (!ctx) throw new Error('useLokacioni must be used within LokacioniProvider')
  return ctx
}

export function locationBadge(l: Lokacioni) {
  if (l.flag_emoji) return l.flag_emoji
  return l.kodi.slice(0, 2).toUpperCase()
}

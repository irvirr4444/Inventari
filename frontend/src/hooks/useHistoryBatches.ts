import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Country } from '../lib/country'
import {
  deleteActionBatch,
  listActionBatches,
} from '../lib/api'
import { scheduleInvalidate } from '../lib/invalidateAppData'
import { queryKeys } from '../lib/queryKeys'
import { useAuth } from '../lib/auth/AuthProvider'
import { historyListRefreshState } from './useHistoryBatchListQuery'

export type HistoryFilterState = {
  lloji?: 'Hyrje' | 'Dalje' | 'Transfer'
  shteti?: Country
  dateFrom?: string
  dateTo?: string
  shenim?: string
}

export const HISTORY_PAGE_SIZE = 8

export function useHistoryBatches(options?: {
  onNotify?: (message: string, variant?: 'success' | 'default') => void
}) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [filters, setFilters] = React.useState<HistoryFilterState>({})
  const [page, setPage] = React.useState(1)
  const [error, setError] = React.useState<string | null>(null)

  const updateFilters = (patch: Partial<HistoryFilterState>) => {
    setFilters((prev) => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') {
          delete next[key as keyof HistoryFilterState]
        } else {
          ;(next as Record<string, unknown>)[key] = value
        }
      }
      return next
    })
    setPage(1)
    setError(null)
  }

  const listQuery = useQuery({
    queryKey: [...queryKeys.actionBatches(user?.id, filters), page],
    queryFn: () =>
      listActionBatches({
        page,
        limit: HISTORY_PAGE_SIZE,
        lloji: filters.lloji,
        shteti: filters.shteti,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        shenim: filters.shenim,
      }),
    placeholderData: keepPreviousData,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActionBatch(id),
    onSuccess: () => {
      setError(null)
      options?.onNotify?.('Veprimi u fshi me sukses.', 'success')
      scheduleInvalidate(qc, 'all', { userId: user?.id })
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Gabim gjate fshirjes.')
    },
  })

  const actions = listQuery.data?.actions ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE))

  return {
    filters,
    updateFilters,
    page,
    setPage,
    error,
    setError,
    listQuery,
    listRefresh: historyListRefreshState(listQuery),
    deleteMut,
    actions,
    total,
    totalPages,
  }
}

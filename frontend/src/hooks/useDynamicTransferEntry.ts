import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from './useActionItems'
import { toActionItemPayload } from '../types/actionItem'
import { createDynamicActionBatch } from '../lib/api'
import { todayISODate } from '../lib/dates'
import { scheduleInvalidate } from '../lib/invalidateAppData'
import { useAuth } from '../lib/auth/AuthProvider'

export function useDynamicTransferEntry(options: {
  activeLokacionet: Array<{ id: string; emri: string }>
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
  initialFrom?: string
  onSuccess?: () => void
}) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const defaultFrom = options.initialFrom ?? options.activeLokacionet[0]?.id ?? ''
  const defaultTo =
    options.activeLokacionet.find((l) => l.id !== defaultFrom)?.id ?? defaultFrom

  const [transferFrom, setTransferFrom] = React.useState(defaultFrom)
  const [transferTo, setTransferTo] = React.useState(defaultTo)
  const [transferDate, setTransferDate] = React.useState(todayISODate())
  const [transferOra, setTransferOra] = React.useState('')
  const [transferPershkrimi, setTransferPershkrimi] = React.useState('')
  const [transferError, setTransferError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const itemsState = useActionItems()

  const setFrom = (next: string) => {
    setTransferFrom(next)
    if (next === transferTo) {
      const alt = options.activeLokacionet.find((l) => l.id !== next)
      if (alt) setTransferTo(alt.id)
    }
  }

  const fromLabel = options.activeLokacionet.find((l) => l.id === transferFrom)?.emri ?? ''
  const toLabel = options.activeLokacionet.find((l) => l.id === transferTo)?.emri ?? ''

  const mutation = useMutation({
    mutationFn: () =>
      createDynamicActionBatch({
        lokacioni_id: transferFrom,
        destination_lokacioni_id: transferTo,
        lloji: 'Transfer',
        data: transferDate,
        ora: transferOra.trim() || undefined,
        pershkrimi: transferPershkrimi.trim() || undefined,
        items: itemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map(toActionItemPayload),
      }),
    onSuccess: (result) => {
      setTransferError(null)
      setConfirmOpen(false)
      options.notify(
        result.meta?.transfer
          ? `Transfer nga ${fromLabel} ne ${toLabel} u regjistrua per ${result.meta.transfer_count ?? 0} produkte.`
          : `Transfer nga ${fromLabel} ne ${toLabel} u regjistrua me sukses.`,
        'success',
      )
      itemsState.reset()
      setTransferOra('')
      setTransferPershkrimi('')
      options.onSuccess?.()
      scheduleInvalidate(qc, 'all', { userId: user?.id })
    },
    onError: (e) => {
      setTransferError(e instanceof Error ? e.message : 'Error')
      setConfirmOpen(false)
    },
  })

  const requestFinalize = () => {
    setTransferError(null)
    const result = validateActionItems(itemsState.items)
    if (!result.ok) {
      setTransferError(result.error)
      return
    }
    if (transferFrom === transferTo) {
      setTransferError('Transferi kerkon dy lokacione te ndryshme.')
      return
    }
    setConfirmOpen(true)
  }

  return {
    transferFrom,
    setTransferFrom: setFrom,
    transferTo,
    setTransferTo,
    transferDate,
    setTransferDate,
    transferOra,
    setTransferOra,
    transferPershkrimi,
    setTransferPershkrimi,
    transferError,
    setTransferError,
    confirmOpen,
    setConfirmOpen,
    itemsState,
    mutation,
    requestFinalize,
    fromLabel,
    toLabel,
  }
}

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
    options.activeLokacionet.find((l) => l.id !== defaultFrom)?.id ?? ''

  const [transferFrom, setTransferFrom] = React.useState(defaultFrom)
  const [transferTo, setTransferTo] = React.useState(defaultTo)
  const [transferDate, setTransferDate] = React.useState(todayISODate())
  const [transferOra, setTransferOra] = React.useState('')
  const [transferPershkrimi, setTransferPershkrimi] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const itemsState = useActionItems()

  const setFrom = (next: string) => {
    setTransferFrom(next)
    if (next === transferTo) {
      const alt = options.activeLokacionet.find((l) => l.id !== next)
      setTransferTo(alt?.id ?? '')
    }
  }

  const setTo = (next: string) => {
    setTransferTo(next)
    if (next === transferFrom) {
      const alt = options.activeLokacionet.find((l) => l.id !== next)
      setTransferFrom(alt?.id ?? '')
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
      options.notify(e instanceof Error ? e.message : 'Error', 'error')
      setConfirmOpen(false)
    },
  })

  const requestFinalize = () => {
    const destinationOptions = options.activeLokacionet.filter((l) => l.id !== transferFrom)
    const hasDestination = destinationOptions.some((l) => l.id === transferTo)
    if (!hasDestination) {
      options.notify('Zgjidh Destinacionin', 'error')
      return
    }
    const result = validateActionItems(itemsState.items)
    if (!result.ok) {
      options.notify(result.error, 'error')
      return
    }
    setConfirmOpen(true)
  }

  return {
    transferFrom,
    setTransferFrom: setFrom,
    transferTo,
    setTransferTo: setTo,
    transferDate,
    setTransferDate,
    transferOra,
    setTransferOra,
    transferPershkrimi,
    setTransferPershkrimi,
    confirmOpen,
    setConfirmOpen,
    itemsState,
    mutation,
    requestFinalize,
    fromLabel,
    toLabel,
  }
}

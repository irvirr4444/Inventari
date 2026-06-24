import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from './useActionItems'
import { toActionItemPayload } from '../types/actionItem'
import { createActionBatch } from '../lib/api'
import type { Country } from '../lib/country'
import { todayISODate } from '../lib/dates'
import { countryLabel } from '../lib/format'
import { scheduleInvalidate } from '../lib/invalidateAppData'
import { useAuth } from '../lib/auth/AuthProvider'

export function useTransferEntry(options: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
  initialFrom?: Country
  onSuccess?: () => void
}) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [transferFrom, setTransferFrom] = React.useState<Country>(options.initialFrom ?? 'XK')
  const [transferTo, setTransferTo] = React.useState<Country>(
    (options.initialFrom ?? 'XK') === 'XK' ? 'AL' : 'XK',
  )
  const [transferDate, setTransferDate] = React.useState(todayISODate())
  const [transferOra, setTransferOra] = React.useState('')
  const [transferPershkrimi, setTransferPershkrimi] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const itemsState = useActionItems()

  const setFrom = (next: Country) => {
    setTransferFrom(next)
    if (next === transferTo) setTransferTo(next === 'XK' ? 'AL' : 'XK')
  }

  const mutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: transferFrom,
        destination_shteti: transferTo,
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
          ? `Transfer nga ${countryLabel(result.meta.transfer_from ?? transferFrom)} ne ${countryLabel(result.meta.transfer_to ?? transferTo)} u regjistrua per ${result.meta.transfer_count ?? 0} produkte.`
          : `Transfer nga ${countryLabel(transferFrom)} ne ${countryLabel(transferTo)} u regjistrua me sukses.`,
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
    const result = validateActionItems(itemsState.items)
    if (!result.ok) {
      options.notify(result.error, 'error')
      return
    }
    if (transferFrom === transferTo) {
      options.notify('Transferi kerkon dy vende te ndryshme.', 'error')
      return
    }
    setConfirmOpen(true)
  }

  const hasValidItems = itemsState.items.some((i) => i.kodi_produktit.trim())

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
    confirmOpen,
    setConfirmOpen,
    itemsState,
    mutation,
    requestFinalize,
    hasValidItems,
  }
}

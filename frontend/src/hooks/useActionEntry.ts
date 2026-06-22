import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from './useActionItems'
import { toActionItemPayload } from '../types/actionItem'
import { createActionBatch } from '../lib/api'
import { useCountry } from '../lib/country'
import { todayISODate } from '../lib/dates'
import { scheduleInvalidate } from '../lib/invalidateAppData'
import { useAuth } from '../lib/auth/AuthProvider'
export function useActionEntry(options: {
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { country } = useCountry()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [actionDate, setActionDate] = React.useState(todayISODate())
  const [actionOra, setActionOra] = React.useState('')
  const [actionPershkrimi, setActionPershkrimi] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const itemsState = useActionItems()

  const mutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: country,
        lloji,
        data: actionDate,
        ora: actionOra.trim() || undefined,
        pershkrimi: actionPershkrimi.trim() || undefined,
        items: itemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map(toActionItemPayload),
      }),
    onSuccess: (result) => {
      setConfirmOpen(false)
      options.notify(
        result.meta?.mirrored_to_albania
          ? `U regjistrua Dalje ne Kosove dhe Hyrje ne Shqiperi per ${result.meta.mirrored_count ?? 0} produkte.`
          : 'Veprimi u regjistrua me sukses.',
        'success',
      )
      itemsState.reset()
      setActionOra('')
      setActionPershkrimi('')
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
    setConfirmOpen(true)
  }

  const hasValidItems = itemsState.items.some((i) => i.kodi_produktit.trim())

  return {
    country,
    lloji,
    setLloji,
    actionDate,
    setActionDate,
    actionOra,
    setActionOra,
    actionPershkrimi,
    setActionPershkrimi,
    confirmOpen,
    setConfirmOpen,
    itemsState,
    mutation,
    requestFinalize,
    hasValidItems,
  }
}

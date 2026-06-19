import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from './useActionItems'
import { effectiveSasia } from '../types/actionItem'
import { createDynamicActionBatch } from '../lib/api'
import { todayISODate } from '../lib/dates'
import { scheduleInvalidate } from '../lib/invalidateAppData'
import { useAuth } from '../lib/auth/AuthProvider'
import { productLabel } from '../lib/format'
import type { DynamicProdukti } from '../lib/api'

export function useDynamicActionEntry(options: {
  lokacioniId: string
  products: DynamicProdukti[]
  notify: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [actionDate, setActionDate] = React.useState(todayISODate())
  const [actionOra, setActionOra] = React.useState('')
  const [actionPershkrimi, setActionPershkrimi] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const duplicateProductMessage = React.useCallback(
    (kodi: string) => {
      const product = options.products.find((p) => p.kodi === kodi)
      return product
        ? `Ky produkt eshte tashme ne liste: ${productLabel(product.emri, product.kodi)}`
        : 'Ky produkt eshte tashme ne liste'
    },
    [options.products],
  )

  const itemsState = useActionItems((kodi) => options.notify(duplicateProductMessage(kodi)))

  const mutation = useMutation({
    mutationFn: () =>
      createDynamicActionBatch({
        lokacioni_id: options.lokacioniId,
        lloji,
        data: actionDate,
        ora: actionOra.trim() || undefined,
        pershkrimi: actionPershkrimi.trim() || undefined,
        items: itemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: effectiveSasia(i.sasia),
          })),
      }),
    onSuccess: () => {
      setConfirmOpen(false)
      options.notify('Veprimi u regjistrua me sukses.', 'success')
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

  return {
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
  }
}

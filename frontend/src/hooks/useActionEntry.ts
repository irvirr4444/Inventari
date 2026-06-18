import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from './useActionItems'
import { createActionBatch } from '../lib/api'
import { useCountry } from '../lib/country'
import { todayISODate } from '../lib/dates'
import { invalidateAfterMutation } from '../lib/invalidateAppData'
import { productLabel } from '../lib/format'
import type { Produkti } from '../lib/api'

export function useActionEntry(options: {
  products: Produkti[]
  notify: (message: string, variant?: 'success' | 'default') => void
}) {
  const { country } = useCountry()
  const qc = useQueryClient()
  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [actionDate, setActionDate] = React.useState(todayISODate())
  const [actionError, setActionError] = React.useState<string | null>(null)
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
      createActionBatch({
        shteti: country,
        lloji,
        data: actionDate,
        items: itemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async (result) => {
      setActionError(null)
      setConfirmOpen(false)
      options.notify(
        result.meta?.mirrored_to_albania
          ? `U regjistrua Dalje ne Kosove dhe Hyrje ne Shqiperi per ${result.meta.mirrored_count ?? 0} produkte.`
          : 'Veprimi u regjistrua me sukses.',
        'success',
      )
      itemsState.reset()
      await invalidateAfterMutation(qc, 'all', { refetchSummary: true })
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : 'Error')
      setConfirmOpen(false)
    },
  })

  const requestFinalize = () => {
    setActionError(null)
    const result = validateActionItems(itemsState.items)
    if (!result.ok) {
      setActionError(result.error)
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
    actionError,
    confirmOpen,
    setConfirmOpen,
    itemsState,
    mutation,
    requestFinalize,
    hasValidItems,
  }
}

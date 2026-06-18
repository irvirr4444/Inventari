import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from './useActionItems'
import { createActionBatch } from '../lib/api'
import type { Country } from '../lib/country'
import { todayISODate } from '../lib/dates'
import { countryLabel, productLabel } from '../lib/format'
import { invalidateAfterMutation } from '../lib/invalidateAppData'
import type { Produkti } from '../lib/api'

export function useTransferEntry(options: {
  products: Produkti[]
  notify: (message: string, variant?: 'success' | 'default') => void
  initialFrom?: Country
  onSuccess?: () => void
}) {
  const qc = useQueryClient()
  const [transferFrom, setTransferFrom] = React.useState<Country>(options.initialFrom ?? 'XK')
  const [transferTo, setTransferTo] = React.useState<Country>(
    (options.initialFrom ?? 'XK') === 'XK' ? 'AL' : 'XK',
  )
  const [transferDate, setTransferDate] = React.useState(todayISODate())
  const [transferError, setTransferError] = React.useState<string | null>(null)
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
        items: itemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async (result) => {
      setTransferError(null)
      setConfirmOpen(false)
      options.notify(
        result.meta?.transfer
          ? `Transfer nga ${countryLabel(result.meta.transfer_from ?? transferFrom)} ne ${countryLabel(result.meta.transfer_to ?? transferTo)} u regjistrua per ${result.meta.transfer_count ?? 0} produkte.`
          : `Transfer nga ${countryLabel(transferFrom)} ne ${countryLabel(transferTo)} u regjistrua me sukses.`,
        'success',
      )
      itemsState.reset()
      await invalidateAfterMutation(qc, 'all', { refetchSummary: true })
      options.onSuccess?.()
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
      setTransferError('Transferi kerkon dy vende te ndryshme.')
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
    transferError,
    setTransferError,
    confirmOpen,
    setConfirmOpen,
    itemsState,
    mutation,
    requestFinalize,
    hasValidItems,
  }
}

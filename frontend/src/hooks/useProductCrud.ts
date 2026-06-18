import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduct, deleteProduct, updateProduct, type Produkti } from '../lib/api'
import { invalidateAfterMutation } from '../lib/invalidateAppData'

export function useProductCrud(options: {
  notify: (message: string, variant?: 'success' | 'default') => void
}) {
  const qc = useQueryClient()
  const [productError, setProductError] = React.useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (input: {
      kodi: string
      emri: string
      gjendje_kosove: number
      gjendje_shqiperi: number
    }) => createProduct(input),
    onSuccess: async () => {
      setProductError(null)
      await invalidateAfterMutation(qc, 'products')
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const updateMut = useMutation({
    mutationFn: (p: Produkti) =>
      updateProduct(p.id, {
        kodi: p.kodi.trim(),
        emri: p.emri.trim(),
        gjendje_kosove: p.gjendje_kosove,
        gjendje_shqiperi: p.gjendje_shqiperi,
      }),
    onSuccess: async () => {
      setProductError(null)
      await invalidateAfterMutation(qc, 'products')
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      setProductError(null)
      options.notify('Produkti u fshi me sukses.', 'success')
      await invalidateAfterMutation(qc, 'all')
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  return {
    productError,
    setProductError,
    createMut,
    updateMut,
    deleteMut,
  }
}

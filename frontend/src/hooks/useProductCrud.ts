import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { createProduct, deleteProduct, updateProduct, type Produkti } from '../lib/api'

export function useProductCrud() {
  const [productError, setProductError] = React.useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (input: {
      kodi: string
      emri: string
      gjendje_kosove: number
      gjendje_shqiperi: number
    }) => createProduct(input),
    onSuccess: () => setProductError(null),
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
    onSuccess: () => setProductError(null),
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => setProductError(null),
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

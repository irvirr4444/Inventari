import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  updateDynamicProduct,
  type DynamicProdukti,
} from '../lib/api'

export function useDynamicProductCrud() {
  const [productError, setProductError] = React.useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (input: { kodi: string; emri: string }) => createProduct(input),
    onSuccess: () => setProductError(null),
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const updateMut = useMutation({
    mutationFn: (input: {
      id: string
      kodi: string
      emri: string
      stock: Array<{ lokacioni_id: string; sasia: number }>
    }) =>
      updateDynamicProduct(input.id, {
        kodi: input.kodi.trim(),
        emri: input.emri.trim(),
        stock: input.stock,
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

export type DynamicProductUpdateInput = {
  product: DynamicProdukti
  stock: Record<string, number>
}

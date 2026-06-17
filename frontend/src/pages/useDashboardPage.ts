import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useActionItems, validateActionItems } from '../hooks/useActionItems'
import { useSnackbar } from '../hooks/useSnackbar'
import {
  analyticsSummary,
  createActionBatch,
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type Produkti,
} from '../lib/api'
import type { Country } from '../lib/country'
import { useCountry } from '../lib/country'
import { isoDateDaysAgo, todayISODate } from '../lib/dates'
import { countryLabel, productLabel } from '../lib/format'
import { invalidateAfterMutation } from '../lib/invalidateAppData'
import { queryKeys } from '../lib/queryKeys'
import { createEmptyActionItem } from '../types/actionItem'
import type { ProductSortKey } from '../features/products/ProductsPanel'

export function useDashboardPage() {
  const { country } = useCountry()
  const qc = useQueryClient()
  const { snackbar, notify } = useSnackbar()

  const [lloji, setLloji] = React.useState<'Hyrje' | 'Dalje'>('Hyrje')
  const [actionDate, setActionDate] = React.useState(todayISODate())
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [confirmActionOpen, setConfirmActionOpen] = React.useState(false)

  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
  const [transferFrom, setTransferFrom] = React.useState<Country>('XK')
  const [transferTo, setTransferTo] = React.useState<Country>('AL')
  const [transferDate, setTransferDate] = React.useState(todayISODate())
  const [transferError, setTransferError] = React.useState<string | null>(null)
  const [confirmTransferOpen, setConfirmTransferOpen] = React.useState(false)

  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [from, setFrom] = React.useState(() => isoDateDaysAgo(30))
  const [to, setTo] = React.useState(() => isoDateDaysAgo(0))

  const [showAddProduct, setShowAddProduct] = React.useState(false)
  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newGjendjeKosove, setNewGjendjeKosove] = React.useState(0)
  const [newGjendjeShqiperi, setNewGjendjeShqiperi] = React.useState(0)
  const [editing, setEditing] = React.useState<Produkti | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Produkti | null>(null)
  const [productError, setProductError] = React.useState<string | null>(null)
  const [productSort, setProductSort] = React.useState<{
    key: ProductSortKey
    direction: 'asc' | 'desc'
  }>({ key: 'kodi', direction: 'asc' })
  const [productSearch, setProductSearch] = React.useState('')

  const productsQuery = useQuery({
    queryKey: queryKeys.products,
    queryFn: () => listProducts({}),
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const summaryQuery = useQuery({
    queryKey: queryKeys.analyticsSummary(from, to),
    queryFn: () => analyticsSummary({ from, to }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const duplicateProductMessage = React.useCallback(
    (kodi: string) => {
      const product = productsQuery.data?.find((p) => p.kodi === kodi)
      return product
        ? `Ky produkt eshte tashme ne liste: ${productLabel(product.emri, product.kodi)}`
        : 'Ky produkt eshte tashme ne liste'
    },
    [productsQuery.data],
  )

  const actionItemsState = useActionItems((kodi) => notify(duplicateProductMessage(kodi)))
  const transferItemsState = useActionItems((kodi) => notify(duplicateProductMessage(kodi)))

  const actionMutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: country,
        lloji,
        data: actionDate,
        items: actionItemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async (result) => {
      setActionError(null)
      setConfirmActionOpen(false)
      notify(
        result.meta?.mirrored_to_albania
          ? `U regjistrua Dalje ne Kosove dhe Hyrje ne Shqiperi per ${result.meta.mirrored_count ?? 0} produkte.`
          : 'Veprimi u regjistrua me sukses.',
        'success',
      )
      actionItemsState.reset()
      await invalidateAfterMutation(qc, 'all', { refetchSummary: true })
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : 'Error')
      setConfirmActionOpen(false)
    },
  })

  const transferMutation = useMutation({
    mutationFn: () =>
      createActionBatch({
        shteti: transferFrom,
        destination_shteti: transferTo,
        lloji: 'Transfer',
        data: transferDate,
        items: transferItemsState.items
          .filter((i) => i.kodi_produktit.trim())
          .map((i) => ({
            kodi_produktit: i.kodi_produktit.trim(),
            cmimi_njesi: Number(i.cmimi_njesi) || 0,
            sasia: Number(i.sasia) || 0,
          })),
      }),
    onSuccess: async (result) => {
      setTransferError(null)
      setConfirmTransferOpen(false)
      setTransferDialogOpen(false)
      notify(
        result.meta?.transfer
          ? `Transfer nga ${countryLabel(result.meta.transfer_from ?? transferFrom)} ne ${countryLabel(result.meta.transfer_to ?? transferTo)} u regjistrua per ${result.meta.transfer_count ?? 0} produkte.`
          : `Transfer nga ${countryLabel(transferFrom)} ne ${countryLabel(transferTo)} u regjistrua me sukses.`,
        'success',
      )
      transferItemsState.reset()
      await invalidateAfterMutation(qc, 'all', { refetchSummary: true })
    },
    onError: (e) => {
      setTransferError(e instanceof Error ? e.message : 'Error')
      setConfirmTransferOpen(false)
    },
  })

  const createProductMut = useMutation({
    mutationFn: () =>
      createProduct({
        kodi: newKodi.trim(),
        emri: newEmri.trim(),
        gjendje_kosove: Number(newGjendjeKosove) || 0,
        gjendje_shqiperi: Number(newGjendjeShqiperi) || 0,
      }),
    onSuccess: async () => {
      setProductError(null)
      setNewKodi('')
      setNewEmri('')
      setNewGjendjeKosove(0)
      setNewGjendjeShqiperi(0)
      setShowAddProduct(false)
      await invalidateAfterMutation(qc, 'products')
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const updateProductMut = useMutation({
    mutationFn: (p: Produkti) =>
      updateProduct(p.id, {
        kodi: p.kodi.trim(),
        emri: p.emri.trim(),
        gjendje_kosove: p.gjendje_kosove,
        gjendje_shqiperi: p.gjendje_shqiperi,
      }),
    onSuccess: async () => {
      setEditing(null)
      await invalidateAfterMutation(qc, 'products')
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const deleteProductMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      setProductError(null)
      setDeletingProduct(null)
      notify('Produkti u fshi me sukses.', 'success')
      await invalidateAfterMutation(qc, 'all')
    },
    onError: (e) => setProductError(e instanceof Error ? e.message : 'Error'),
  })

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    const result = validateActionItems(actionItemsState.items)
    if (!result.ok) {
      setActionError(result.error)
      return
    }
    setConfirmActionOpen(true)
  }

  const openTransferDialog = () => {
    setTransferFrom(country)
    setTransferTo(country === 'XK' ? 'AL' : 'XK')
    setTransferDate(todayISODate())
    transferItemsState.setItems([createEmptyActionItem()])
    setTransferError(null)
    setConfirmTransferOpen(false)
    setTransferDialogOpen(true)
  }

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError(null)
    const result = validateActionItems(transferItemsState.items)
    if (!result.ok) {
      setTransferError(result.error)
      return
    }
    if (transferFrom === transferTo) {
      setTransferError('Transferi kerkon dy vende te ndryshme.')
      return
    }
    setConfirmTransferOpen(true)
  }

  const submitNewProduct = (e: React.FormEvent) => {
    e.preventDefault()
    setProductError(null)
    if (!newKodi.trim() || !newEmri.trim()) {
      setProductError('Kodi dhe Emri jane te detyrueshem.')
      return
    }
    createProductMut.mutate()
  }

  const changeProductSort = (key: ProductSortKey) => {
    setProductSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const emptySummary = { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }

  return {
    country,
    snackbar,
    notify,
    lloji,
    setLloji,
    actionDate,
    setActionDate,
    actionError,
    confirmActionOpen,
    setConfirmActionOpen,
    transferDialogOpen,
    setTransferDialogOpen,
    transferFrom,
    setTransferFrom,
    transferTo,
    setTransferTo,
    transferDate,
    setTransferDate,
    transferError,
    setTransferError,
    confirmTransferOpen,
    setConfirmTransferOpen,
    historyOpen,
    setHistoryOpen,
    from,
    setFrom,
    to,
    setTo,
    showAddProduct,
    setShowAddProduct,
    newKodi,
    setNewKodi,
    newEmri,
    setNewEmri,
    newGjendjeKosove,
    setNewGjendjeKosove,
    newGjendjeShqiperi,
    setNewGjendjeShqiperi,
    editing,
    setEditing,
    deletingProduct,
    setDeletingProduct,
    productError,
    setProductError,
    productSort,
    productSearch,
    setProductSearch,
    products: productsQuery.data ?? [],
    summaryQuery,
    emptySummary,
    actionItemsState,
    transferItemsState,
    actionMutation,
    transferMutation,
    createProductMut,
    updateProductMut,
    deleteProductMut,
    submitAction,
    openTransferDialog,
    submitTransfer,
    submitNewProduct,
    changeProductSort,
  }
}

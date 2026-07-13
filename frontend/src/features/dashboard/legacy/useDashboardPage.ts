import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useActionEntry } from '../../../hooks/useActionEntry'
import { useProductCrud } from '../../../hooks/useProductCrud'
import { useProductsQuery } from '../../../hooks/useProductsQuery'
import { useSnackbar } from '../../../hooks/useSnackbar'
import { useSummaryDateRange } from '../../../hooks/useSummaryQuery'
import { useTransferEntry } from '../../../hooks/useTransferEntry'
import type { Produkti } from '../../../lib/api'
import { useCountry } from '../../../lib/country'
import { todayISODate } from '../../../lib/dates'
import {
  scheduleInvalidate,
  scheduleProductDeleteInvalidation,
} from '../../../lib/invalidateAppData'
import { useAuth } from '../../../lib/auth/AuthProvider'
import type { ProductSortKey } from '../../products/ProductsPanel'

export function useDashboardPage() {
  const { country } = useCountry()
  const { snackbar, notify } = useSnackbar()
  const qc = useQueryClient()
  const { user } = useAuth()

  const productsQuery = useProductsQuery()
  const products = productsQuery.data ?? []

  const summary = useSummaryDateRange()

  const actionEntry = useActionEntry({ notify })

  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
  const transferEntry = useTransferEntry({
    notify,
    initialFrom: country,
    onSuccess: () => setTransferDialogOpen(false),
  })

  const productCrud = useProductCrud()

  const [historyOpen, setHistoryOpen] = React.useState(false)

  const [showAddProduct, setShowAddProduct] = React.useState(false)
  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newGjendjeKosove, setNewGjendjeKosove] = React.useState(0)
  const [newGjendjeShqiperi, setNewGjendjeShqiperi] = React.useState(0)
  const [editing, setEditing] = React.useState<Produkti | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Produkti | null>(null)
  const [productSort, setProductSort] = React.useState<{
    key: ProductSortKey
    direction: 'asc' | 'desc'
  }>({ key: 'kodi', direction: 'asc' })
  const [productSearch, setProductSearch] = React.useState('')

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault()
    actionEntry.requestFinalize()
  }

  const openTransferDialog = () => {
    transferEntry.setTransferFrom(country)
    transferEntry.setTransferDate(todayISODate())
    transferEntry.setTransferOra('')
    transferEntry.setTransferPershkrimi('')
    transferEntry.itemsState.reset()
    transferEntry.setConfirmOpen(false)
    setTransferDialogOpen(true)
  }

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    transferEntry.requestFinalize()
  }

  const submitNewProduct = (e: React.FormEvent) => {
    e.preventDefault()
    productCrud.setProductError(null)
    if (!newKodi.trim() || !newEmri.trim()) {
      productCrud.setProductError('Kodi dhe Emri jane te detyrueshem.')
      return
    }
    productCrud.createMut.mutate(
      {
        kodi: newKodi.trim(),
        emri: newEmri.trim(),
        gjendje_kosove: Number(newGjendjeKosove) || 0,
        gjendje_shqiperi: Number(newGjendjeShqiperi) || 0,
      },
      {
        onSuccess: () => {
          setNewKodi('')
          setNewEmri('')
          setNewGjendjeKosove(0)
          setNewGjendjeShqiperi(0)
          setShowAddProduct(false)
          notify('Produkti u shtua me sukses.', 'success')
          scheduleInvalidate(qc, 'products', { userId: user?.id })
        },
      },
    )
  }

  const changeProductSort = (key: ProductSortKey) => {
    setProductSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const confirmDeleteProduct = () => {
    if (!deletingProduct) return
    productCrud.deleteMut.mutate(deletingProduct.id, {
      onSuccess: () => {
        setDeletingProduct(null)
        notify('Produkti u fshi me sukses.', 'success')
        scheduleProductDeleteInvalidation(qc, user?.id)
      },
    })
  }

  return {
    country,
    snackbar,
    notify,
    lloji: actionEntry.lloji,
    setLloji: actionEntry.setLloji,
    actionDate: actionEntry.actionDate,
    setActionDate: actionEntry.setActionDate,
    actionOra: actionEntry.actionOra,
    setActionOra: actionEntry.setActionOra,
    actionPershkrimi: actionEntry.actionPershkrimi,
    setActionPershkrimi: actionEntry.setActionPershkrimi,
    confirmActionOpen: actionEntry.confirmOpen,
    setConfirmActionOpen: actionEntry.setConfirmOpen,
    transferDialogOpen,
    setTransferDialogOpen,
    transferFrom: transferEntry.transferFrom,
    setTransferFrom: transferEntry.setTransferFrom,
    transferTo: transferEntry.transferTo,
    setTransferTo: transferEntry.setTransferTo,
    transferDate: transferEntry.transferDate,
    setTransferDate: transferEntry.setTransferDate,
    transferOra: transferEntry.transferOra,
    setTransferOra: transferEntry.setTransferOra,
    transferPershkrimi: transferEntry.transferPershkrimi,
    setTransferPershkrimi: transferEntry.setTransferPershkrimi,
    confirmTransferOpen: transferEntry.confirmOpen,
    setConfirmTransferOpen: transferEntry.setConfirmOpen,
    historyOpen,
    setHistoryOpen,
    from: summary.from,
    setFrom: summary.setFrom,
    to: summary.to,
    setTo: summary.setTo,
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
    productError: productCrud.productError,
    setProductError: productCrud.setProductError,
    productSort,
    productSearch,
    setProductSearch,
    products,
    summaryQuery: summary.query,
    emptySummary: summary.emptySummary,
    actionItemsState: actionEntry.itemsState,
    transferItemsState: transferEntry.itemsState,
    actionMutation: actionEntry.mutation,
    transferMutation: transferEntry.mutation,
    createProductMut: productCrud.createMut,
    updateProductMut: productCrud.updateMut,
    deleteProductMut: productCrud.deleteMut,
    submitAction,
    openTransferDialog,
    submitTransfer,
    submitNewProduct,
    changeProductSort,
    confirmDeleteProduct,
    scheduleProductUpdateSuccess: (p: Produkti) => {
      productCrud.updateMut.mutate(p, {
        onSuccess: () => {
          setEditing(null)
          notify('Produkti u perditesua me sukses.', 'success')
          scheduleInvalidate(qc, 'products', { userId: user?.id })
        },
      })
    },
  }
}

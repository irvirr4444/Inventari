import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDynamicActionEntry } from '../hooks/useDynamicActionEntry'
import { useDynamicProductCrud } from '../hooks/useDynamicProductCrud'
import { useDynamicProductsQuery } from '../hooks/useDynamicProductsQuery'
import { useDynamicTransferEntry } from '../hooks/useDynamicTransferEntry'
import { useSnackbar } from '../hooks/useSnackbar'
import { useSummaryDateRange } from '../hooks/useSummaryQuery'
import type { DynamicProdukti } from '../lib/api'
import { useLokacioni } from '../lib/lokacioni/LokacioniProvider'
import { todayISODate } from '../lib/dates'
import {
  scheduleInvalidate,
  scheduleProductDeleteInvalidation,
} from '../lib/invalidateAppData'
import { useAuth } from '../lib/auth/AuthProvider'
import type { DynamicProductSortKey } from '../features/dynamic/DynamicProductsPanel'

export function useDynamicDashboardPage() {
  const { activeLokacionet } = useLokacioni()
  const { snackbar, notify } = useSnackbar()
  const qc = useQueryClient()
  const { user } = useAuth()

  const sortedLocations = React.useMemo(
    () => [...activeLokacionet].sort((a, b) => a.rradhitja - b.rradhitja),
    [activeLokacionet],
  )

  const [lokacioniId, setLokacioniId] = React.useState(() => sortedLocations[0]?.id ?? '')

  React.useEffect(() => {
    if (!sortedLocations.some((l) => l.id === lokacioniId)) {
      setLokacioniId(sortedLocations[0]?.id ?? '')
    }
  }, [sortedLocations, lokacioniId])

  const productsQuery = useDynamicProductsQuery()
  const products = productsQuery.data ?? []

  const summary = useSummaryDateRange()

  const actionEntry = useDynamicActionEntry({
    lokacioniId,
    notify,
  })

  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
  const transferEntry = useDynamicTransferEntry({
    activeLokacionet: sortedLocations,
    notify,
    initialFrom: lokacioniId,
    onSuccess: () => setTransferDialogOpen(false),
  })

  const productCrud = useDynamicProductCrud()

  const [historyOpen, setHistoryOpen] = React.useState(false)

  const [showAddProduct, setShowAddProduct] = React.useState(false)
  const [newKodi, setNewKodi] = React.useState('')
  const [newEmri, setNewEmri] = React.useState('')
  const [newStock, setNewStock] = React.useState<Record<string, number>>({})
  const [editing, setEditing] = React.useState<DynamicProdukti | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<DynamicProdukti | null>(null)
  const [productSort, setProductSort] = React.useState<{
    key: DynamicProductSortKey
    direction: 'asc' | 'desc'
  }>({ key: 'kodi', direction: 'asc' })
  const [productSearch, setProductSearch] = React.useState('')

  const selectedLocation = sortedLocations.find((l) => l.id === lokacioniId)

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault()
    actionEntry.requestFinalize()
  }

  const openTransferDialog = () => {
    transferEntry.setTransferFrom(lokacioniId)
    const destination = sortedLocations.find((l) => l.id !== lokacioniId)
    transferEntry.setTransferTo(destination?.id ?? '')
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

  const initNewStock = () => {
    const stock: Record<string, number> = {}
    for (const loc of sortedLocations) stock[loc.id] = 0
    setNewStock(stock)
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
      },
      {
        onSuccess: (created) => {
          const stock = sortedLocations.map((loc) => ({
            lokacioni_id: loc.id,
            sasia: newStock[loc.id] ?? 0,
          }))
          const hasStock = stock.some((s) => s.sasia > 0)
          const finish = () => {
            setNewKodi('')
            setNewEmri('')
            initNewStock()
            setShowAddProduct(false)
            notify('Produkti u shtua me sukses.', 'success')
            scheduleInvalidate(qc, 'products', { userId: user?.id })
          }
          if (hasStock) {
            productCrud.updateMut.mutate(
              {
                id: created.id,
                kodi: newKodi.trim(),
                emri: newEmri.trim(),
                stock,
              },
              { onSuccess: finish },
            )
          } else {
            finish()
          }
        },
      },
    )
  }

  const changeProductSort = (key: DynamicProductSortKey) => {
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

  const summaryLocations = sortedLocations.filter((l) => l.show_in_summary)

  return {
    sortedLocations,
    lokacioniId,
    setLokacioniId,
    selectedLocation,
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
    transferFromLabel: transferEntry.fromLabel,
    transferToLabel: transferEntry.toLabel,
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
    newStock,
    setNewStock,
    initNewStock,
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
    summaryLocations,
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
    requestActionFinalize: actionEntry.requestFinalize,
    openTransferDialog,
    submitTransfer,
    requestTransferFinalize: transferEntry.requestFinalize,
    submitNewProduct,
    changeProductSort,
    confirmDeleteProduct,
    scheduleProductUpdateSuccess: (input: {
      product: DynamicProdukti
      stock: Record<string, number>
    }) => {
      const stock = sortedLocations.map((loc) => ({
        lokacioni_id: loc.id,
        sasia: input.stock[loc.id] ?? 0,
      }))
      productCrud.updateMut.mutate(
        {
          id: input.product.id,
          kodi: input.product.kodi.trim(),
          emri: input.product.emri.trim(),
          stock,
        },
        {
          onSuccess: () => {
            setEditing(null)
            notify('Produkti u perditesua me sukses.', 'success')
            scheduleInvalidate(qc, 'products', { userId: user?.id })
          },
        },
      )
    },
  }
}

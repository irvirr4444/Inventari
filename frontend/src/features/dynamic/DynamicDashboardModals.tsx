import { ConfirmModal } from '../../components/ConfirmModal'
import { useTenantConfig } from '../../hooks/useTenantConfig'
import { ActionReviewModal } from '../actions/ActionReviewModal'
import { validateActionItems } from '../../hooks/useActionItems'
import { productLabel } from '../../lib/format'
import { useAuth } from '../../lib/auth/AuthProvider'
import { canEditDeleteInLocation, isAdmin } from '../../lib/permissions'
import type { useDynamicDashboardPage } from '../dashboard/dynamic/useDynamicDashboardPage'
import { DynamicHistoryModal } from './DynamicHistoryModal'
import { DynamicProductFormModal } from './DynamicProductFormModal'
import { DynamicTransferModal } from './DynamicTransferModal'

type DynamicDashboardState = ReturnType<typeof useDynamicDashboardPage>

export function DynamicDashboardModals(props: {
  d: DynamicDashboardState
  showTransferModal?: boolean
  showHistoryModal?: boolean
}) {
  const d = props.d
  const { trackPrice } = useTenantConfig()
  const { user } = useAuth()
  const showTransfer = props.showTransferModal ?? true
  const showHistory = props.showHistoryModal ?? true
  const canEditProductDetails = isAdmin(user)
  const editableProductLocationIds = d.sortedLocations
    .filter((loc) => canEditDeleteInLocation(user, loc.id))
    .map((loc) => loc.id)

  return (
    <>
      {showTransfer && d.transferDialogOpen && (
        <DynamicTransferModal
          from={d.transferFrom}
          to={d.transferTo}
          date={d.transferDate}
          ora={d.transferOra}
          pershkrimi={d.transferPershkrimi}
          items={d.transferItemsState.items}
          products={d.products}
          total={d.transferItemsState.total}
          saving={d.transferMutation.isPending}
          onFromChange={d.setTransferFrom}
          onToChange={d.setTransferTo}
          onDateChange={d.setTransferDate}
          onOraChange={d.setTransferOra}
          onPershkrimiChange={d.setTransferPershkrimi}
          onAddItem={d.transferItemsState.addItem}
          onRemoveItem={d.transferItemsState.removeItem}
          onUpdateItem={d.transferItemsState.updateItem}
          onNotify={d.notify}
          onClose={() => {
            d.setTransferDialogOpen(false)
            d.setConfirmTransferOpen(false)
          }}
          onSubmit={d.submitTransfer}
        />
      )}

      {showHistory && d.historyOpen && (
        <DynamicHistoryModal
          products={d.products}
          onClose={() => d.setHistoryOpen(false)}
          onNotify={d.notify}
        />
      )}

      {d.deletingProduct && (
        <ConfirmModal
          title="Fshi produktin?"
          message={`Produkti "${productLabel(d.deletingProduct.emri, d.deletingProduct.kodi)}" do te fshihet bashke me historikun e veprimeve te tij.`}
          confirmLabel={d.deleteProductMut.isPending ? 'Duke fshire...' : 'Fshi'}
          tone="danger"
          loading={d.deleteProductMut.isPending}
          onCancel={() => d.setDeletingProduct(null)}
          onConfirm={d.confirmDeleteProduct}
        />
      )}

      {d.showAddProduct && (
        <DynamicProductFormModal
          mode="create"
          kodi={d.newKodi}
          emri={d.newEmri}
          stock={d.newStock}
          locations={d.sortedLocations}
          error={d.productError}
          saving={d.createProductMut.isPending || d.updateProductMut.isPending}
          onKodiChange={d.setNewKodi}
          onEmriChange={d.setNewEmri}
          onStockChange={(id, value) =>
            d.setNewStock((prev) => ({ ...prev, [id]: value }))
          }
          onSubmit={d.submitNewProduct}
          onClose={() => {
            d.setProductError(null)
            d.setShowAddProduct(false)
          }}
        />
      )}

      {d.editing && (
        <DynamicProductFormModal
          mode="edit"
          product={d.editing}
          locations={d.sortedLocations}
          canEditProductDetails={canEditProductDetails}
          editableLocationIds={editableProductLocationIds}
          onClose={() => d.setEditing(null)}
          onSave={d.scheduleProductUpdateSuccess}
          saving={d.updateProductMut.isPending}
        />
      )}

      {d.confirmActionOpen && d.selectedLocation && (
        <ActionReviewModal
          lloji={d.lloji}
          location={{
            emri: d.selectedLocation.emri,
            flagEmoji: d.selectedLocation.flag_emoji,
          }}
          actionDate={d.actionDate}
          actionOra={d.actionOra}
          actionPershkrimi={d.actionPershkrimi}
          items={d.actionItemsState.items}
          products={d.products}
          total={d.actionItemsState.total}
          loading={d.actionMutation.isPending}
          onUpdateItem={d.actionItemsState.updateItem}
          onNotify={d.notify}
          onCancel={() => d.setConfirmActionOpen(false)}
          onConfirm={() => {
            const result = validateActionItems(d.actionItemsState.items)
            if (result.ok === false) {
              d.notify(result.error, 'error')
              return
            }
            d.actionMutation.mutate()
          }}
          showPrice={trackPrice}
        />
      )}

      {d.confirmTransferOpen && (
        <ActionReviewModal
          lloji="Transfer"
          transferFromLocation={{
            emri: d.transferFromLabel,
            flagEmoji: d.sortedLocations.find((l) => l.id === d.transferFrom)?.flag_emoji,
          }}
          transferToLocation={{
            emri: d.transferToLabel,
            flagEmoji: d.sortedLocations.find((l) => l.id === d.transferTo)?.flag_emoji,
          }}
          actionDate={d.transferDate}
          actionOra={d.transferOra}
          actionPershkrimi={d.transferPershkrimi}
          items={d.transferItemsState.items}
          products={d.products}
          total={d.transferItemsState.total}
          loading={d.transferMutation.isPending}
          onUpdateItem={d.transferItemsState.updateItem}
          onNotify={d.notify}
          onCancel={() => d.setConfirmTransferOpen(false)}
          onConfirm={() => {
            const result = validateActionItems(d.transferItemsState.items)
            if (result.ok === false) {
              d.notify(result.error, 'error')
              return
            }
            d.transferMutation.mutate()
          }}
          showPrice={trackPrice}
        />
      )}
    </>
  )
}

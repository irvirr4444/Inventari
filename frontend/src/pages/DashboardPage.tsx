import type { SummaryByCountry } from '@inventari/shared'
import { ConfirmModal } from '../components/ConfirmModal'
import { Snackbar } from '../components/Snackbar'
import { ActionEntryPanel } from '../features/actions/ActionEntryPanel'
import { ActionReviewModal } from '../features/actions/ActionReviewModal'
import { TransferModal } from '../features/actions/TransferModal'
import { HistoryModal } from '../features/history/HistoryModal'
import { ProductFormModal } from '../features/products/ProductFormModal'
import { ProductsPanel } from '../features/products/ProductsPanel'
import { SummaryPanel } from '../features/summary/SummaryPanel'
import { validateActionItems } from '../hooks/useActionItems'
import { productLabel } from '../lib/format'
import { useDashboardPage } from '../features/dashboard/legacy/useDashboardPage'

export function DashboardPage() {
  const d = useDashboardPage()
  const summary = (d.summaryQuery.data ?? {}) as SummaryByCountry

  return (
    <div className="dashboard-stack">
      <ActionEntryPanel
        lloji={d.lloji}
        onLlojiChange={d.setLloji}
        actionDate={d.actionDate}
        onActionDateChange={d.setActionDate}
        actionOra={d.actionOra}
        onActionOraChange={d.setActionOra}
        actionPershkrimi={d.actionPershkrimi}
        onActionPershkrimiChange={d.setActionPershkrimi}
        items={d.actionItemsState.items}
        products={d.products}
        onUpdateItem={d.actionItemsState.updateItem}
        onRemoveItem={d.actionItemsState.removeItem}
        onAddItem={d.actionItemsState.addItem}
        total={d.actionItemsState.total}
        saving={d.actionMutation.isPending}
        onSubmit={d.submitAction}
        onOpenTransfer={d.openTransferDialog}
        onOpenHistory={() => d.setHistoryOpen(true)}
        onNotify={d.notify}
      />

      <div className="dashboard-grid">
        <ProductsPanel
          products={d.products}
          sort={d.productSort}
          search={d.productSearch}
          error={d.productError}
          showAddProduct={d.showAddProduct}
          deletePending={d.deleteProductMut.isPending}
          onSearchChange={d.setProductSearch}
          onSortChange={d.changeProductSort}
          onAddProduct={() => d.setShowAddProduct(true)}
          onEditProduct={d.setEditing}
          onDeleteProduct={(p) => {
            d.setProductError(null)
            d.setDeletingProduct(p)
          }}
        />

        <SummaryPanel
          from={d.from}
          to={d.to}
          onFromChange={d.setFrom}
          onToChange={d.setTo}
          summaryKosove={summary.XK ?? d.emptySummary}
          summaryShqiperi={summary.AL ?? d.emptySummary}
          isFetching={d.summaryQuery.isFetching}
          error={d.summaryQuery.error}
        />
      </div>

      {d.transferDialogOpen && (
        <TransferModal
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

      {d.historyOpen && (
        <HistoryModal products={d.products} onClose={() => d.setHistoryOpen(false)} onNotify={d.notify} />
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
        <ProductFormModal
          mode="create"
          kodi={d.newKodi}
          emri={d.newEmri}
          gjendjeKosove={d.newGjendjeKosove}
          gjendjeShqiperi={d.newGjendjeShqiperi}
          error={d.productError}
          saving={d.createProductMut.isPending}
          onKodiChange={d.setNewKodi}
          onEmriChange={d.setNewEmri}
          onGjendjeKosoveChange={d.setNewGjendjeKosove}
          onGjendjeShqiperiChange={d.setNewGjendjeShqiperi}
          onSubmit={d.submitNewProduct}
          onClose={() => {
            d.setProductError(null)
            d.setShowAddProduct(false)
          }}
        />
      )}

      {d.editing && (
        <ProductFormModal
          mode="edit"
          product={d.editing}
          onClose={() => d.setEditing(null)}
          onSave={d.scheduleProductUpdateSuccess}
          saving={d.updateProductMut.isPending}
        />
      )}

      {d.confirmActionOpen && (
        <ActionReviewModal
          lloji={d.lloji}
          country={d.country}
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
        />
      )}

      {d.confirmTransferOpen && (
        <ActionReviewModal
          lloji="Transfer"
          transferFrom={d.transferFrom}
          transferTo={d.transferTo}
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
        />
      )}

      <Snackbar snackbar={d.snackbar} />
    </div>
  )
}

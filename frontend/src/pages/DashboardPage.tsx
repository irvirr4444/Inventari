import { ConfirmModal } from '../components/ConfirmModal'
import { Snackbar } from '../components/Snackbar'
import { ActionEntryPanel } from '../features/actions/ActionEntryPanel'
import { TransferModal } from '../features/actions/TransferModal'
import { HistoryModal } from '../features/history/HistoryModal'
import { ProductFormModal } from '../features/products/ProductFormModal'
import { ProductsPanel } from '../features/products/ProductsPanel'
import { SummaryPanel } from '../features/summary/SummaryPanel'
import { countryLabel, fmt, productLabel } from '../lib/format'
import { useDashboardPage } from './useDashboardPage'

export function DashboardPage() {
  const d = useDashboardPage()

  return (
    <div className="dashboard-stack">
      <ActionEntryPanel
        lloji={d.lloji}
        onLlojiChange={d.setLloji}
        actionDate={d.actionDate}
        onActionDateChange={d.setActionDate}
        items={d.actionItemsState.items}
        products={d.products}
        onUpdateItem={d.actionItemsState.updateItem}
        onRemoveItem={d.actionItemsState.removeItem}
        onAddItem={d.actionItemsState.addItem}
        total={d.actionItemsState.total}
        error={d.actionError}
        saving={d.actionMutation.isPending}
        onSubmit={d.submitAction}
        onOpenTransfer={d.openTransferDialog}
        onOpenHistory={() => d.setHistoryOpen(true)}
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
          summaryKosove={d.summaryQuery.data?.XK ?? d.emptySummary}
          summaryShqiperi={d.summaryQuery.data?.AL ?? d.emptySummary}
          isFetching={d.summaryQuery.isFetching}
          error={d.summaryQuery.error}
        />
      </div>

      {d.transferDialogOpen && (
        <TransferModal
          from={d.transferFrom}
          to={d.transferTo}
          date={d.transferDate}
          items={d.transferItemsState.items}
          products={d.products}
          error={d.transferError}
          total={d.transferItemsState.total}
          saving={d.transferMutation.isPending}
          onFromChange={d.setTransferFrom}
          onToChange={d.setTransferTo}
          onDateChange={d.setTransferDate}
          onAddItem={d.transferItemsState.addItem}
          onRemoveItem={d.transferItemsState.removeItem}
          onUpdateItem={d.transferItemsState.updateItem}
          onClose={() => {
            d.setTransferDialogOpen(false)
            d.setTransferError(null)
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
          title="Fshij produktin?"
          message={`Produkti "${productLabel(d.deletingProduct.emri, d.deletingProduct.kodi)}" do te fshihet bashke me historikun e veprimeve te tij.`}
          confirmLabel={d.deleteProductMut.isPending ? 'Duke fshire...' : 'Fshij'}
          tone="danger"
          loading={d.deleteProductMut.isPending}
          onCancel={() => d.setDeletingProduct(null)}
          onConfirm={() => d.deleteProductMut.mutate(d.deletingProduct!.id)}
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
          onSave={(p) =>
            d.updateProductMut.mutate(p, {
              onSuccess: () => {
                d.setEditing(null)
                d.notify('Produkti u perditesua me sukses.', 'success')
              },
            })
          }
          saving={d.updateProductMut.isPending}
        />
      )}

      {d.confirmActionOpen && (
        <ConfirmModal
          title="Finalizo veprimin?"
          message={
            <span>
              {d.lloji} ne {countryLabel(d.country)} me total{' '}
              <strong className="num" style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {fmt(d.actionItemsState.total)}
              </strong>
              .
            </span>
          }
          confirmLabel={d.actionMutation.isPending ? 'Duke finalizuar...' : 'Finalizo'}
          tone="primary"
          loading={d.actionMutation.isPending}
          onCancel={() => d.setConfirmActionOpen(false)}
          onConfirm={() => d.actionMutation.mutate()}
        />
      )}

      {d.confirmTransferOpen && (
        <ConfirmModal
          title="Finalizo transfertën?"
          message={
            <span>
              Transfer nga {countryLabel(d.transferFrom)} ne {countryLabel(d.transferTo)} me total{' '}
              <strong className="num" style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {fmt(d.transferItemsState.total)}
              </strong>
              .
            </span>
          }
          confirmLabel={d.transferMutation.isPending ? 'Duke finalizuar...' : 'Finalizo'}
          tone="primary"
          loading={d.transferMutation.isPending}
          onCancel={() => d.setConfirmTransferOpen(false)}
          onConfirm={() => d.transferMutation.mutate()}
        />
      )}

      <Snackbar snackbar={d.snackbar} />
    </div>
  )
}

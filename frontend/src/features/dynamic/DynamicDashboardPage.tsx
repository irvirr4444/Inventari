import * as React from 'react'
import { Snackbar } from '../../components/Snackbar'
import { useDynamicDashboardPage } from '../../pages/useDynamicDashboardPage'
import { DynamicActionEntryPanel } from './DynamicActionEntryPanel'
import { DynamicDashboardModals } from './DynamicDashboardModals'
import { DynamicProductsPanel } from './DynamicProductsPanel'
import { DynamicSummaryPanel } from './DynamicSummaryPanel'
import { TutorialOverlay } from '../onboarding/TutorialOverlay'

export function DynamicDashboardPage(props: { showTutorial?: boolean }) {
  const d = useDynamicDashboardPage()
  const summaryData = d.summaryQuery.data as Record<string, typeof d.emptySummary> | undefined
  const [tutorialOpen, setTutorialOpen] = React.useState(props.showTutorial ?? false)

  React.useEffect(() => {
    if (props.showTutorial) setTutorialOpen(true)
  }, [props.showTutorial])

  return (
    <div className="dashboard-stack">
      <DynamicActionEntryPanel
        lokacioniId={d.lokacioniId}
        onLokacioniChange={d.setLokacioniId}
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
        <DynamicProductsPanel
          products={d.products}
          locations={d.sortedLocations}
          sort={d.productSort}
          search={d.productSearch}
          error={d.productError}
          showAddProduct={d.showAddProduct}
          deletePending={d.deleteProductMut.isPending}
          onSearchChange={d.setProductSearch}
          onSortChange={d.changeProductSort}
          onAddProduct={() => {
            d.initNewStock()
            d.setShowAddProduct(true)
          }}
          onEditProduct={d.setEditing}
          onDeleteProduct={(p) => {
            d.setProductError(null)
            d.setDeletingProduct(p)
          }}
        />

        <DynamicSummaryPanel
          from={d.from}
          to={d.to}
          onFromChange={d.setFrom}
          onToChange={d.setTo}
          locations={d.summaryLocations}
          summaryByLocation={summaryData ?? {}}
          isFetching={d.summaryQuery.isFetching}
          error={d.summaryQuery.error}
        />
      </div>

      <DynamicDashboardModals d={d} />
      <Snackbar snackbar={d.snackbar} />
      {tutorialOpen ? (
        <TutorialOverlay onDismiss={() => setTutorialOpen(false)} />
      ) : null}
    </div>
  )
}

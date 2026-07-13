import * as React from 'react'
import type { GroupedSummaryResult } from '@inventari/shared'
import { Snackbar } from '../../components/Snackbar'
import { useDynamicDashboardPage } from '../dashboard/dynamic/useDynamicDashboardPage'
import { DynamicActionEntryPanel } from './DynamicActionEntryPanel'
import { DynamicDashboardModals } from './DynamicDashboardModals'
import { DynamicProductsPanel } from './DynamicProductsPanel'
import { DynamicSummaryPanel } from './DynamicSummaryPanel'
import { TutorialOverlay } from '../onboarding/TutorialOverlay'
import { useAuth } from '../../lib/auth/AuthProvider'
import {
  canAddInLocation,
  canAddProducts,
  canEditDeleteProducts,
  isAdmin,
} from '../../lib/permissions'

export function DynamicDashboardPage(props: { showTutorial?: boolean }) {
  const d = useDynamicDashboardPage()
  const { user } = useAuth()
  const summaryData = d.summaryQuery.data as GroupedSummaryResult | undefined
  const summaryRows = summaryData?.rows ?? []
  const summaryLoading = d.summaryQuery.isFetching && summaryData == null
  const [tutorialOpen, setTutorialOpen] = React.useState(props.showTutorial ?? false)

  const canAddActions = canAddInLocation(user, d.lokacioniId)
  const canTransfer = canAddInLocation(user, d.lokacioniId)
  const canAddProduct = canAddProducts(user)
  const canEditProduct = canEditDeleteProducts(user)
  const canDeleteProduct = canEditDeleteProducts(user)

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
        allowAddLocation={isAdmin(user)}
        canAddItems={canAddActions}
        canSubmitAction={canAddActions}
        canOpenTransfer={canTransfer}
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
          canAddProduct={canAddProduct}
          canEditProduct={canEditProduct}
          canDeleteProduct={canDeleteProduct}
        />

        <DynamicSummaryPanel
          from={d.from}
          to={d.to}
          onFromChange={d.setFrom}
          onToChange={d.setTo}
          groupBy={d.summaryGroupBy}
          onGroupByChange={d.setSummaryGroupBy}
          locations={d.summaryLocations}
          rows={summaryRows}
          loading={summaryLoading}
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

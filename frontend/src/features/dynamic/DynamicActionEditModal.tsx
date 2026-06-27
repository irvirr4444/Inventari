import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { getActionBatch, type DynamicProdukti } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useTenantConfig } from '../../hooks/useTenantConfig'
import { useFocusModalOnOpen } from '../../hooks/useFocusModalOnOpen'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import { HistoryDetailPending } from '../history/HistoryDetailPending'
import { DynamicActionEditForm } from './DynamicActionEditForm'
import type { HistoryEditSaveResult } from '../history/historyEditSave'

export function DynamicActionEditModal(props: {
  actionId: string
  products: DynamicProdukti[]
  onClose: () => void
  onSaveComplete: (result: HistoryEditSaveResult) => void
  onError: (message: string) => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const { user } = useAuth()
  const { trackPrice } = useTenantConfig()
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(user?.id, props.actionId),
    queryFn: () => getActionBatch(props.actionId),
  })
  const contentRef = React.useRef<HTMLDivElement>(null)

  useFocusModalOnOpen(contentRef, Boolean(detailQuery.data), detailQuery.dataUpdatedAt)
  useEscapeToClose(props.onClose)

  return (
    <div
      className="modal-overlay history-edit-overlay"
      onClick={(e) => handleOverlayDismiss(e, props.onClose)}
    >
      <div
        ref={contentRef}
        className="modal-content history-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="history-edit-modal-header">
          <h3>Ndrysho Veprimin</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={props.onClose}
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>

        {detailQuery.isLoading ? (
          <HistoryDetailPending />
        ) : detailQuery.isError ? (
          <p className="muted" style={{ margin: '16px 0' }}>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Gabim gjate ngarkimit.'}
          </p>
        ) : detailQuery.data ? (
          <DynamicActionEditForm
            key={`${props.actionId}-${detailQuery.dataUpdatedAt}`}
            detail={detailQuery.data}
            products={props.products}
            trackPrice={trackPrice}
            disabled={detailQuery.isFetching}
            onSaveComplete={props.onSaveComplete}
            onError={props.onError}
            onNotify={props.onNotify}
          />
        ) : null}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { getActionBatch, type DynamicProdukti } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthProvider'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import { DynamicActionEditForm } from './DynamicActionEditForm'
import type { HistoryEditSaveResult } from '../history/historyEditSave'

export function DynamicActionEditModal(props: {
  actionId: string
  products: DynamicProdukti[]
  onClose: () => void
  onSaveComplete: (result: HistoryEditSaveResult) => void
  onError: (message: string) => void
}) {
  const { user } = useAuth()
  const detailQuery = useQuery({
    queryKey: queryKeys.actionBatch(user?.id, props.actionId),
    queryFn: () => getActionBatch(props.actionId),
  })

  return (
    <div
      className="modal-overlay history-edit-overlay"
      onClick={(e) => handleOverlayDismiss(e, props.onClose)}
    >
      <div className="modal-content history-edit-modal" onClick={(e) => e.stopPropagation()}>
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
          <div className="history-skeleton-block" style={{ height: 120, margin: '16px 0' }} />
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
            disabled={detailQuery.isFetching}
            onSaveComplete={props.onSaveComplete}
            onError={props.onError}
          />
        ) : null}
      </div>
    </div>
  )
}

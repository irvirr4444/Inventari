import * as React from 'react'
import type { Country } from '../../lib/country'
import { COUNTRY_META } from '../../lib/country'
import type { ActionBatch } from '../../lib/api'
import { DaljeIcon, HyrjeIcon, LlojiTransferIcon } from '../../components/icons'
import { fmtEuro, formatDisplayDate, productCountLabel, countryLabel } from '../../lib/format'
import { formatActionDateTime } from '../../lib/actionMeta'
import { useHistoryBatches } from '../../hooks/useHistoryBatches'
import { useProductsQuery } from '../../hooks/useProductsQuery'
import { BottomSheet } from '../components/BottomSheet'
import { SheetActionFooter } from '../components/SheetActions'
import { FilterChips } from '../components/FilterChips'
import { MobileDateInput } from '../components/MobileDateInput'
import { SkeletonRow } from '../components/SkeletonRow'
import type { MobileHeaderState } from '../types'
import { HistoriBatchDetail } from './HistoriBatchDetail'

function MobileLlojiBadge(props: { lloji: ActionBatch['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

const LLOJI_FILTER_OPTIONS = [
  { id: 'Hyrje' as const, label: 'Hyrje', icon: HyrjeIcon, tone: 'hyrje' },
  { id: 'Dalje' as const, label: 'Dalje', icon: DaljeIcon, tone: 'dalje' },
  { id: 'Transfer' as const, label: 'Transfer', icon: LlojiTransferIcon, tone: 'transfer' },
]

export function HistoriTab(props: {
  notify: (message: string, variant?: 'success' | 'default') => void
  onHeaderChange: (header: MobileHeaderState) => void
}) {
  const productsQuery = useProductsQuery()
  const history = useHistoryBatches({ onNotify: props.notify })
  const [screen, setScreen] = React.useState<{ mode: 'list' | 'detail'; batchId?: string }>({
    mode: 'list',
  })
  const [deleteTarget, setDeleteTarget] = React.useState<Pick<
    ActionBatch,
    'id' | 'lloji' | 'data'
  > | null>(null)
  const [llojiOpen, setLlojiOpen] = React.useState(false)
  const [shtetiOpen, setShtetiOpen] = React.useState(false)

  const products = productsQuery.data ?? []

  const goToList = React.useCallback(() => setScreen({ mode: 'list' }), [])

  React.useEffect(() => {
    if (screen.mode === 'detail') {
      props.onHeaderChange({
        kind: 'sub',
        title: 'Detajet',
        onBack: goToList,
      })
    } else {
      props.onHeaderChange({ kind: 'tab' })
    }
    return () => props.onHeaderChange({ kind: 'tab' })
  }, [screen.mode, goToList, props.onHeaderChange])

  const llojiLabel = history.filters.lloji ?? 'Lloji'
  const shtetiLabel = history.filters.shteti ? countryLabel(history.filters.shteti) : 'Shteti'

  return (
    <>
      {screen.mode === 'detail' && screen.batchId ? (
        <HistoriBatchDetail
          batchId={screen.batchId}
          products={products}
          onNotify={props.notify}
          onDeleteRequest={(batch) => setDeleteTarget(batch)}
        />
      ) : (
        <>
          <div className="mobile-tab-panel">
        <FilterChips
          chips={[
            { id: 'lloji', label: llojiLabel, active: !!history.filters.lloji },
            { id: 'shteti', label: shtetiLabel, active: !!history.filters.shteti },
            ...(history.filters.lloji || history.filters.shteti || history.filters.dateFrom || history.filters.dateTo
              ? [{ id: 'clear', label: 'Pastro', active: false }]
              : []),
          ]}
          onSelect={(id) => {
            if (id === 'clear') {
              history.updateFilters({ lloji: undefined, shteti: undefined, dateFrom: undefined, dateTo: undefined })
              return
            }
            if (id === 'lloji') setLlojiOpen(true)
            if (id === 'shteti') setShtetiOpen(true)
          }}
        />

        <div className="mobile-field-row">
          <div>
            <label className="mobile-label">Nga</label>
            <MobileDateInput
              value={history.filters.dateFrom ?? ''}
              onChange={(v) => history.updateFilters({ dateFrom: v || undefined })}
              aria-label="Nga data"
              placeholder="Nga"
            />
          </div>
          <div>
            <label className="mobile-label">Deri</label>
            <MobileDateInput
              value={history.filters.dateTo ?? ''}
              onChange={(v) => history.updateFilters({ dateTo: v || undefined })}
              aria-label="Deri data"
              placeholder="Deri"
            />
          </div>
        </div>

        {history.error ? <div className="mobile-inline-error">{history.error}</div> : null}

        {history.listQuery.isLoading ? (
          <SkeletonRow count={5} />
        ) : history.actions.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-title">Nuk ka veprime</div>
          </div>
        ) : (
          <div className="mobile-list-stack">
            {history.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="mobile-row-card"
                style={{ width: '100%', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setScreen({ mode: 'detail', batchId: action.id })}
              >
                <div className="row" style={{ gap: 8, alignItems: 'center', width: '100%' }}>
                  <MobileLlojiBadge lloji={action.lloji} />
                  <span className="mobile-card-meta">
                    {formatActionDateTime(action.data, action.ora)}
                  </span>
                </div>
                {action.pershkrimi?.trim() ? (
                  <div className="mobile-card-meta mobile-meta-truncate" title={action.pershkrimi.trim()}>
                    {action.pershkrimi.trim()}
                  </div>
                ) : null}
                {action.lloji === 'Transfer' && action.destination_shteti ? (
                  <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <img className="flagIcon" src={COUNTRY_META[action.shteti].flagSrc} alt="" width={16} height={11} />
                    {countryLabel(action.shteti)} → {countryLabel(action.destination_shteti)}
                    <img className="flagIcon" src={COUNTRY_META[action.destination_shteti].flagSrc} alt="" width={16} height={11} />
                  </div>
                ) : (
                  <div className="mobile-card-meta row" style={{ gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <img className="flagIcon" src={COUNTRY_META[action.shteti].flagSrc} alt="" width={16} height={11} />
                    {countryLabel(action.shteti)}
                  </div>
                )}
                <div className="mobile-card-meta" style={{ marginTop: 6 }}>
                  {productCountLabel(action.item_count)} · {fmtEuro(action.totali)}
                </div>
              </button>
            ))}
          </div>
        )}

        {history.total > 0 ? (
          <div className="mobile-pagination">
            <button
              type="button"
              className="mobile-pagination-btn"
              disabled={history.page <= 1}
              onClick={() => history.setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="mobile-card-meta">
              {history.page} / {history.totalPages}
            </span>
            <button
              type="button"
              className="mobile-pagination-btn"
              disabled={history.page >= history.totalPages}
              onClick={() => history.setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
          </div>

          <BottomSheet open={llojiOpen} title="Lloji" onClose={() => setLlojiOpen(false)}>
            <div className="mobile-list-stack">
              {LLOJI_FILTER_OPTIONS.map(({ id, label, icon: Icon, tone }) => (
                <button
                  key={id}
                  type="button"
                  className={`mobile-tap-field${history.filters.lloji === id ? ' selected' : ''}`}
                  onClick={() => {
                    history.updateFilters({ lloji: history.filters.lloji === id ? undefined : id })
                    setLlojiOpen(false)
                  }}
                >
                  <span className="row" style={{ gap: 12, alignItems: 'center' }}>
                    <span className={`mobile-lloji-icon mobile-lloji-icon-${tone}`}>
                      <Icon />
                    </span>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </BottomSheet>

          <BottomSheet open={shtetiOpen} title="Shteti" onClose={() => setShtetiOpen(false)}>
            <div className="mobile-list-stack">
              {(['XK', 'AL'] as Country[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="mobile-tap-field"
                  onClick={() => {
                    history.updateFilters({ shteti: history.filters.shteti === c ? undefined : c })
                    setShtetiOpen(false)
                  }}
                >
                  <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <img className="flagIcon" src={COUNTRY_META[c].flagSrc} alt="" width={20} height={14} />
                    {countryLabel(c)}
                  </span>
                </button>
              ))}
            </div>
          </BottomSheet>
        </>
      )}

      <BottomSheet
        open={!!deleteTarget}
        title="Fshij veprimin?"
        onClose={() => setDeleteTarget(null)}
        footer={
          <SheetActionFooter
            onCancel={() => setDeleteTarget(null)}
            confirmLabel={history.deleteMut.isPending ? 'Duke fshire…' : 'Fshij'}
            confirmLoading={history.deleteMut.isPending}
            confirmVariant="danger"
            confirmIcon="delete"
            onConfirm={() => {
              if (!deleteTarget) return
              history.deleteMut.mutate(deleteTarget.id, {
                onSuccess: () => {
                  setDeleteTarget(null)
                  setScreen({ mode: 'list' })
                },
              })
            }}
          />
        }
      >
        {deleteTarget ? (
          <p className="mobile-card-meta">
            Veprimi {deleteTarget.lloji} me date {formatDisplayDate(deleteTarget.data)} do te fshihet.
          </p>
        ) : null}
      </BottomSheet>
    </>
  )
}

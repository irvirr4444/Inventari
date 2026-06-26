import * as React from 'react'
import type { ActionBatch, ProductListItem } from '../../lib/api'
import { type Country } from '../../lib/country'
import { fmtEuro } from '../../lib/format'
import { formatActionDateTime } from '../../lib/actionMeta'
import type { ActionItemDraft } from '../../types/actionItem'
import {
  MOBILE_REVIEW_VISIBLE_ROWS,
  type ReviewLocation,
  ReviewRouteMeta,
  mobileReviewScrollAffordance,
  reviewProductCountLabel,
} from '../../features/actions/actionReviewShared'
import { BottomSheet } from './BottomSheet'
import { SheetActionFooter } from './SheetActions'
import { MobileActionReviewProductRow } from './MobileActionReviewProductRow'

function MobileLlojiBadge(props: { lloji: ActionBatch['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

type MobileActionReviewSheetProps = {
  open: boolean
  loading: boolean
  items: ActionItemDraft[]
  products: ProductListItem[]
  total: number
  actionDate: string
  actionOra: string
  actionPershkrimi: string
  showPrice?: boolean
  title?: string
  confirmLabel?: string
  totalLabel?: string
  onCancel: () => void
  onConfirm: () => void
} & (
  | ({
      lloji: 'Hyrje' | 'Dalje'
    } & (
      | { country: Country; location?: never }
      | { location: ReviewLocation; country?: never }
    ))
  | ({
      lloji: 'Transfer'
    } & (
      | {
          transferFrom: Country
          transferTo: Country
          transferFromLocation?: never
          transferToLocation?: never
        }
      | {
          transferFromLocation: ReviewLocation
          transferToLocation: ReviewLocation
          transferFrom?: never
          transferTo?: never
        }
    ))
)

type ReviewListScrollState = 'none' | 'more' | 'end'

function useReviewListScrollState(
  listRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  open: boolean,
  itemCount: number,
) {
  const [state, setState] = React.useState<ReviewListScrollState>('none')
  const [hiddenCount, setHiddenCount] = React.useState(0)

  React.useLayoutEffect(() => {
    const el = listRef.current
    if (!el || !enabled || !open) {
      setState('none')
      setHiddenCount(0)
      return
    }

    const update = () => {
      const { scrollHeight, clientHeight, scrollTop } = el
      if (scrollHeight <= clientHeight + 2) {
        setState('none')
        setHiddenCount(0)
        return
      }

      const atBottom = scrollTop + clientHeight >= scrollHeight - 10
      setState(atBottom ? 'end' : 'more')

      const row = el.querySelector('.mobile-action-review-row')
      const rowHeight = row instanceof HTMLElement ? row.offsetHeight : 84
      const gap = 8
      const visibleRows = Math.max(1, Math.floor((clientHeight + gap) / (rowHeight + gap)))
      setHiddenCount(Math.max(0, itemCount - visibleRows))
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [enabled, open, itemCount, listRef])

  return { state, hiddenCount }
}

export function MobileActionReviewSheet(props: MobileActionReviewSheetProps) {
  const showPrice = props.showPrice ?? true
  const displayItems = props.items.filter((i) => i.kodi_produktit.trim())
  const listScrollable = displayItems.length > MOBILE_REVIEW_VISIBLE_ROWS
  const listRef = React.useRef<HTMLDivElement>(null)
  const { state: listScrollState, hiddenCount } = useReviewListScrollState(
    listRef,
    listScrollable,
    props.open,
    displayItems.length,
  )
  const showScrollAffordance = listScrollable && listScrollState === 'more'
  const isTransfer = props.lloji === 'Transfer'
  const title = props.title ?? (isTransfer ? 'Finalizo transfertën?' : 'Finalizo veprimin?')
  const totalLabel = props.totalLabel ?? (isTransfer ? 'Totali i transfertës' : 'Totali i veprimit')
  const confirmLabel = props.confirmLabel ?? (props.loading ? 'Duke finalizuar…' : 'Konfirmo')
  const dateTime = formatActionDateTime(props.actionDate, props.actionOra)
  const pershkrimi = props.actionPershkrimi.trim()

  return (
    <BottomSheet
      open={props.open}
      title={title}
      className="mobile-sheet--action-review"
      onClose={props.onCancel}
      footer={
        <SheetActionFooter
          onCancel={props.onCancel}
          confirmLabel={confirmLabel}
          confirmLoading={props.loading}
          onConfirm={props.onConfirm}
        />
      }
    >
      <div className="mobile-action-review-meta">
        <div className="mobile-action-review-meta-row">
          <MobileLlojiBadge lloji={props.lloji} />
          <ReviewRouteMeta {...props} />
        </div>
        {dateTime ? <div className="mobile-action-review-meta-line">{dateTime}</div> : null}
        {pershkrimi ? (
          <div className="mobile-action-review-meta-line mobile-action-review-pershkrimi">
            {pershkrimi}
          </div>
        ) : null}
        <div className="mobile-action-review-meta-line mobile-action-review-count">
          {reviewProductCountLabel(displayItems.length)}
        </div>
      </div>

      <div className="mobile-action-review-list-wrap">
        <div
          ref={listRef}
          className={`mobile-list-stack mobile-action-review-list${listScrollable ? ' mobile-action-review-list--scrollable' : ''}`}
        >
          {displayItems.map((item) => (
            <MobileActionReviewProductRow
              key={item.key}
              item={item}
              products={props.products}
              showPrice={showPrice}
            />
          ))}
        </div>
        {showScrollAffordance ? (
          <>
            <div className="mobile-action-review-list-fade" aria-hidden="true" />
            <div
              className="mobile-action-review-scroll-affordance"
              aria-live="polite"
              aria-hidden={!showScrollAffordance}
            >
              <span className="mobile-action-review-scroll-chevron" aria-hidden="true">
                ↓
              </span>
              <span>{mobileReviewScrollAffordance(hiddenCount)}</span>
            </div>
          </>
        ) : null}
      </div>

      {showPrice ? (
        <div className="mobile-total-row mobile-action-review-total">
          <span>{totalLabel}:</span>
          <span className="mobile-num">{fmtEuro(props.total)}</span>
        </div>
      ) : null}
    </BottomSheet>
  )
}

import type { ActionBatch, ProductListItem } from '../../lib/api'
import { type Country } from '../../lib/country'
import { fmtEuro } from '../../lib/format'
import { formatActionDateTime } from '../../lib/actionMeta'
import type { ActionItemDraft } from '../../types/actionItem'
import {
  MOBILE_REVIEW_VISIBLE_ROWS,
  type ReviewLocation,
  ReviewRouteMeta,
  reviewProductCountLabel,
  reviewScrollHint,
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

export function MobileActionReviewSheet(props: MobileActionReviewSheetProps) {
  const showPrice = props.showPrice ?? true
  const displayItems = props.items.filter((i) => i.kodi_produktit.trim())
  const showScrollHint = displayItems.length > MOBILE_REVIEW_VISIBLE_ROWS
  const isTransfer = props.lloji === 'Transfer'
  const title = isTransfer ? 'Finalizo transfertën?' : 'Finalizo veprimin?'
  const totalLabel = isTransfer ? 'Totali i transfertës' : 'Totali i veprimit'
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
          confirmLabel={props.loading ? 'Duke finalizuar…' : 'Konfirmo'}
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

      <div className="mobile-list-stack mobile-action-review-list">
        {displayItems.map((item) => (
          <MobileActionReviewProductRow
            key={item.key}
            item={item}
            products={props.products}
            showPrice={showPrice}
          />
        ))}
      </div>

      {showScrollHint ? (
        <p className="mobile-action-review-scroll-hint" aria-live="polite">
          {reviewScrollHint(displayItems.length)}
        </p>
      ) : null}

      {showPrice ? (
        <div className="mobile-total-row mobile-action-review-total">
          <span>{totalLabel}:</span>
          <span className="mobile-num">{fmtEuro(props.total)}</span>
        </div>
      ) : null}
    </BottomSheet>
  )
}

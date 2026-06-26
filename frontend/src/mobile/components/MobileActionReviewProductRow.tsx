import type { ProductListItem } from '../../lib/api'
import { fmtEuro } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { effectiveSasia } from '../../types/actionItem'
import { getReviewProductLabel } from '../../features/actions/actionReviewShared'

export function MobileActionReviewProductRow(props: {
  item: ActionItemDraft
  products: ProductListItem[]
  showPrice?: boolean
}) {
  const showPrice = props.showPrice ?? true
  const qty = effectiveSasia(props.item.sasia)
  const price = Number(props.item.cmimi_njesi) || 0
  const lineTotal = showPrice ? price * qty : 0
  const label = getReviewProductLabel(props.item.kodi_produktit, props.products)
  const shenim = props.item.shenim.trim()

  return (
    <div className="mobile-row-card mobile-row-card-readonly mobile-action-review-row">
      <div className="mobile-row-card-body">
        <div className="mobile-row-card-title">{label}</div>
        <div className="mobile-row-card-sub">
          {showPrice ? `${fmtEuro(price)} × ${qty} cop` : `Sasia: ${qty} cop`}
        </div>
        {showPrice ? (
          <div className="mobile-row-card-total">Total: {fmtEuro(lineTotal)}</div>
        ) : null}
        {shenim ? (
          <div className="mobile-action-review-shenim" title={shenim}>
            Shënim: {shenim}
          </div>
        ) : null}
      </div>
    </div>
  )
}

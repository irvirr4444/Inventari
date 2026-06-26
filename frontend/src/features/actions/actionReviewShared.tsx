import type { ProductListItem } from '../../lib/api'
import { COUNTRY_META, type Country } from '../../lib/country'
import { countryHistoryLabel, countryLabel, productLabel } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { effectiveSasia } from '../../types/actionItem'

export type ReviewLocation = { emri: string; flagEmoji?: string | null }

export function ReviewLocationEndpoint(props: { location: ReviewLocation }) {
  return (
    <span className="action-review-transfer-endpoint">
      {props.location.flagEmoji ? (
        <span className="action-review-transfer-badge" aria-hidden="true">
          {props.location.flagEmoji}
        </span>
      ) : null}
      <span className="action-review-transfer-name">{props.location.emri}</span>
    </span>
  )
}

export function ReviewCountryEndpoint(props: { country: Country }) {
  const meta = COUNTRY_META[props.country]
  return (
    <span className="action-review-transfer-endpoint">
      <img className="flagIcon" src={meta.flagSrc} alt="" />
      <span className="action-review-transfer-name">{countryHistoryLabel(props.country)}</span>
    </span>
  )
}

export function ReviewRouteMeta(
  props:
    | {
        country: Country
        location?: never
        transferFrom?: never
        transferTo?: never
        transferFromLocation?: never
        transferToLocation?: never
      }
    | {
        location: ReviewLocation
        country?: never
        transferFrom?: never
        transferTo?: never
        transferFromLocation?: never
        transferToLocation?: never
      }
    | {
        transferFrom: Country
        transferTo: Country
        country?: never
        location?: never
        transferFromLocation?: never
        transferToLocation?: never
      }
    | {
        transferFromLocation: ReviewLocation
        transferToLocation: ReviewLocation
        country?: never
        location?: never
        transferFrom?: never
        transferTo?: never
      },
) {
  if ('transferFrom' in props && props.transferFrom) {
    return (
      <span className="action-review-transfer-route">
        <ReviewCountryEndpoint country={props.transferFrom} />
        <span className="action-review-transfer-arrow" aria-hidden="true">
          →
        </span>
        <ReviewCountryEndpoint country={props.transferTo} />
      </span>
    )
  }

  if ('transferFromLocation' in props && props.transferFromLocation) {
    return (
      <span className="action-review-transfer-route">
        <ReviewLocationEndpoint location={props.transferFromLocation} />
        <span className="action-review-transfer-arrow" aria-hidden="true">
          →
        </span>
        <ReviewLocationEndpoint location={props.transferToLocation} />
      </span>
    )
  }

  if ('location' in props && props.location) {
    return (
      <span className="action-review-meta-country">
        <ReviewLocationEndpoint location={props.location} />
      </span>
    )
  }

  const countryMeta = COUNTRY_META[props.country!]
  return (
    <span className="action-review-meta-country">
      <img className="flagIcon" src={countryMeta.flagSrc} alt="" />
      {countryLabel(props.country!)}
    </span>
  )
}

export function getReviewProductLabel(
  kodi: string,
  products: ProductListItem[],
): string {
  const product = products.find((p) => p.kodi === kodi)
  return product ? productLabel(product.emri, product.kodi) : kodi
}

export function getReviewLineTotal(item: ActionItemDraft, showPrice: boolean): number {
  if (!showPrice) return 0
  return (Number(item.cmimi_njesi) || 0) * effectiveSasia(item.sasia)
}

export const REVIEW_VISIBLE_ROWS = 10
export const MOBILE_REVIEW_VISIBLE_ROWS = 5

export function reviewProductCountLabel(count: number): string {
  return count === 1 ? '1 produkt' : `${count} produkte`
}

export function reviewScrollHint(count: number): string {
  return `↕ ${count} produkte — scroll për të parë të gjitha`
}

export function mobileReviewScrollAffordance(hiddenCount: number): string {
  if (hiddenCount <= 0) return 'Scroll për të parë të gjitha'
  if (hiddenCount === 1) return '1 më shumë'
  return `${hiddenCount} më shumë`
}

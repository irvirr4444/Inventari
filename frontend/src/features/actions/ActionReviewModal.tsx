import * as React from 'react'
import type { ProductListItem } from '../../lib/api'
import { COUNTRY_META, type Country } from '../../lib/country'
import { countryLabel, fmt, productLabel } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { effectiveSasia } from '../../types/actionItem'
import { NumericInput } from '../../components/NumericInput'
import { useEnterToConfirm } from '../../hooks/useEnterToConfirm'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { useFocusModalOnOpen } from '../../hooks/useFocusModalOnOpen'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import { LlojiBadge } from '../history/historyBadges'
import { ActionMetaDisplay } from './ActionMetaDisplay'
import { ActionItemShenim } from './ActionItemShenim'
import { formatActionDateTime } from '../../lib/actionMeta'

const REVIEW_TABLE_COL_WIDTHS_FULL = ['34%', '10%', '17%', '14%', '25%'] as const
const REVIEW_TABLE_COL_WIDTHS_NO_PRICE = ['58%', '20%', '22%'] as const
const REVIEW_VISIBLE_ROWS = 10

function ReviewTableColgroup(props: { widths: readonly string[] }) {
  return (
    <colgroup>
      {props.widths.map((width, i) => (
        <col key={i} style={{ width }} />
      ))}
    </colgroup>
  )
}

export function ActionReviewModal(
  props: {
    lloji: 'Hyrje' | 'Dalje'
    actionDate: string
    actionOra: string
    actionPershkrimi: string
    items: ActionItemDraft[]
    products: ProductListItem[]
    total: number
    loading: boolean
    onUpdateItem: (key: string, field: keyof ActionItemDraft, value: string | number) => void
    onCancel: () => void
    onConfirm: () => void
    onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
    showPrice?: boolean
  } & (
    | { country: Country; location?: never }
    | { location: { emri: string; flagEmoji?: string | null }; country?: never }
  ),
) {
  const showPrice = props.showPrice ?? true
  const columnWidths = showPrice ? REVIEW_TABLE_COL_WIDTHS_FULL : REVIEW_TABLE_COL_WIDTHS_NO_PRICE
  const displayItems = props.items.filter((i) => i.kodi_produktit.trim())
  const showScrollHint = displayItems.length > REVIEW_VISIBLE_ROWS
  const placeholderRowCount =
    displayItems.length < REVIEW_VISIBLE_ROWS
      ? REVIEW_VISIBLE_ROWS - displayItems.length
      : 0
  const countryMeta = props.country ? COUNTRY_META[props.country] : null

  const productByKodi = new Map(props.products.map((p) => [p.kodi, p]))
  const contentRef = React.useRef<HTMLDivElement>(null)

  useEnterToConfirm(props.onConfirm, { disabled: props.loading })
  useEscapeToClose(props.onCancel)
  useFocusModalOnOpen(contentRef, true)

  return (
    <div
      className="modal-overlay modal-overlay-stacked"
      onClick={(e) => !props.loading && handleOverlayDismiss(e, props.onCancel)}
    >
      <div
        ref={contentRef}
        className="modal-content action-review-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="action-review-header">
          <h3>Finalizo veprimin?</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={props.onCancel}
            disabled={props.loading}
            aria-label="Mbyll"
          >
            ×
          </button>
        </div>

        <div className="action-review-meta">
          <LlojiBadge lloji={props.lloji} />
          <span className="action-review-meta-country">
            {props.location ? (
              <>
                {props.location.flagEmoji ? (
                  <span className="flagIcon">{props.location.flagEmoji}</span>
                ) : null}
                {props.location.emri}
              </>
            ) : countryMeta ? (
              <>
                <img className="flagIcon" src={countryMeta.flagSrc} alt="" />
                {countryLabel(props.country!)}
              </>
            ) : null}
          </span>
          <span className="action-review-meta-sep" aria-hidden="true">
            ·
          </span>
          <span className="muted">{formatActionDateTime(props.actionDate, props.actionOra)}</span>
          <span className="action-review-meta-count muted">
            {displayItems.length === 1 ? '1 produkt' : `${displayItems.length} produkte`}
          </span>
        </div>
        <ActionMetaDisplay
          data={props.actionDate}
          ora={props.actionOra}
          pershkrimi={props.actionPershkrimi}
          showDate={false}
          className="action-review-meta-extra"
        />

        <div className="action-review-body">
          <table className="table table-fixed action-review-table action-review-table-head">
            <ReviewTableColgroup widths={columnWidths} />
            <thead>
              <tr>
                <th>Produkti</th>
                <th className="action-review-shenim-col">Shënim</th>
                {showPrice ? <th>Cmimi/Njesi</th> : null}
                <th>Sasia</th>
                {showPrice ? <th style={{ textAlign: 'right' }}>Totali</th> : null}
              </tr>
            </thead>
          </table>
          <div
            className={`action-review-rows${showScrollHint ? ' is-scrollable' : ''}`}
          >
            <table className="table table-fixed action-review-table action-review-table-body">
              <ReviewTableColgroup widths={columnWidths} />
              <tbody>
                {displayItems.map((it) => {
                  const product = productByKodi.get(it.kodi_produktit)
                  const label = product
                    ? productLabel(product.emri, product.kodi)
                    : it.kodi_produktit
                  const lineTotal =
                    (Number(it.cmimi_njesi) || 0) * effectiveSasia(it.sasia)

                  return (
                    <tr key={it.key}>
                      <td>
                        <span className="action-review-product" title={label}>
                          {label}
                        </span>
                      </td>
                      <td className="action-review-shenim-cell">
                        <ActionItemShenim
                          value={it.shenim}
                          onChange={(value) => props.onUpdateItem(it.key, 'shenim', value)}
                          onNotify={props.onNotify}
                          disabled={props.loading}
                          stacked
                          hideWhenEmpty
                          variant="review"
                        />
                      </td>
                      {showPrice ? (
                        <td>
                          <NumericInput
                            className="input"
                            step="0.01"
                            min={0}
                            value={it.cmimi_njesi}
                            onChange={(v) => props.onUpdateItem(it.key, 'cmimi_njesi', v)}
                            placeholder="0.00"
                            disabled={props.loading}
                            style={{ width: '100%' }}
                          />
                        </td>
                      ) : null}
                      <td>
                        <NumericInput
                          className="input"
                          min={1}
                          value={it.sasia}
                          onChange={(v) => props.onUpdateItem(it.key, 'sasia', v)}
                          placeholder="1"
                          disabled={props.loading}
                          style={{ width: '100%' }}
                        />
                      </td>
                      {showPrice ? (
                        <td style={{ textAlign: 'right' }}>
                          <span className="num">{fmt(lineTotal)}</span>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
                {Array.from({ length: placeholderRowCount }).map((_, i) => (
                  <tr
                    key={`placeholder-${i}`}
                    className="action-review-placeholder-row"
                    aria-hidden="true"
                  >
                    <td />
                    <td />
                    {showPrice ? <td /> : null}
                    <td />
                    {showPrice ? <td /> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className={`action-rows-scroll-hint${showScrollHint ? '' : ' is-hidden'}`}
            aria-live="polite"
            aria-hidden={!showScrollHint}
          >
            {showScrollHint
              ? `↕ ${displayItems.length} produkte — scroll për të parë të gjitha`
              : null}
          </p>
        </div>

        <div className="action-review-footer">
          {showPrice ? (
            <div className="history-expanded-total">
              Totali i veprimit: <strong className="num">{fmt(props.total)}</strong>
            </div>
          ) : null}
          <div className="action-review-actions">
            <button
              type="button"
              className="btn"
              onClick={props.onCancel}
              disabled={props.loading}
            >
              Anulo
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={props.onConfirm}
              disabled={props.loading}
            >
              {props.loading ? 'Duke finalizuar...' : 'Finalizo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

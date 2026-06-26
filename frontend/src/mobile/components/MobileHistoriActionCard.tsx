import type { ActionBatch } from '../../lib/api'
import { COUNTRY_META } from '../../lib/country'
import { countryLabel } from '../../lib/format'
import type { ReactNode } from 'react'

function MobileLlojiBadge(props: { lloji: ActionBatch['lloji'] }) {
  const cls =
    props.lloji === 'Hyrje'
      ? 'mobile-badge-hyrje'
      : props.lloji === 'Dalje'
        ? 'mobile-badge-dalje'
        : 'mobile-badge-transfer'
  return <span className={`mobile-badge ${cls}`}>{props.lloji}</span>
}

function DynamicLocationRoute(props: { action: ActionBatch }) {
  const { action } = props

  if (action.lloji === 'Transfer' && action.destination_lokacioni_emri) {
    return (
      <div className="mobile-histori-row-card__route">
        <span className="mobile-histori-row-card__location">
          <span className="mobile-histori-row-card__emoji" aria-hidden>
            {action.flag_emoji ?? '📍'}
          </span>
          <span className="mobile-histori-row-card__location-name">
            {action.lokacioni_emri ?? '—'}
          </span>
        </span>
        <span className="mobile-histori-row-card__route-arrow" aria-hidden>
          →
        </span>
        <span className="mobile-histori-row-card__location">
          <span className="mobile-histori-row-card__emoji" aria-hidden>
            {action.destination_flag_emoji ?? '📍'}
          </span>
          <span className="mobile-histori-row-card__location-name">
            {action.destination_lokacioni_emri}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="mobile-histori-row-card__route">
      <span className="mobile-histori-row-card__location">
        <span className="mobile-histori-row-card__emoji" aria-hidden>
          {action.flag_emoji ?? '📍'}
        </span>
        <span className="mobile-histori-row-card__location-name">
          {action.lokacioni_emri ?? '—'}
        </span>
      </span>
    </div>
  )
}

function LegacyLocationRoute(props: { action: ActionBatch }) {
  const { action } = props

  if (action.lloji === 'Transfer' && action.destination_shteti) {
    return (
      <div className="mobile-histori-row-card__route">
        <span className="mobile-histori-row-card__location">
          <img
            className="flagIcon mobile-histori-row-card__flag"
            src={COUNTRY_META[action.shteti].flagSrc}
            alt=""
            width={16}
            height={11}
          />
          <span className="mobile-histori-row-card__location-name">
            {countryLabel(action.shteti)}
          </span>
        </span>
        <span className="mobile-histori-row-card__route-arrow" aria-hidden>
          →
        </span>
        <span className="mobile-histori-row-card__location">
          <img
            className="flagIcon mobile-histori-row-card__flag"
            src={COUNTRY_META[action.destination_shteti].flagSrc}
            alt=""
            width={16}
            height={11}
          />
          <span className="mobile-histori-row-card__location-name">
            {countryLabel(action.destination_shteti)}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="mobile-histori-row-card__route">
      <span className="mobile-histori-row-card__location">
        <img
          className="flagIcon mobile-histori-row-card__flag"
          src={COUNTRY_META[action.shteti].flagSrc}
          alt=""
          width={16}
          height={11}
        />
        <span className="mobile-histori-row-card__location-name">
          {countryLabel(action.shteti)}
        </span>
      </span>
    </div>
  )
}

export function MobileHistoriActionCard(props: {
  action: ActionBatch
  dateTime: string
  summary: ReactNode
  variant: 'legacy' | 'dynamic'
  onClick: () => void
}) {
  const { action, dateTime, summary, variant, onClick } = props
  const pershkrimi = action.pershkrimi?.trim()

  return (
    <button type="button" className="mobile-row-card mobile-histori-row-card" onClick={onClick}>
      <div className="mobile-histori-row-card__header">
        <MobileLlojiBadge lloji={action.lloji} />
        <span className="mobile-histori-row-card__datetime">{dateTime}</span>
      </div>

      {pershkrimi ? (
        <p className="mobile-histori-row-card__pershkrimi" title={pershkrimi}>
          {pershkrimi}
        </p>
      ) : null}

      {variant === 'dynamic' ? (
        <DynamicLocationRoute action={action} />
      ) : (
        <LegacyLocationRoute action={action} />
      )}

      <div className="mobile-histori-row-card__footer">{summary}</div>
    </button>
  )
}

import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { DateInput } from '../../components/DateInput'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge } from '../../lib/lokacioni/LokacioniProvider'

function parseNumericFilter(value: string): number | '' {
  const trimmed = value.trim()
  if (trimmed === '') return ''
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : ''
}

export function DynamicHistoryFilterBar(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  locations: Lokacioni[]
  onServerFilterChange: (patch: Partial<HistoryServerFilters>) => void
  onClientFilterChange: (patch: Partial<HistoryClientFilters>) => void
  onClearAll: () => void
  showClearLink: boolean
}) {
  const toggleLocation = (id: string) => {
    const current = props.clientFilters.locationIds
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]
    props.onClientFilterChange({ locationIds: next })
  }

  return (
    <div className="history-filters-bar">
      <div className="history-filter-group history-filter-group-selects">
        <div className="history-filter-field">
          <span className="history-filter-group-label">Veprime</span>
          <select
            className="select history-filter-select"
            value={props.serverFilters.lloji ?? ''}
            onChange={(e) =>
              props.onServerFilterChange({
                lloji: (e.target.value || undefined) as HistoryServerFilters['lloji'],
              })
            }
          >
            <option value="">Te gjitha llojet</option>
            <option value="Hyrje">Hyrje</option>
            <option value="Dalje">Dalje</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group dynamic-history-locations">
        <span className="history-filter-group-label">Lokacioni</span>
        <div className="dynamic-history-location-checks">
          {props.locations.map((loc) => (
            <label key={loc.id} className="dynamic-history-location-check">
              <input
                type="checkbox"
                checked={props.clientFilters.locationIds.includes(loc.id)}
                onChange={() => toggleLocation(loc.id)}
              />
              <span>{locationBadge(loc)} {loc.emri}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-dates">
        <span className="history-filter-group-label">Data</span>
        <div className="history-filter-pair history-filter-pair-dates">
          <DateInput
            className="history-filter-date"
            value={props.serverFilters.dateFrom ?? ''}
            placeholder="Nga"
            onChange={(v) => props.onServerFilterChange({ dateFrom: v || undefined })}
          />
          <DateInput
            className="history-filter-date"
            value={props.serverFilters.dateTo ?? ''}
            placeholder="Deri"
            onChange={(v) => props.onServerFilterChange({ dateTo: v || undefined })}
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled">
        <span className="history-filter-group-label">Ora</span>
        <div className="history-filter-pair">
          <OraInput
            className="history-filter-ora"
            value={props.clientFilters.oraFrom}
            placeholder="Nga"
            onChange={(v) => props.onClientFilterChange({ oraFrom: v })}
          />
          <OraInput
            className="history-filter-ora"
            value={props.clientFilters.oraDeri}
            placeholder="Deri"
            onChange={(v) => props.onClientFilterChange({ oraDeri: v })}
          />
        </div>
      </div>

      <div className="history-filter-group history-filter-field">
        <span className="history-filter-group-label">Pershkrimi</span>
        <input
          className="input history-filter-text"
          value={props.clientFilters.pershkriminQuery}
          placeholder="Kerko…"
          onChange={(e) => props.onClientFilterChange({ pershkriminQuery: e.target.value })}
        />
      </div>

      <div className="history-filter-group history-filter-group-labeled">
        <span className="history-filter-group-label">Totali</span>
        <div className="history-filter-pair">
          <NumericInput
            className="history-filter-num"
            value={props.clientFilters.totaliMin}
            placeholder="Min"
            onChange={(v) =>
              props.onClientFilterChange({ totaliMin: parseNumericFilter(String(v)) })
            }
          />
          <NumericInput
            className="history-filter-num"
            value={props.clientFilters.totaliMax}
            placeholder="Max"
            onChange={(v) =>
              props.onClientFilterChange({ totaliMax: parseNumericFilter(String(v)) })
            }
          />
        </div>
      </div>

      <div className="history-filter-group history-filter-group-labeled">
        <span className="history-filter-group-label">Produkte</span>
        <div className="history-filter-pair">
          <NumericInput
            className="history-filter-num"
            value={props.clientFilters.produkteMin}
            placeholder="Min"
            onChange={(v) =>
              props.onClientFilterChange({ produkteMin: parseNumericFilter(String(v)) })
            }
          />
          <NumericInput
            className="history-filter-num"
            value={props.clientFilters.produkteMax}
            placeholder="Max"
            onChange={(v) =>
              props.onClientFilterChange({ produkteMax: parseNumericFilter(String(v)) })
            }
          />
        </div>
      </div>

      {props.showClearLink ? (
        <button type="button" className="btn sm ghost history-clear-filters" onClick={props.onClearAll}>
          Pastro filtrat
        </button>
      ) : null}
    </div>
  )
}

import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import { DateInput } from '../../components/DateInput'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'
import { parseNumericFilterValue } from '../../lib/numericInput'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { HistoryFilterClearButton } from '../history/HistoryFilterClearButton'

export function DynamicHistoryFilterBar(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  locations: Lokacioni[]
  onServerFilterChange: (patch: Partial<HistoryServerFilters>) => void
  onClientFilterChange: (patch: Partial<HistoryClientFilters>) => void
  onClearAll: () => void
  showClearLink: boolean
  showTotali?: boolean
}) {
  const {
    serverFilters,
    clientFilters,
    onServerFilterChange,
    onClientFilterChange,
    onClearAll,
    showClearLink,
  } = props
  const showTotali = props.showTotali ?? true
  const selectedLocationId = clientFilters.locationIds[0] ?? ''

  return (
    <div className="history-filters-bar">
      <div className="history-filters-primary">
      <div className="history-filter-group history-filter-group-selects">
        <div className="history-filter-field">
          <span className="history-filter-group-label">Veprime</span>
          <select
            className="select history-filter-select"
            value={serverFilters.lloji ?? ''}
            onChange={(e) =>
              onServerFilterChange({
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
        <div className="history-filter-field">
          <span className="history-filter-group-label">Lokacioni</span>
          <select
            className="select history-filter-select"
            value={selectedLocationId}
            onChange={(e) =>
              onClientFilterChange({
                locationIds: e.target.value ? [e.target.value] : [],
              })
            }
          >
            <option value="">Te gjitha lokacionet</option>
            {props.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.flag_emoji ? `${loc.flag_emoji} ` : ''}
                {loc.emri}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-dates">
        <span className="history-filter-group-label">Data</span>
        <div className="history-filter-pair history-filter-pair-dates">
          <DateInput
            className="history-filter-date"
            clearable
            value={serverFilters.dateFrom ?? ''}
            placeholder="Nga"
            onChange={(v) => onServerFilterChange({ dateFrom: v || undefined })}
          />
          <DateInput
            className="history-filter-date"
            clearable
            value={serverFilters.dateTo ?? ''}
            placeholder="Deri"
            onChange={(v) => onServerFilterChange({ dateTo: v || undefined })}
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-ora">
        <span className="history-filter-group-label">Ora</span>
        <div className="history-filter-pair history-filter-pair-ora">
          <OraInput
            wrapperClassName="history-filter-ora-wrap"
            clearable
            value={clientFilters.oraFrom}
            placeholder="Nga"
            onChange={(v) => onClientFilterChange({ oraFrom: v })}
          />
          <OraInput
            wrapperClassName="history-filter-ora-wrap"
            clearable
            value={clientFilters.oraDeri}
            placeholder="Deri"
            onChange={(v) => onClientFilterChange({ oraDeri: v })}
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      {showTotali ? (
        <>
          <div className="history-filter-group history-filter-group-labeled history-filter-group-totali">
            <span className="history-filter-group-label">Totali (€)</span>
            <div className="history-filter-pair">
              <NumericInput
                className="input history-filter-num"
                clearable
                hideZero={false}
                value={clientFilters.totaliMin}
                placeholder="Min"
                min={0}
                step="0.01"
                onChange={(v) => onClientFilterChange({ totaliMin: parseNumericFilterValue(v) })}
              />
              <NumericInput
                className="input history-filter-num"
                clearable
                hideZero={false}
                value={clientFilters.totaliMax}
                placeholder="Max"
                min={0}
                step="0.01"
                onChange={(v) => onClientFilterChange({ totaliMax: parseNumericFilterValue(v) })}
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="history-filter-group history-filter-group-labeled history-filter-group-produkte">
        <span className="history-filter-group-label">Produkte</span>
        <div className="history-filter-pair">
          <NumericInput
            className="input history-filter-num"
            clearable
            hideZero={false}
            value={clientFilters.produkteMin}
            placeholder="Min"
            min={0}
            step={1}
            onChange={(v) => onClientFilterChange({ produkteMin: parseNumericFilterValue(v) })}
          />
          <NumericInput
            className="input history-filter-num"
            clearable
            hideZero={false}
            value={clientFilters.produkteMax}
            placeholder="Max"
            min={0}
            step={1}
            onChange={(v) => onClientFilterChange({ produkteMax: parseNumericFilterValue(v) })}
          />
        </div>
      </div>
      </div>

      <div className="history-filters-search-row">
        <div className="history-filter-group history-filter-group-labeled history-filter-search">
          <span className="history-filter-group-label">Pershkrimi</span>
          <DebouncedSearchInput
            className="input history-filter-pershkrimi"
            clearable
            value={clientFilters.pershkriminQuery}
            placeholder="Kërko…"
            onChange={(v) => onClientFilterChange({ pershkriminQuery: v })}
          />
        </div>

        <div className="history-filter-group history-filter-group-labeled history-filter-search">
          <span className="history-filter-group-label">Shenim (produkt)</span>
          <DebouncedSearchInput
            className="input history-filter-pershkrimi"
            clearable
            value={serverFilters.shenim ?? ''}
            placeholder="Kërko…"
            onChange={(v) => onServerFilterChange({ shenim: v || undefined })}
          />
        </div>

        {showClearLink ? <HistoryFilterClearButton onClick={onClearAll} /> : null}
      </div>
    </div>
  )
}

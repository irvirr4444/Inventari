import type { Country } from '../../lib/country'
import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { DateInput } from '../../components/DateInput'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'

function parseNumericFilter(value: string): number | '' {
  const trimmed = value.trim()
  if (trimmed === '') return ''
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : ''
}

type HistoryFilterBarProps = {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  onServerFilterChange: (patch: Partial<HistoryServerFilters>) => void
  onClientFilterChange: (patch: Partial<HistoryClientFilters>) => void
  onClearAll: () => void
  showClearLink: boolean
}

export function HistoryFilterBar(props: HistoryFilterBarProps) {
  const {
    serverFilters,
    clientFilters,
    onServerFilterChange,
    onClientFilterChange,
    onClearAll,
    showClearLink,
  } = props

  return (
    <div className="history-filters-bar">
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
          <span className="history-filter-group-label">Shteti</span>
          <select
            className="select history-filter-select"
            value={serverFilters.shteti ?? ''}
            onChange={(e) =>
              onServerFilterChange({
                shteti: (e.target.value || undefined) as Country | undefined,
              })
            }
          >
            <option value="">Te gjitha shtetet</option>
            <option value="XK">Kosove</option>
            <option value="AL">Shqiperi</option>
          </select>
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-dates">
        <span className="history-filter-group-label">Data</span>
        <div className="history-filter-pair history-filter-pair-dates">
          <DateInput
            className="history-filter-date"
            value={serverFilters.dateFrom ?? ''}
            placeholder="Nga"
            onChange={(v) => onServerFilterChange({ dateFrom: v || undefined })}
          />
          <DateInput
            className="history-filter-date"
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
            value={clientFilters.oraFrom}
            placeholder="Nga"
            onChange={(v) => onClientFilterChange({ oraFrom: v })}
          />
          <OraInput
            wrapperClassName="history-filter-ora-wrap"
            value={clientFilters.oraDeri}
            placeholder="Deri"
            onChange={(v) => onClientFilterChange({ oraDeri: v })}
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-pershkrimi">
        <span className="history-filter-group-label">Pershkrimi</span>
        <input
          type="text"
          className="input history-filter-pershkrimi"
          value={clientFilters.pershkriminQuery}
          placeholder="Kërko…"
          onChange={(e) => onClientFilterChange({ pershkriminQuery: e.target.value })}
        />
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled">
        <span className="history-filter-group-label">Totali (€)</span>
        <div className="history-filter-pair">
          <NumericInput
            className="input history-filter-num"
            value={clientFilters.totaliMin}
            placeholder="Min"
            min={0}
            step="0.01"
            onChange={(v) => onClientFilterChange({ totaliMin: parseNumericFilter(v) })}
          />
          <NumericInput
            className="input history-filter-num"
            value={clientFilters.totaliMax}
            placeholder="Max"
            min={0}
            step="0.01"
            onChange={(v) => onClientFilterChange({ totaliMax: parseNumericFilter(v) })}
          />
        </div>
      </div>

      <div className="history-filter-group history-filter-group-labeled">
        <span className="history-filter-group-label">Produkte</span>
        <div className="history-filter-pair">
          <NumericInput
            className="input history-filter-num"
            value={clientFilters.produkteMin}
            placeholder="Min"
            min={0}
            step={1}
            onChange={(v) => onClientFilterChange({ produkteMin: parseNumericFilter(v) })}
          />
          <NumericInput
            className="input history-filter-num"
            value={clientFilters.produkteMax}
            placeholder="Max"
            min={0}
            step={1}
            onChange={(v) => onClientFilterChange({ produkteMax: parseNumericFilter(v) })}
          />
        </div>
      </div>

      {showClearLink && (
        <button
          type="button"
          className="history-filter-clear"
          aria-label="Pastro filtrat"
          onClick={onClearAll}
        >
          × Pastro filtrat
        </button>
      )}
    </div>
  )
}

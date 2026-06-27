import type { Country } from '../../lib/country'
import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { parseNumericFilterValue } from '../../lib/numericInput'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import { DateRangeInput } from '../../components/DateRangeInput'
import { NumericInput } from '../../components/NumericInput'
import { OraRangeInput } from '../../components/OraRangeInput'
import { HistoryFilterClearButton } from './HistoryFilterClearButton'
import { HistoryExportActions } from './HistoryExportActions'

type HistoryFilterBarProps = {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  onServerFilterChange: (patch: Partial<HistoryServerFilters>) => void
  onClientFilterChange: (patch: Partial<HistoryClientFilters>) => boolean | void
  onClearAll: () => void
  showClearLink: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}

export function HistoryFilterBar(props: HistoryFilterBarProps) {
  const {
    serverFilters,
    clientFilters,
    onServerFilterChange,
    onClientFilterChange,
    onClearAll,
    showClearLink,
    onNotify,
  } = props

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
            <option value="">Të gjitha llojet</option>
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
            <option value="">Të gjitha shtetet</option>
            <option value="XK">Kosove</option>
            <option value="AL">Shqiperi</option>
          </select>
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-dates">
        <span className="history-filter-group-label">Data</span>
        <div className="history-filter-pair history-filter-pair-dates">
          <DateRangeInput
            clearable
            from={serverFilters.dateFrom ?? ''}
            to={serverFilters.dateTo ?? ''}
            fromClassName="history-filter-date"
            toClassName="history-filter-date"
            fromPlaceholder="Nga"
            toPlaceholder="Deri"
            onRangeChange={(from, to) =>
              onServerFilterChange({
                dateFrom: from || undefined,
                dateTo: to || undefined,
              })
            }
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-ora">
        <span className="history-filter-group-label">Ora</span>
        <div className="history-filter-pair history-filter-pair-ora">
          <OraRangeInput
            clearable
            from={clientFilters.oraFrom}
            to={clientFilters.oraDeri}
            fromWrapperClassName="history-filter-ora-wrap"
            toWrapperClassName="history-filter-ora-wrap"
            fromPlaceholder="Nga"
            toPlaceholder="Deri"
            onFromChange={(v) => onClientFilterChange({ oraFrom: v })}
            onToChange={(v) => onClientFilterChange({ oraDeri: v })}
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

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
          <span className="history-filter-group-label">Përshkrimi</span>
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
        <HistoryExportActions
          serverFilters={serverFilters}
          clientFilters={clientFilters}
          onNotify={onNotify}
        />
      </div>
    </div>
  )
}

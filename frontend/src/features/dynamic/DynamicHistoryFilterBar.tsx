import * as React from 'react'
import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import { DateRangeInput } from '../../components/DateRangeInput'
import {
  HistoryUserFilterDropdown,
  type HistoryUserFilterOption,
} from '../../components/HistoryUserFilterDropdown'
import { NumericInput } from '../../components/NumericInput'
import { OraRangeInput } from '../../components/OraRangeInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'
import type { ProductListItem } from '../../lib/api'
import { parseNumericFilterValue } from '../../lib/numericInput'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { HistoryFilterClearButton } from '../history/HistoryFilterClearButton'
import { HistoryExportActions } from '../history/HistoryExportActions'

export type { HistoryUserFilterOption }

const NUMERIC_FILTER_DEBOUNCE_MS = 1_000

type NumericFilterDraftValue = number | string

type NumericFilterDrafts = {
  totaliMin: NumericFilterDraftValue
  totaliMax: NumericFilterDraftValue
  produkteMin: NumericFilterDraftValue
  produkteMax: NumericFilterDraftValue
}

type NumericFilterDraftKey = keyof NumericFilterDrafts

function numericDraftsFromClientFilters(filters: HistoryClientFilters): NumericFilterDrafts {
  return {
    totaliMin: filters.totaliMin,
    totaliMax: filters.totaliMax,
    produkteMin: filters.produkteMin,
    produkteMax: filters.produkteMax,
  }
}

function parseNumericDraft(value: NumericFilterDrafts[keyof NumericFilterDrafts]): number | '' {
  return typeof value === 'number' ? value : parseNumericFilterValue(value)
}

function numericDraftsAreEqual(a: NumericFilterDrafts, b: NumericFilterDrafts): boolean {
  return (
    a.totaliMin === b.totaliMin &&
    a.totaliMax === b.totaliMax &&
    a.produkteMin === b.produkteMin &&
    a.produkteMax === b.produkteMax
  )
}

export function DynamicHistoryFilterBar(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  locations: Lokacioni[]
  products: ProductListItem[]
  users: HistoryUserFilterOption[]
  onServerFilterChange: (patch: Partial<HistoryServerFilters>) => void
  onClientFilterChange: (patch: Partial<HistoryClientFilters>) => boolean | void
  onClearAll: () => void
  showClearLink: boolean
  showUserFilter?: boolean
  showTotali?: boolean
  trackPrice?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
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
  const onClientFilterChangeRef = React.useRef(onClientFilterChange)
  const [lastAppliedNumericDrafts, setLastAppliedNumericDrafts] =
    React.useState<NumericFilterDrafts>(() => numericDraftsFromClientFilters(clientFilters))
  const [numericDrafts, setNumericDrafts] = React.useState<NumericFilterDrafts>(() =>
    numericDraftsFromClientFilters(clientFilters),
  )
  const [showNumericProgress, setShowNumericProgress] = React.useState(false)

  React.useEffect(() => {
    onClientFilterChangeRef.current = onClientFilterChange
  }, [onClientFilterChange])

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    const next: NumericFilterDrafts = {
      totaliMin: clientFilters.totaliMin,
      totaliMax: clientFilters.totaliMax,
      produkteMin: clientFilters.produkteMin,
      produkteMax: clientFilters.produkteMax,
    }
    if (numericDraftsAreEqual(lastAppliedNumericDrafts, next)) return
    setLastAppliedNumericDrafts(next)
    setNumericDrafts(next)
  }, [
    lastAppliedNumericDrafts,
    clientFilters.totaliMin,
    clientFilters.totaliMax,
    clientFilters.produkteMin,
    clientFilters.produkteMax,
  ])

  React.useEffect(() => {
    if (numericDraftsAreEqual(lastAppliedNumericDrafts, numericDrafts)) return

    setShowNumericProgress(false)

    const progressTimer = window.setTimeout(() => {
      setShowNumericProgress(true)
    }, NUMERIC_FILTER_DEBOUNCE_MS / 2)

    const timeoutId = window.setTimeout(() => {
      onClientFilterChangeRef.current({
        totaliMin: parseNumericDraft(numericDrafts.totaliMin),
        totaliMax: parseNumericDraft(numericDrafts.totaliMax),
        produkteMin: parseNumericDraft(numericDrafts.produkteMin),
        produkteMax: parseNumericDraft(numericDrafts.produkteMax),
      })
      setShowNumericProgress(false)
    }, NUMERIC_FILTER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(progressTimer)
      window.clearTimeout(timeoutId)
    }
  }, [lastAppliedNumericDrafts, numericDrafts])
  /* eslint-enable react-hooks/set-state-in-effect */

  const numericFieldIsPending = (key: NumericFilterDraftKey) =>
    numericDrafts[key] !== lastAppliedNumericDrafts[key]

  const renderNumericFilter = (
    key: NumericFilterDraftKey,
    placeholder: string,
    step: string | number,
  ) => {
    const isPending = numericFieldIsPending(key)
    return (
      <span
        className={[
          'debounced-search-input',
          showNumericProgress && isPending ? 'debounced-search-input--pending' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <NumericInput
          className="input history-filter-num debounced-search-input__field"
          clearable
          hideZero={false}
          value={numericDrafts[key]}
          placeholder={placeholder}
          min={0}
          step={step}
          aria-busy={isPending}
          onChange={(v) => setNumericDrafts((prev) => ({ ...prev, [key]: v }))}
        />
        {showNumericProgress && isPending ? (
          <span
            className="debounced-search-input__progress"
            style={{ animationDuration: `${NUMERIC_FILTER_DEBOUNCE_MS / 2}ms` }}
            aria-hidden="true"
          />
        ) : null}
      </span>
    )
  }

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
          <span className="history-filter-group-label">Vendndodhja</span>
          <select
            className="select history-filter-select"
            value={selectedLocationId}
            onChange={(e) =>
              onClientFilterChange({
                locationIds: e.target.value ? [e.target.value] : [],
              })
            }
          >
            <option value="">Të gjitha vendndodhjet</option>
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

      {showTotali ? (
        <>
          <div className="history-filter-group history-filter-group-labeled history-filter-group-totali">
            <span className="history-filter-group-label">Totali (€)</span>
            <div className="history-filter-pair">
              {renderNumericFilter('totaliMin', 'Min', '0.01')}
              {renderNumericFilter('totaliMax', 'Max', '0.01')}
            </div>
          </div>
        </>
      ) : null}

      <div className="history-filter-group history-filter-group-labeled history-filter-group-produkte">
        <span className="history-filter-group-label">Produkte</span>
        <div className="history-filter-pair">
          {renderNumericFilter('produkteMin', 'Min', 1)}
          {renderNumericFilter('produkteMax', 'Max', 1)}
        </div>
      </div>
      </div>

      <div className="history-filters-search-row">
        <div className="history-filter-group history-filter-group-labeled history-filter-product">
          <span className="history-filter-group-label">Produkti</span>
          <ProductSearchSelect
            products={props.products}
            value={serverFilters.kodiProduktit ?? ''}
            clearable
            clearLabel="Të gjitha produktet"
            placeholder="Kërko produkt…"
            aria-label="Filtro sipas produktit"
            onChange={(kodi) => onServerFilterChange({ kodiProduktit: kodi || undefined })}
          />
        </div>

        {props.showUserFilter ? (
          <div className="history-filter-group history-filter-group-labeled history-filter-user">
            <span className="history-filter-group-label">Përdorues</span>
            <HistoryUserFilterDropdown
              users={props.users}
              value={serverFilters.createdByUserId ?? ''}
              onChange={(id) => onServerFilterChange({ createdByUserId: id || undefined })}
            />
          </div>
        ) : null}

        <div className="history-filter-group history-filter-group-labeled history-filter-search">
          <span className="history-filter-group-label">Përshkrimi (veprimi)</span>
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
          trackPrice={props.trackPrice}
          onNotify={props.onNotify}
        />
      </div>
    </div>
  )
}

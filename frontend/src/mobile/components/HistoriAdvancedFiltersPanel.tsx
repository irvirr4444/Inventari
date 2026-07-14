import type { HistoryClientFilters, HistoryFilterRangeIssue } from '../../lib/historyClientFilters'
import { getHistoryFilterRangeIssueMessage } from '../../lib/historyClientFilters'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import {
  HistoryUserFilterDropdown,
  type HistoryUserFilterOption,
} from '../../components/HistoryUserFilterDropdown'
import { InputClearButton } from '../../components/InputClearButton'
import { NumericInput } from '../../components/NumericInput'
import { OraRangeInput, type OraRangeChangeHandler } from '../../components/OraRangeInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'
import type { ProductListItem } from '../../lib/api'
import { parseNumericFilterValue } from '../../lib/numericInput'
import { HistoryFilterRangeError } from '../../features/history/HistoryFilterRangeError'
import { BottomSheet } from './BottomSheet'
import { SheetFooterRow } from './SheetActions'
import { MobileDateRangeInput } from './MobileDateRangeInput'

export type MobileHistoryUserFilterOption = HistoryUserFilterOption

type HistoriAdvancedFiltersPanelProps = {
  open: boolean
  onClose: () => void
  draft: HistoryClientFilters
  dateFrom: string
  dateTo: string
  shenim: string
  kodiProduktit: string
  createdByUserId: string
  products: ProductListItem[]
  users?: MobileHistoryUserFilterOption[]
  rangeIssues?: HistoryFilterRangeIssue[]
  showUserFilter?: boolean
  showTotali?: boolean
  onDraftChange: (patch: Partial<HistoryClientFilters>) => void
  onOraFromChange: OraRangeChangeHandler
  onOraToChange: OraRangeChangeHandler
  onDateRangeChange: (from: string, to: string) => void
  onShenimChange: (value: string) => void
  onKodiProduktitChange: (value: string) => void
  onCreatedByUserIdChange: (value: string) => void
  onApply: () => void
  onClear: () => void
}

export function HistoriAdvancedFiltersPanel(props: HistoriAdvancedFiltersPanelProps) {
  const {
    open,
    onClose,
    draft,
    dateFrom,
    dateTo,
    shenim,
    kodiProduktit,
    createdByUserId,
    rangeIssues = [],
    onDraftChange,
    onOraFromChange,
    onOraToChange,
    onDateRangeChange,
    onShenimChange,
    onKodiProduktitChange,
    onCreatedByUserIdChange,
    onApply,
    onClear,
  } = props
  const showTotali = props.showTotali ?? true

  return (
    <BottomSheet
      open={open}
      title="Filtrat e avancuara"
      className="mobile-sheet--advanced-filters"
      onClose={onClose}
      onEnterConfirm={onApply}
      footer={
        <SheetFooterRow>
          <button type="button" className="mobile-sheet-btn mobile-sheet-btn-secondary" onClick={onClear}>
            Fshi te gjitha
          </button>
          <button type="button" className="mobile-sheet-btn mobile-sheet-btn-primary" onClick={onApply}>
            Apliko
          </button>
        </SheetFooterRow>
      }
    >
      <div className="mobile-advanced-filters-sheet">
        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Data</div>
          <MobileDateRangeInput
            from={dateFrom}
            to={dateTo}
            clearable
            fromPlaceholder="Nga"
            toPlaceholder="Deri"
            onRangeChange={onDateRangeChange}
          />
          <HistoryFilterRangeError message={getHistoryFilterRangeIssueMessage(rangeIssues, 'date')} />
        </div>

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Ora</div>
          <OraRangeInput
            clearable
            from={draft.oraFrom}
            to={draft.oraDeri}
            fromClassName="mobile-input"
            toClassName="mobile-input"
            fromPlaceholder="Nga"
            toPlaceholder="Deri"
            onFromChange={onOraFromChange}
            onToChange={onOraToChange}
          />
          <HistoryFilterRangeError message={getHistoryFilterRangeIssueMessage(rangeIssues, 'ora')} />
        </div>

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Përshkrimi (veprimi)</div>
          <span
            className={`clearable-field${draft.pershkriminQuery.trim() ? ' clearable-field--has-value' : ''}`}
          >
            <input
              type="text"
              className="mobile-input clearable-field__control"
              value={draft.pershkriminQuery}
              placeholder="Kërko..."
              onChange={(e) => onDraftChange({ pershkriminQuery: e.target.value })}
            />
            <InputClearButton
              className="clearable-field__clear"
              onClick={() => onDraftChange({ pershkriminQuery: '' })}
            />
          </span>
        </div>

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Produkti</div>
          <ProductSearchSelect
            products={props.products}
            value={kodiProduktit}
            clearable
            clearLabel="Të gjitha produktet"
            placeholder="Kërko produkt…"
            aria-label="Filtro sipas produktit"
            onChange={onKodiProduktitChange}
          />
        </div>

        {props.showUserFilter ? (
          <div className="mobile-advanced-filters-section">
            <div className="mobile-section-label">Personi</div>
            <HistoryUserFilterDropdown
              users={props.users ?? []}
              value={createdByUserId}
              clearLabel="Të gjithë personat"
              placeholder="Kërko person…"
              emptyLabel="Nuk u gjet person."
              listAriaLabel="Lista e personave"
              aria-label="Filtro sipas personit"
              listCountLabel={(count) => `${count} persona — kerko ose zgjedh nga lista`}
              onChange={onCreatedByUserIdChange}
            />
          </div>
        ) : null}

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Shenim (produkt)</div>
          <DebouncedSearchInput
            className="mobile-input"
            clearable
            value={shenim}
            placeholder="Kërko…"
            onChange={onShenimChange}
          />
        </div>

        {showTotali ? (
          <div className="mobile-advanced-filters-section">
            <div className="mobile-section-label">Totali (€)</div>
            <div className="mobile-advanced-filters-grid">
              <div>
                <label className="mobile-label" htmlFor="histori-filter-totali-min">
                  Min
                </label>
                <NumericInput
                  id="histori-filter-totali-min"
                  className="mobile-input"
                  hideZero={false}
                  clearable
                  value={draft.totaliMin}
                  placeholder="Min"
                  min={0}
                  step="0.01"
                  onChange={(v) => onDraftChange({ totaliMin: parseNumericFilterValue(v) })}
                />
              </div>
              <div>
                <label className="mobile-label" htmlFor="histori-filter-totali-max">
                  Max
                </label>
                <NumericInput
                  id="histori-filter-totali-max"
                  className="mobile-input"
                  hideZero={false}
                  clearable
                  value={draft.totaliMax}
                  placeholder="Max"
                  min={0}
                  step="0.01"
                  onChange={(v) => onDraftChange({ totaliMax: parseNumericFilterValue(v) })}
                />
              </div>
            </div>
            <HistoryFilterRangeError message={getHistoryFilterRangeIssueMessage(rangeIssues, 'totali')} />
          </div>
        ) : null}

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Produkte</div>
          <div className="mobile-advanced-filters-grid">
            <div>
              <label className="mobile-label" htmlFor="histori-filter-produkte-min">
                Min
              </label>
              <NumericInput
                id="histori-filter-produkte-min"
                className="mobile-input"
                hideZero={false}
                clearable
                value={draft.produkteMin}
                placeholder="Min"
                min={0}
                step={1}
                onChange={(v) => onDraftChange({ produkteMin: parseNumericFilterValue(v) })}
              />
            </div>
            <div>
              <label className="mobile-label" htmlFor="histori-filter-produkte-max">
                Max
              </label>
              <NumericInput
                id="histori-filter-produkte-max"
                className="mobile-input"
                hideZero={false}
                clearable
                value={draft.produkteMax}
                placeholder="Max"
                min={0}
                step={1}
                onChange={(v) => onDraftChange({ produkteMax: parseNumericFilterValue(v) })}
              />
            </div>
          </div>
          <HistoryFilterRangeError message={getHistoryFilterRangeIssueMessage(rangeIssues, 'produkte')} />
        </div>
      </div>
    </BottomSheet>
  )
}

import type { HistoryClientFilters } from '../../lib/historyClientFilters'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import { InputClearButton } from '../../components/InputClearButton'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'
import { parseNumericFilterValue } from '../../lib/numericInput'
import { BottomSheet } from './BottomSheet'
import { SheetFooterRow } from './SheetActions'
import { MobileDateInput } from './MobileDateInput'

type HistoriAdvancedFiltersPanelProps = {
  open: boolean
  onClose: () => void
  draft: HistoryClientFilters
  dateFrom: string
  dateTo: string
  shenim: string
  showTotali?: boolean
  onDraftChange: (patch: Partial<HistoryClientFilters>) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onShenimChange: (value: string) => void
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
    onDraftChange,
    onDateFromChange,
    onDateToChange,
    onShenimChange,
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
            Pastro
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
          <div className="mobile-advanced-filters-grid">
            <div>
              <label className="mobile-label">Nga</label>
              <MobileDateInput
                value={dateFrom}
                placeholder="Nga"
                aria-label="Nga data"
                clearable
                onChange={onDateFromChange}
              />
            </div>
            <div>
              <label className="mobile-label">Deri</label>
              <MobileDateInput
                value={dateTo}
                placeholder="Deri"
                aria-label="Deri data"
                clearable
                onChange={onDateToChange}
              />
            </div>
          </div>
        </div>

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Ora</div>
          <div className="mobile-advanced-filters-grid">
            <div>
              <label className="mobile-label" htmlFor="histori-filter-ora-from">
                Nga ora
              </label>
              <OraInput
                id="histori-filter-ora-from"
                className="mobile-input"
                value={draft.oraFrom}
                placeholder="Nga"
                clearable
                onChange={(v) => onDraftChange({ oraFrom: v })}
              />
            </div>
            <div>
              <label className="mobile-label" htmlFor="histori-filter-ora-deri">
                Deri ora
              </label>
              <OraInput
                id="histori-filter-ora-deri"
                className="mobile-input"
                value={draft.oraDeri}
                placeholder="Deri"
                clearable
                onChange={(v) => onDraftChange({ oraDeri: v })}
              />
            </div>
          </div>
        </div>

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Pershkrimi</div>
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
        </div>
      </div>
    </BottomSheet>
  )
}

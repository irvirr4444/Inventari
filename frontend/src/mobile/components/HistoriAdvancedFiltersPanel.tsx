import type { HistoryClientFilters } from '../../lib/historyClientFilters'
import { NumericInput } from '../../components/NumericInput'
import { OraInput } from '../../components/OraInput'
import { parseNumericFilterValue } from '../../lib/numericInput'

type HistoriAdvancedFiltersPanelProps = {
  open: boolean
  draft: HistoryClientFilters
  showTotali?: boolean
  onDraftChange: (patch: Partial<HistoryClientFilters>) => void
  onApply: () => void
  onClear: () => void
}

export function HistoriAdvancedFiltersPanel(props: HistoriAdvancedFiltersPanelProps) {
  const { open, draft, onDraftChange, onApply, onClear } = props
  const showTotali = props.showTotali ?? true

  return (
    <div
      className={`mobile-advanced-filters-panel${open ? ' open' : ''}`}
      aria-hidden={!open}
    >
      <div className="mobile-advanced-filters-panel-inner">
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
                onChange={(v) => onDraftChange({ oraDeri: v })}
              />
            </div>
          </div>
        </div>

        <div className="mobile-advanced-filters-section">
          <div className="mobile-section-label">Pershkrimi</div>
          <input
            type="text"
            className="mobile-input"
            value={draft.pershkriminQuery}
            placeholder="Kërko përshkrim…"
            onChange={(e) => onDraftChange({ pershkriminQuery: e.target.value })}
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
                value={draft.produkteMax}
                placeholder="Max"
                min={0}
                step={1}
                onChange={(v) => onDraftChange({ produkteMax: parseNumericFilterValue(v) })}
              />
            </div>
          </div>
        </div>

        <div className="mobile-advanced-filters-actions">
          <button type="button" className="mobile-btn-outline" onClick={onClear}>
            Pastro
          </button>
          <button type="button" className="mobile-btn-primary" onClick={onApply}>
            Apliko
          </button>
        </div>
      </div>
    </div>
  )
}

import type { SummaryGroupBy } from '@inventari/shared'
import { DropdownMenu } from '../../components/DropdownMenu'
import { SUMMARY_GROUP_BY_OPTIONS, summaryGroupByLabel } from './summaryGroupBy'

export function SummaryGroupByControl(props: {
  value: SummaryGroupBy
  onChange: (value: SummaryGroupBy) => void
  className?: string
}) {
  return (
    <div className={['summary-group-by', props.className].filter(Boolean).join(' ')}>
      <span className="summary-group-by-label">Sipas</span>
      <DropdownMenu
        className="summary-group-by-menu"
        menuClassName="summary-group-by-menu-panel"
        align="end"
        trigger={({ open, triggerProps }) => (
          <button
            {...triggerProps}
            className={`btn sm summary-group-by-trigger${open ? ' is-open' : ''}`}
            aria-label="Grupo sipas"
          >
            <span>{summaryGroupByLabel(props.value)}</span>
            <svg
              className="summary-group-by-chevron"
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      >
        {(close) => (
          <>
            {SUMMARY_GROUP_BY_OPTIONS.map((opt) => {
              const selected = props.value === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`summary-group-by-menu-item${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    close()
                    if (!selected) props.onChange(opt.value)
                  }}
                >
                  <span>{opt.label}</span>
                  {selected ? (
                    <svg
                      aria-hidden="true"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  ) : null}
                </button>
              )
            })}
          </>
        )}
      </DropdownMenu>
    </div>
  )
}

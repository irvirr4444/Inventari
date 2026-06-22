import * as React from 'react'
import {
  MONTHS_SQ,
  WEEKDAYS_SQ,
  buildMonthGrid,
  isoToDate,
  sameDay,
  toIsoDate,
} from '../lib/datePicker'

export function DatePickerCalendar(props: {
  value: string
  onChange: (iso: string) => void
  className?: string
  clearable?: boolean
}) {
  const [viewMonth, setViewMonth] = React.useState(
    () => isoToDate(props.value) ?? new Date(),
  )

  React.useEffect(() => {
    if (!props.value) return
    const next = isoToDate(props.value)
    if (next) setViewMonth(next)
  }, [props.value])

  const selected = isoToDate(props.value)
  const today = React.useMemo(() => new Date(), [])
  const grid = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth])

  const pickDate = (iso: string) => {
    props.onChange(iso)
  }

  return (
    <div className={['date-picker-calendar', props.className].filter(Boolean).join(' ')}>
      <div className="date-picker-header">
        <button
          type="button"
          className="date-picker-nav"
          aria-label="Muaji i meparshem"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <span className="date-picker-title">
          {MONTHS_SQ[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          className="date-picker-nav"
          aria-label="Muaji tjeter"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>

      <div className="date-picker-weekdays">
        {WEEKDAYS_SQ.map((day, i) => (
          <span key={`${day}-${i}`} className="date-picker-weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="date-picker-grid">
        {grid.map((cell) => {
          const isSelected = selected ? sameDay(cell.date, selected) : false
          const isToday = sameDay(cell.date, today)
          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'date-picker-day',
                !cell.inMonth && 'muted',
                isSelected && 'selected',
                isToday && 'today',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pickDate(cell.iso)}
            >
              {cell.date.getDate()}
            </button>
          )
        })}
      </div>

      <div
        className={[
          'date-picker-footer',
          props.clearable ? 'date-picker-footer--clearable' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {props.clearable ? (
          <button
            type="button"
            className="date-picker-footer-btn"
            disabled={!props.value}
            onClick={() => pickDate('')}
          >
            Pastro
          </button>
        ) : null}
        <button
          type="button"
          className="date-picker-footer-btn primary"
          onClick={() => pickDate(toIsoDate(today))}
        >
          Sot
        </button>
      </div>
    </div>
  )
}

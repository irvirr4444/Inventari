import * as React from 'react'
import {
  MONTHS_SQ,
  WEEKDAYS_SQ,
  buildMonthGrid,
  getDateRangeDayState,
  isoToDate,
  normalizeIsoDateRange,
  sameDay,
  toIsoDate,
} from '../lib/datePicker'

type DatePickerCalendarProps = {
  className?: string
  clearable?: boolean
  value?: string
  onChange?: (iso: string) => void
  rangeFrom?: string
  rangeTo?: string
  selectingEndpoint?: 'from' | 'to'
  onRangeChange?: (from: string, to: string) => void
  onRangeComplete?: () => void
}

export function DatePickerCalendar(props: DatePickerCalendarProps) {
  const isRangeMode = Boolean(props.onRangeChange)
  const rangeFrom = props.rangeFrom ?? ''
  const rangeTo = props.rangeTo ?? ''

  const [viewMonth, setViewMonth] = React.useState(() => {
    const seed = props.value || rangeFrom || rangeTo
    return isoToDate(seed) ?? new Date()
  })
  const [hoverIso, setHoverIso] = React.useState<string | null>(null)

  React.useEffect(() => {
    const seed = props.value || rangeFrom || rangeTo
    if (!seed) return
    const next = isoToDate(seed)
    if (next) setViewMonth(next)
  }, [props.value, rangeFrom, rangeTo])

  const selected = isoToDate(props.value ?? '')
  const today = React.useMemo(() => new Date(), [])
  const grid = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth])

  const pickSingleDate = (iso: string) => {
    props.onChange?.(iso)
  }

  const pickRangeEndpointOnly = (iso: string) => {
    if (!props.onRangeChange) return

    const endpoint = props.selectingEndpoint ?? 'from'
    const nextFrom = endpoint === 'from' ? iso : rangeFrom
    const nextTo = endpoint === 'to' ? iso : rangeTo
    const [from, to] = normalizeIsoDateRange(nextFrom, nextTo)
    props.onRangeChange(from, to)
    props.onRangeComplete?.()
  }

  const pickRangeDate = (iso: string) => {
    if (!props.onRangeChange) return

    if (props.selectingEndpoint) {
      pickRangeEndpointOnly(iso)
      return
    }

    const endpoint = props.selectingEndpoint ?? 'from'

    if (endpoint === 'from' && rangeTo) {
      const [from, to] = normalizeIsoDateRange(iso, rangeTo)
      props.onRangeChange(from, to)
      props.onRangeComplete?.()
      return
    }

    if (!rangeFrom || (rangeFrom && rangeTo)) {
      props.onRangeChange(iso, '')
      return
    }

    const [from, to] = normalizeIsoDateRange(rangeFrom, iso)
    props.onRangeChange(from, to)
    props.onRangeComplete?.()
  }

  const pickDate = (iso: string) => {
    if (isRangeMode) pickRangeDate(iso)
    else pickSingleDate(iso)
  }

  const clickDeferRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRangeClick = (iso: string) => {
    if (clickDeferRef.current) clearTimeout(clickDeferRef.current)
    clickDeferRef.current = setTimeout(() => {
      clickDeferRef.current = null
      pickDate(iso)
    }, 220)
  }

  const handleDayDoubleClick = (iso: string) => {
    if (!isRangeMode) return
    if (clickDeferRef.current) {
      clearTimeout(clickDeferRef.current)
      clickDeferRef.current = null
    }
    pickRangeEndpointOnly(iso)
  }

  React.useEffect(() => {
    return () => {
      if (clickDeferRef.current) clearTimeout(clickDeferRef.current)
    }
  }, [])

  const clearRange = () => {
    props.onRangeChange?.('', '')
  }

  const hasRangeSelection = Boolean(rangeFrom || rangeTo)

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

      <div
        className="date-picker-grid"
        onMouseLeave={() => setHoverIso(null)}
      >
        {grid.map((cell) => {
          const isSelected = !isRangeMode && selected ? sameDay(cell.date, selected) : false
          const isToday = sameDay(cell.date, today)
          const rangeState = isRangeMode
            ? getDateRangeDayState(cell.iso, rangeFrom, rangeTo, hoverIso ?? undefined)
            : null

          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'date-picker-day',
                !cell.inMonth && 'muted',
                isSelected && 'selected',
                isToday && 'today',
                rangeState === 'single' && 'range-single',
                rangeState === 'start' && 'range-start',
                rangeState === 'end' && 'range-end',
                rangeState === 'in-range' && 'in-range',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => {
                if (isRangeMode && rangeFrom && !rangeTo) setHoverIso(cell.iso)
              }}
              onClick={() => {
                if (isRangeMode) {
                  if (props.selectingEndpoint) pickRangeEndpointOnly(cell.iso)
                  else scheduleRangeClick(cell.iso)
                } else {
                  pickDate(cell.iso)
                }
              }}
              onDoubleClick={() => handleDayDoubleClick(cell.iso)}
            >
              <span className="date-picker-day-label">{cell.date.getDate()}</span>
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
            disabled={isRangeMode ? !hasRangeSelection : !props.value}
            onClick={() => {
              if (isRangeMode) clearRange()
              else pickSingleDate('')
            }}
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

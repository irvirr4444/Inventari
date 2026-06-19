import * as React from 'react'
import { normalizeOraInput } from '@inventari/shared'
import {
  TIME_HOURS,
  TIME_MINUTES,
  TIME_QUICK_PICKS,
  combineOraParts,
  currentOraValue,
  parseOraParts,
} from './timePickerUtils'

function TimeColumn(props: {
  label: string
  values: readonly string[]
  selected: string
  onSelect: (value: string) => void
  listRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="time-picker-column">
      <div className="time-picker-column-label">{props.label}</div>
      <div className="time-picker-column-viewport">
        <div className="time-picker-column-band" aria-hidden="true" />
        <div ref={props.listRef} className="time-picker-column-scroll">
          {props.values.map((value) => (
            <button
              key={value}
              type="button"
              data-value={value}
              className={`time-picker-column-item${props.selected === value ? ' selected' : ''}`}
              onClick={() => props.onSelect(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TimePickerPopover(props: {
  value: string
  onConfirm: (value: string) => void
  onClear: () => void
}) {
  const initial = React.useMemo(() => parseOraParts(props.value), [props.value])
  const [hour, setHour] = React.useState(initial.hour)
  const [minute, setMinute] = React.useState(initial.minute)
  const hourListRef = React.useRef<HTMLDivElement | null>(null)
  const minuteListRef = React.useRef<HTMLDivElement | null>(null)

  const preview = combineOraParts(hour, minute)

  const scrollSelectedIntoView = React.useCallback(
    (listRef: React.RefObject<HTMLDivElement | null>, selected: string) => {
      const list = listRef.current
      if (!list) return
      const item = list.querySelector<HTMLElement>(`[data-value="${selected}"]`)
      item?.scrollIntoView({ block: 'center' })
    },
    [],
  )

  React.useLayoutEffect(() => {
    scrollSelectedIntoView(hourListRef, hour)
    scrollSelectedIntoView(minuteListRef, minute)
  }, [hour, minute, scrollSelectedIntoView])

  const applyQuickPick = (next: string) => {
    const normalized = normalizeOraInput(next) ?? currentOraValue()
    const parts = parseOraParts(normalized)
    setHour(parts.hour)
    setMinute(parts.minute)
    props.onConfirm(normalized)
  }

  return (
    <div className="time-picker">
      <div className="time-picker-preview" aria-live="polite">
        <span className="time-picker-preview-label">Ora e veprimit</span>
        <span className="time-picker-preview-value num">{preview}</span>
      </div>

      <div className="time-picker-quick" role="group" aria-label="Zgjedhje te shpejta">
        {TIME_QUICK_PICKS.map((pick) => {
          const active = pick.value !== null && props.value === pick.value
          return (
            <button
              key={pick.id}
              type="button"
              className={`time-picker-quick-btn${active ? ' active' : ''}`}
              onClick={() => applyQuickPick(pick.value ?? currentOraValue())}
            >
              {pick.label}
            </button>
          )
        })}
      </div>

      <div className="time-picker-columns">
        <TimeColumn
          label="Ore"
          values={TIME_HOURS}
          selected={hour}
          onSelect={setHour}
          listRef={hourListRef}
        />
        <span className="time-picker-colon" aria-hidden="true">
          :
        </span>
        <TimeColumn
          label="Min"
          values={TIME_MINUTES}
          selected={minute}
          onSelect={setMinute}
          listRef={minuteListRef}
        />
      </div>

      <div className="time-picker-footer">
        <button type="button" className="time-picker-footer-btn muted" onClick={props.onClear}>
          Pastro
        </button>
        <button
          type="button"
          className="btn sm primary time-picker-confirm"
          onClick={() => props.onConfirm(preview)}
        >
          Konfirmo
        </button>
      </div>
    </div>
  )
}

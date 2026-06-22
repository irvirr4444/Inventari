import * as React from 'react'
import { normalizeOraInput } from '@inventari/shared'
import { useEnterToConfirm } from '../hooks/useEnterToConfirm'
import {
  TIME_HOURS,
  TIME_MINUTES,
  TIME_PICKER_LOOP_COUNT,
  TIME_QUICK_PICKS,
  buildLoopedPickerItems,
  combineOraParts,
  currentOraValue,
  getCenteredListValue,
  loopPickerMiddleOffset,
  maybeRecenterLoopedPicker,
  parseOraParts,
  scrollPickerToLoopIndex,
  valueIndexInPicker,
} from './timePickerUtils'

function TimeColumnWheel(props: {
  wheelClass: string
  values: readonly string[]
  loopedItems: Array<{ value: string; loopIndex: number }>
  selected: string
  onSelect: (value: string) => void
  listRef: React.RefObject<HTMLDivElement | null>
  scrollSelectRef: React.MutableRefObject<boolean>
}) {
  const scrollRafRef = React.useRef<number | null>(null)

  const syncSelectionFromScroll = React.useCallback(() => {
    const list = props.listRef.current
    if (!list) return
    const centered = getCenteredListValue(list)
    if (!centered || centered === props.selected) return
    props.scrollSelectRef.current = true
    props.onSelect(centered)
  }, [props.listRef, props.onSelect, props.scrollSelectRef, props.selected])

  const recenterIfNeeded = React.useCallback(() => {
    const list = props.listRef.current
    if (!list) return false
    const recentered = maybeRecenterLoopedPicker(list, props.values.length, TIME_PICKER_LOOP_COUNT)
    if (recentered) props.scrollSelectRef.current = true
    return recentered
  }, [props.listRef, props.scrollSelectRef, props.values.length])

  const handleScrollFrame = React.useCallback(() => {
    syncSelectionFromScroll()
    recenterIfNeeded()
  }, [syncSelectionFromScroll, recenterIfNeeded])

  const onScroll = React.useCallback(() => {
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      handleScrollFrame()
    })
  }, [handleScrollFrame])

  const onScrollEnd = React.useCallback(() => {
    syncSelectionFromScroll()
    if (recenterIfNeeded()) syncSelectionFromScroll()
  }, [syncSelectionFromScroll, recenterIfNeeded])

  React.useEffect(() => {
    const list = props.listRef.current
    if (!list) return

    list.addEventListener('scroll', onScroll, { passive: true })
    list.addEventListener('scrollend', onScrollEnd)

    return () => {
      list.removeEventListener('scroll', onScroll)
      list.removeEventListener('scrollend', onScrollEnd)
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [props.listRef, onScroll, onScrollEnd])

  return (
    <div className={`time-picker-column-viewport ${props.wheelClass}`}>
      <div className="time-picker-column-band" aria-hidden="true" />
      <div ref={props.listRef} className="time-picker-column-scroll">
        {props.loopedItems.map((item) => (
          <button
            key={item.loopIndex}
            type="button"
            data-value={item.value}
            data-loop-index={item.loopIndex}
            className={`time-picker-column-item${props.selected === item.value ? ' selected' : ''}`}
            onClick={() => props.onSelect(item.value)}
          >
            {item.value}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TimePickerPopover(props: {
  value: string
  onConfirm: (value: string) => void
  onClear: () => void
  className?: string
}) {
  const initial = React.useMemo(() => parseOraParts(props.value), [props.value])
  const [hour, setHour] = React.useState(initial.hour)
  const [minute, setMinute] = React.useState(initial.minute)
  const hourListRef = React.useRef<HTMLDivElement | null>(null)
  const minuteListRef = React.useRef<HTMLDivElement | null>(null)
  const hourScrollSelectRef = React.useRef(false)
  const minuteScrollSelectRef = React.useRef(false)

  const hourLoopItems = React.useMemo(() => buildLoopedPickerItems(TIME_HOURS), [])
  const minuteLoopItems = React.useMemo(() => buildLoopedPickerItems(TIME_MINUTES), [])

  const preview = combineOraParts(hour, minute)
  const previewRef = React.useRef(preview)
  previewRef.current = preview

  useEnterToConfirm(() => props.onConfirm(previewRef.current), { enabled: true })

  const scrollToSelectedValue = React.useCallback(
    (
      listRef: React.RefObject<HTMLDivElement | null>,
      values: readonly string[],
      selected: string,
    ) => {
      const list = listRef.current
      if (!list) return
      const loopIndex =
        loopPickerMiddleOffset(values.length) + valueIndexInPicker(values, selected)
      scrollPickerToLoopIndex(list, loopIndex)
    },
    [],
  )

  React.useLayoutEffect(() => {
    if (hourScrollSelectRef.current) {
      hourScrollSelectRef.current = false
      return
    }
    scrollToSelectedValue(hourListRef, TIME_HOURS, hour)
  }, [hour, scrollToSelectedValue])

  React.useLayoutEffect(() => {
    if (minuteScrollSelectRef.current) {
      minuteScrollSelectRef.current = false
      return
    }
    scrollToSelectedValue(minuteListRef, TIME_MINUTES, minute)
  }, [minute, scrollToSelectedValue])

  const applyQuickPick = (next: string) => {
    const normalized = normalizeOraInput(next) ?? currentOraValue()
    const parts = parseOraParts(normalized)
    setHour(parts.hour)
    setMinute(parts.minute)
    props.onConfirm(normalized)
  }

  return (
    <div className={`time-picker${props.className ? ` ${props.className}` : ''}`}>
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
        <div className="time-picker-column-label time-picker-column-label-hour">Ore</div>
        <span className="time-picker-colon-spacer" aria-hidden="true" />
        <div className="time-picker-column-label time-picker-column-label-minute">Min</div>

        <TimeColumnWheel
          wheelClass="time-picker-wheel-hour"
          values={TIME_HOURS}
          loopedItems={hourLoopItems}
          selected={hour}
          onSelect={setHour}
          listRef={hourListRef}
          scrollSelectRef={hourScrollSelectRef}
        />
        <span className="time-picker-colon" aria-hidden="true">:</span>
        <TimeColumnWheel
          wheelClass="time-picker-wheel-minute"
          values={TIME_MINUTES}
          loopedItems={minuteLoopItems}
          selected={minute}
          onSelect={setMinute}
          listRef={minuteListRef}
          scrollSelectRef={minuteScrollSelectRef}
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

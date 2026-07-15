import * as React from 'react'

export const PRODUCT_TABLE_VIRTUALIZE_THRESHOLD = 80
export const PRODUCT_TABLE_ROW_HEIGHT_PX = 48
const OVERSCAN = 8

export function useVirtualizedWindow(opts: {
  itemCount: number
  enabled: boolean
  rowHeight?: number
}) {
  const rowHeight = opts.rowHeight ?? PRODUCT_TABLE_ROW_HEIGHT_PX
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [range, setRange] = React.useState({ start: 0, end: Math.min(opts.itemCount, 40) })

  const updateRange = React.useCallback(() => {
    const el = scrollRef.current
    if (!el || !opts.enabled) {
      setRange({ start: 0, end: opts.itemCount })
      return
    }
    const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - OVERSCAN)
    const visible = Math.ceil(el.clientHeight / rowHeight) + OVERSCAN * 2
    const end = Math.min(opts.itemCount, start + visible)
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [opts.enabled, opts.itemCount, rowHeight])

  React.useEffect(() => {
    updateRange()
  }, [updateRange])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || !opts.enabled) return
    const onScroll = () => updateRange()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [opts.enabled, updateRange])

  const topSpacer = opts.enabled ? range.start * rowHeight : 0
  const bottomSpacer = opts.enabled ? Math.max(0, (opts.itemCount - range.end) * rowHeight) : 0

  return {
    scrollRef,
    start: opts.enabled ? range.start : 0,
    end: opts.enabled ? range.end : opts.itemCount,
    topSpacer,
    bottomSpacer,
    rowHeight,
  }
}

import * as React from 'react'

export const SHEET_NAV_SLIDE_MS = 280

export function scheduleSlideFrame(callback: () => void) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback)
  })
}

const SHEET_NAV_IGNORE_SELECTOR =
  'button, input, textarea, select, option, a, label, [role="button"], [role="link"], [contenteditable="true"], .mobile-tap-field, .mobile-btn-outline, .mobile-chip, .access-level-control'

export function shouldIgnoreSheetNavPointer(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(SHEET_NAV_IGNORE_SELECTOR))
}

function measurePanelHeight(el: HTMLElement | null | undefined): number {
  if (!el) return 0
  return el.scrollHeight
}

export function buildSheetNavTrackStyle(
  index: number,
  panelCount: number,
  dragging: boolean,
  dragX: number,
): React.CSSProperties {
  const panelWidth = panelCount > 0 ? 100 / panelCount : 100
  const offsetPercent = index * panelWidth

  if (dragging || dragX > 0) {
    return {
      width: `${panelCount * 100}%`,
      transform: `translateX(calc(-${offsetPercent}% + ${dragX}px))`,
      transition: dragging ? 'none' : undefined,
    }
  }

  return {
    width: `${panelCount * 100}%`,
    transform: `translateX(-${offsetPercent}%)`,
  }
}

export function useSheetNavStack() {
  const [index, setIndex] = React.useState(0)
  const [ready, setReady] = React.useState(false)
  const [dragX, setDragX] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const [transitionLocked, setTransitionLocked] = React.useState(false)
  const [animating, setAnimating] = React.useState(false)
  const transitionInFlight = React.useRef(false)
  const indexRef = React.useRef(0)
  const timeoutsRef = React.useRef<number[]>([])
  const swipeStartX = React.useRef(0)
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const onCollapsedRef = React.useRef<(() => void) | undefined>(undefined)
  const finishSlideRef = React.useRef<() => void>(() => {})
  const handleTransitionEndRef = React.useRef((event: TransitionEvent) => {
    const track = trackRef.current
    if (!track || event.target !== track) return
    if (event.propertyName !== 'transform') return
    if (!transitionInFlight.current) return
    finishSlideRef.current()
  })

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  React.useEffect(() => {
    indexRef.current = index
  }, [index])

  const clearScheduled = React.useCallback(() => {
    for (const id of timeoutsRef.current) window.clearTimeout(id)
    timeoutsRef.current = []
  }, [])

  React.useEffect(() => clearScheduled, [clearScheduled])

  const scheduleTimeout = React.useCallback(
    (callback: () => void, delayMs: number) => {
      const id = window.setTimeout(callback, delayMs)
      timeoutsRef.current.push(id)
      return id
    },
    [],
  )

  const unlockTransition = React.useCallback(() => {
    scheduleSlideFrame(() => setTransitionLocked(false))
  }, [])

  const finishSlide = React.useCallback(() => {
    if (!transitionInFlight.current) return
    clearScheduled()
    setTransitionLocked(true)
    onCollapsedRef.current?.()
    onCollapsedRef.current = undefined
    unlockTransition()
    scheduleSlideFrame(() => {
      setAnimating(false)
      transitionInFlight.current = false
    })
  }, [clearScheduled, unlockTransition])

  React.useEffect(() => {
    finishSlideRef.current = finishSlide
  }, [finishSlide])

  const registerTrack = React.useCallback((el: HTMLDivElement | null) => {
    const handler = handleTransitionEndRef.current
    if (trackRef.current) {
      trackRef.current.removeEventListener('transitionend', handler)
    }
    trackRef.current = el
    if (el) {
      el.addEventListener('transitionend', handler)
    }
  }, [])

  const startSlideFallback = React.useCallback(() => {
    scheduleTimeout(() => {
      if (transitionInFlight.current) finishSlideRef.current()
    }, SHEET_NAV_SLIDE_MS + 50)
  }, [scheduleTimeout])

  const push = React.useCallback(() => {
    if (transitionInFlight.current) return
    transitionInFlight.current = true
    setAnimating(true)
    scheduleSlideFrame(() => {
      setIndex((current) => current + 1)
      startSlideFallback()
    })
  }, [startSlideFallback])

  const pop = React.useCallback(
    (onCollapsed?: () => void) => {
      if (transitionInFlight.current) return
      const currentIndex = indexRef.current
      if (currentIndex <= 0) return

      transitionInFlight.current = true
      onCollapsedRef.current = onCollapsed
      setAnimating(true)
      setIndex(currentIndex - 1)
      startSlideFallback()
    },
    [startSlideFallback],
  )

  const reset = React.useCallback(() => {
    clearScheduled()
    transitionInFlight.current = false
    onCollapsedRef.current = undefined
    setAnimating(false)
    setTransitionLocked(true)
    setIndex(0)
    setDragX(0)
    setDragging(false)
    unlockTransition()
  }, [clearScheduled, unlockTransition])

  React.useEffect(() => {
    if (index === 0) {
      setDragX(0)
      setDragging(false)
    }
  }, [index])

  return {
    index,
    ready,
    transitionLocked,
    animating,
    canPop: index > 0,
    push,
    pop,
    reset,
    registerTrack,
    dragging,
    dragX,
    onPointerDown: (e: React.PointerEvent, canPop: boolean) => {
      if (!canPop || shouldIgnoreSheetNavPointer(e.target)) return
      swipeStartX.current = e.clientX
      setDragging(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging) return
      const delta = Math.max(0, e.clientX - swipeStartX.current)
      setDragX(delta)
    },
    finishDrag: (canPop: boolean, onPop: () => void) => {
      if (dragX >= 72 && canPop) onPop()
      setDragX(0)
      setDragging(false)
    },
  }
}

export function SheetNav(props: {
  index: number
  panelCount: number
  panelWidth: number
  ready: boolean
  dragging: boolean
  transitionLocked?: boolean
  animating?: boolean
  trackStyle?: React.CSSProperties
  registerTrack?: (el: HTMLDivElement | null) => void
  canPop: boolean
  onPop: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  children: React.ReactNode
}) {
  const childCount = React.Children.count(props.children)
  const index = childCount > 0 ? Math.max(0, Math.min(props.index, childCount - 1)) : 0
  const panelRefs = React.useRef(new Map<number, HTMLDivElement>())
  const prevIndexRef = React.useRef(index)
  const animatingRef = React.useRef(Boolean(props.animating))
  const [navHeight, setNavHeight] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    animatingRef.current = Boolean(props.animating)
  }, [props.animating])

  const syncHeightForIndex = React.useCallback(
    (targetIndex: number, animateFromIndex?: number) => {
      const activePanel = panelRefs.current.get(targetIndex)
      const targetHeight = measurePanelHeight(activePanel)
      if (targetHeight <= 0) return

      if (animateFromIndex != null && animateFromIndex !== targetIndex) {
        const fromPanel = panelRefs.current.get(animateFromIndex)
        const fromHeight = measurePanelHeight(fromPanel)
        if (fromHeight > 0) {
          setNavHeight(fromHeight)
          scheduleSlideFrame(() => setNavHeight(targetHeight))
          return
        }
      }

      setNavHeight(targetHeight)
    },
    [],
  )

  React.useLayoutEffect(() => {
    const prevIndex = prevIndexRef.current
    const indexChanged = prevIndex !== index

    if (props.animating && indexChanged) {
      syncHeightForIndex(index, prevIndex)
    } else {
      syncHeightForIndex(index)
    }

    prevIndexRef.current = index
  }, [index, props.animating, childCount, syncHeightForIndex])

  React.useEffect(() => {
    const activePanel = panelRefs.current.get(index)
    if (!activePanel) return

    let frame = 0
    const observer = new ResizeObserver(() => {
      if (animatingRef.current) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (animatingRef.current) return
        const nextHeight = measurePanelHeight(activePanel)
        if (nextHeight > 0) setNavHeight(nextHeight)
      })
    })

    observer.observe(activePanel)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [index, childCount])

  const setPanelRef = React.useCallback((childIndex: number, el: HTMLDivElement | null) => {
    if (el) panelRefs.current.set(childIndex, el)
    else panelRefs.current.delete(childIndex)
  }, [])

  const navStyle =
    navHeight !== undefined
      ? ({ height: navHeight } as React.CSSProperties)
      : undefined

  return (
    <div
      className={[
        'mobile-sheet-nav',
        props.ready ? 'mobile-sheet-nav--ready' : '',
        props.dragging ? 'mobile-sheet-nav--dragging' : '',
        props.transitionLocked ? 'mobile-sheet-nav--transition-locked' : '',
        props.animating ? 'mobile-sheet-nav--animating' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={navStyle}
      onPointerDown={(e) => {
        if (shouldIgnoreSheetNavPointer(e.target)) return
        props.onPointerDown(e)
      }}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerUp}
    >
      <div
        ref={props.registerTrack ?? undefined}
        className="mobile-sheet-nav-track"
        style={props.trackStyle}
      >
        {React.Children.map(props.children, (child, childIndex) => {
          const offset = childIndex - index
          return (
            <div
              ref={(el) => setPanelRef(childIndex, el)}
              className="mobile-sheet-nav-panel"
              style={{ flex: `0 0 ${props.panelWidth}%` }}
              aria-hidden={offset !== 0}
              data-nav-offset={offset}
            >
              {child}
            </div>
          )
        })}
      </div>
    </div>
  )
}

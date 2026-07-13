import * as React from 'react'
import {
  buildSheetNavTrackStyle,
  useSheetNavStack,
} from '../components/SheetNav'

function clampIndex(index: number, panelCount: number) {
  if (panelCount <= 0) return 0
  return Math.max(0, Math.min(index, panelCount - 1))
}

function useSheetNavLayout(
  nav: ReturnType<typeof useSheetNavStack>,
  panelCount: number,
  indexOverride?: number,
) {
  const index = clampIndex(indexOverride ?? nav.index, panelCount)
  return React.useMemo(
    () => ({
      panelCount,
      panelWidth: panelCount > 0 ? 100 / panelCount : 100,
      trackStyle: buildSheetNavTrackStyle(index, panelCount, nav.dragging, nav.dragX),
      transitionLocked: nav.transitionLocked,
      animating: nav.animating,
    }),
    [index, nav.dragging, nav.dragX, nav.transitionLocked, nav.animating, panelCount],
  )
}

export function useScreenStack<T extends { type: string }>(initialScreen: T) {
  const nav = useSheetNavStack()
  const initialRef = React.useRef(initialScreen)
  const [screens, setScreens] = React.useState<T[]>([initialRef.current])

  const push = React.useCallback(
    (screen: T) => {
      setScreens((stack) => [...stack, screen])
      nav.push()
    },
    [nav],
  )

  const pop = React.useCallback(() => {
    if (nav.index <= 0) return
    nav.pop(() => {
      setScreens((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack))
    })
  }, [nav])

  const reset = React.useCallback(() => {
    nav.reset()
    setScreens([initialRef.current])
  }, [nav])

  const index = clampIndex(nav.index, screens.length)
  const current = screens[index] ?? screens[0]
  const layout = useSheetNavLayout(nav, screens.length, index)

  return {
    nav,
    screens,
    current,
    depth: index,
    push,
    pop,
    reset,
    canPop: nav.index > 0,
    ...layout,
  }
}

export function useFloatingScreenStack<T>() {
  const nav = useSheetNavStack()
  const [screens, setScreens] = React.useState<T[]>([])

  const push = React.useCallback(
    (screen: T) => {
      setScreens((stack) => {
        if (stack.length > 0) nav.push()
        return [...stack, screen]
      })
    },
    [nav],
  )

  const pop = React.useCallback(() => {
    if (nav.index <= 0) {
      if (screens.length <= 1) {
        nav.reset()
        setScreens([])
      }
      return
    }
    nav.pop(() => {
      setScreens((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack))
    })
  }, [nav, screens.length])

  const close = React.useCallback(() => {
    nav.reset()
    setScreens([])
  }, [nav])

  const index = clampIndex(nav.index, screens.length)
  const depth = index
  const current = screens[index]
  const open = screens.length > 0
  const layout = useSheetNavLayout(nav, screens.length, index)

  return {
    nav,
    screens,
    current,
    depth,
    open,
    push,
    pop,
    close,
    canPop: nav.index > 0,
    ...layout,
  }
}

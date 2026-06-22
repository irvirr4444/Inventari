import * as React from 'react'
import { focusFirstModalField } from '../lib/focusModalField'
import { useMobileClient } from './useMobileClient'

export function useFocusModalOnOpen(
  containerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  focusKey?: unknown,
) {
  const isMobile = useMobileClient()

  React.useLayoutEffect(() => {
    if (!open || isMobile) return
    const id = window.requestAnimationFrame(() => {
      focusFirstModalField(containerRef.current)
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, isMobile, containerRef, focusKey])
}

import * as React from 'react'
import { attachOverscrollLock } from '../lib/overscrollLock'

export function useOverscrollLock<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  enabled = true,
  axis: 'y' | 'x' | 'both' = 'y',
) {
  React.useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    return attachOverscrollLock(el, axis)
  }, [ref, enabled, axis])
}

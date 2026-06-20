import type { MouseEvent } from 'react'

const GUARD_MS = 450
let guardUntil = 0
let installed = false

export function activatePointerDismissGuard(): void {
  guardUntil = performance.now() + GUARD_MS
}

export function installPointerDismissGuard(): void {
  if (installed || typeof document === 'undefined') return
  installed = true

  const swallowIfGuarding = (e: Event) => {
    if (performance.now() >= guardUntil) return
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }

  document.addEventListener('pointerdown', swallowIfGuarding, true)
  document.addEventListener('pointerup', swallowIfGuarding, true)
  document.addEventListener('click', swallowIfGuarding, true)
  document.addEventListener('touchend', swallowIfGuarding, true)
}

/** Close an overlay/backdrop without activating controls underneath. */
export function handleOverlayDismiss(e: MouseEvent<HTMLElement>, onDismiss: () => void): void {
  if (e.target !== e.currentTarget) return
  e.preventDefault()
  e.stopPropagation()
  activatePointerDismissGuard()
  onDismiss()
}

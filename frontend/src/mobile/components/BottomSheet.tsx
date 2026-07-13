import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEnterToConfirm } from '../../hooks/useEnterToConfirm'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'
import { useOverscrollLock } from '../../hooks/useOverscrollLock'

type BottomSheetProps = {
  open: boolean
  title?: React.ReactNode
  ariaLabel?: string
  onClose: () => void
  onBack?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  onEnterConfirm?: () => void
  enterConfirmDisabled?: boolean
  className?: string
}

const SHEET_BASE_Z = 100
const SHEET_ANIM_MS = 260
let openSheetCount = 0

function syncSheetOpenClass() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('mobile-sheet-open', openSheetCount > 0)
}

function useSheetLayer(open: boolean) {
  const [layer, setLayer] = React.useState(0)

  React.useLayoutEffect(() => {
    if (!open) {
      setLayer(0)
      return
    }
    openSheetCount += 1
    syncSheetOpenClass()
    const depth = openSheetCount
    setLayer(depth)
    return () => {
      openSheetCount = Math.max(0, openSheetCount - 1)
      syncSheetOpenClass()
    }
  }, [open])

  const baseZ = SHEET_BASE_Z + layer * 10
  return {
    overlayZ: baseZ,
    sheetZ: baseZ + 1,
    ready: !open || layer > 0,
  }
}

export function BottomSheet(props: BottomSheetProps) {
  const [dragY, setDragY] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const [mounted, setMounted] = React.useState(props.open)
  const [shown, setShown] = React.useState(false)
  const startY = React.useRef(0)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const { overlayZ, sheetZ, ready } = useSheetLayer(mounted)

  useOverscrollLock(bodyRef, mounted)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  React.useLayoutEffect(() => {
    if (props.open) {
      setMounted(true)
      setShown(prefersReducedMotion ? true : false)
      return
    }

    setShown(false)
    if (prefersReducedMotion) {
      setMounted(false)
      return
    }
    const t = window.setTimeout(() => setMounted(false), SHEET_ANIM_MS)
    return () => window.clearTimeout(t)
  }, [prefersReducedMotion, props.open])

  React.useLayoutEffect(() => {
    if (!props.open) return
    if (!mounted || !ready) return
    if (prefersReducedMotion) {
      setShown(true)
      return
    }
    const raf = window.requestAnimationFrame(() => setShown(true))
    return () => window.cancelAnimationFrame(raf)
  }, [mounted, prefersReducedMotion, props.open, ready])

  useEnterToConfirm(props.onEnterConfirm ?? (() => {}), {
    enabled: shown && Boolean(props.onEnterConfirm),
    disabled: props.enterConfirmDisabled,
  })

  const closeSheet = () => {
    setDragY(0)
    setDragging(false)
    setShown(false)
    props.onClose()
  }

  useEscapeToClose(closeSheet, { enabled: shown })

  React.useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  if (typeof document === 'undefined') return null
  if (!mounted || !ready) return null

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const delta = Math.max(0, e.clientY - startY.current)
    setDragY(delta)
  }

  const onPointerUp = () => {
    if (dragY >= 80) closeSheet()
    else {
      setDragY(0)
      setDragging(false)
    }
  }

  return createPortal(
    <>
      <div
        className={`mobile-sheet-overlay${shown ? ' open' : ''}`}
        style={{ zIndex: overlayZ }}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => handleOverlayDismiss(e, closeSheet)}
        aria-hidden={!shown}
      />
      <div
        className={`mobile-sheet${shown ? ' open' : ''} mobile-sheet--chrome${props.className ? ` ${props.className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.title != null ? undefined : props.ariaLabel}
        aria-labelledby={props.title != null ? 'mobile-sheet-title' : undefined}
        aria-hidden={!shown}
        style={{
          zIndex: sheetZ,
          ...(dragging || dragY > 0
            ? { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : undefined }
            : {}),
        }}
      >
        <div
          className="mobile-sheet-handle-wrap"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mobile-sheet-handle" />
        </div>
        {props.title != null || props.onBack ? (
          <div
            className={`mobile-sheet-header${props.onBack ? ' mobile-sheet-header--with-back' : ''}`}
            id={props.title != null ? 'mobile-sheet-title' : undefined}
          >
            {props.onBack ? (
              <button
                type="button"
                className="mobile-sheet-header-back"
                aria-label="Mbrapa"
                onClick={props.onBack}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            ) : null}
            {props.title != null ? <div className="mobile-sheet-header-title">{props.title}</div> : null}
          </div>
        ) : null}
        <div ref={bodyRef} className="mobile-sheet-body">{props.children}</div>
        {props.footer ? <div className="mobile-sheet-footer">{props.footer}</div> : null}
      </div>
    </>,
    document.body,
  )
}

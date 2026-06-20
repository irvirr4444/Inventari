import * as React from 'react'
import { createPortal } from 'react-dom'
import { handleOverlayDismiss } from '../../lib/pointerDismissGuard'

type BottomSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

const SHEET_BASE_Z = 100
let openSheetCount = 0

function useSheetLayer(open: boolean) {
  const [layer, setLayer] = React.useState(0)

  React.useLayoutEffect(() => {
    if (!open) {
      setLayer(0)
      return
    }
    openSheetCount += 1
    const depth = openSheetCount
    setLayer(depth)
    return () => {
      openSheetCount = Math.max(0, openSheetCount - 1)
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
  const startY = React.useRef(0)
  const { overlayZ, sheetZ, ready } = useSheetLayer(props.open)

  React.useEffect(() => {
    if (!props.open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [props.open])

  const closeSheet = () => {
    setDragY(0)
    setDragging(false)
    props.onClose()
  }

  if (typeof document === 'undefined') return null

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

  if (!props.open || !ready) return null

  return createPortal(
    <>
      <div
        className="mobile-sheet-overlay open"
        style={{ zIndex: overlayZ }}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => handleOverlayDismiss(e, closeSheet)}
        aria-hidden={false}
      />
      <div
        className="mobile-sheet open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-sheet-title"
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
        <div className="mobile-sheet-header" id="mobile-sheet-title">
          {props.title}
        </div>
        <div className="mobile-sheet-body">{props.children}</div>
        {props.footer ? <div className="mobile-sheet-footer">{props.footer}</div> : null}
      </div>
    </>,
    document.body,
  )
}

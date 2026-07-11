import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { locationBadge, useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { LocationAddModal } from './LocationAddModal'

type MenuPosition = {
  top: number
  left: number
  minWidth: number
  maxHeight: number
}

export function LocationPicker(props: {
  value: string
  onChange: (id: string) => void
  excludeIds?: string[]
  allowAdd?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  dataTutorial?: string
}) {
  const { activeLokacionet, refresh } = useLokacioni()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [menuPos, setMenuPos] = React.useState<MenuPosition | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const excludedIds = new Set(props.excludeIds ?? [])
  const options = activeLokacionet.filter(
    (l) => l.id === props.value || !excludedIds.has(l.id),
  )
  const selected = activeLokacionet.find((l) => l.id === props.value) ?? null

  useEscapeToClose(() => setMenuOpen(false), { enabled: menuOpen })

  const repositionMenu = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 6
    const edgePadding = 12
    const top = rect.bottom + gap
    const maxHeight = Math.max(80, window.innerHeight - top - edgePadding)
    setMenuPos({
      top,
      left: rect.left,
      minWidth: rect.width,
      maxHeight,
    })
  }, [])

  React.useLayoutEffect(() => {
    if (!menuOpen) return
    repositionMenu()
    const raf = requestAnimationFrame(repositionMenu)
    return () => cancelAnimationFrame(raf)
  }, [menuOpen, repositionMenu, options.length])

  React.useEffect(() => {
    if (!menuOpen) return
    const onReposition = () => repositionMenu()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [menuOpen, repositionMenu])

  React.useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const handleCreated = async (loc: Lokacioni) => {
    setAddOpen(false)
    setMenuOpen(false)
    await refresh()
    props.onChange(loc.id)
    props.onNotify?.('Vendndodhja u shtua me sukses.', 'success')
  }

  const menu =
    menuOpen && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="location-picker-menu location-picker-menu-portal"
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
              maxHeight: menuPos.maxHeight,
              zIndex: 1000,
              pointerEvents: 'auto',
            }}
          >
            {options.map((l) => (
              <button
                key={l.id}
                type="button"
                role="menuitem"
                className={`location-picker-menu-item${props.value === l.id ? ' active' : ''}`}
                onClick={() => {
                  props.onChange(l.id)
                  setMenuOpen(false)
                }}
              >
                <span>{locationBadge(l)}</span>
                <span>{l.emri}</span>
              </button>
            ))}
            {options.length === 0 ? (
              <div className="location-picker-menu-empty muted">Nuk ka vendndodhje te disponueshme.</div>
            ) : null}
            {props.allowAdd ? (
              <button
                type="button"
                role="menuitem"
                className="location-picker-menu-item location-picker-menu-add"
                onClick={() => {
                  setMenuOpen(false)
                  setAddOpen(true)
                }}
              >
                + Shto
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div ref={rootRef} className="location-picker-dropdown">
        <button
          ref={triggerRef}
          type="button"
          className="btn location-picker-trigger"
          data-tutorial={props.dataTutorial}
          onPointerDown={() => window.dispatchEvent(new Event('inventari:close-overlays'))}
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {selected ? (
            <>
              {locationBadge(selected)} {selected.emri}
            </>
          ) : (
            <span className="muted">Zgjidh vendndodhjen</span>
          )}
          <svg
            className="location-picker-chevron"
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {menu}
      {props.allowAdd ? (
        <LocationAddModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  )
}

export function LocationLabel(props: { lokacioni: Lokacioni }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span>{locationBadge(props.lokacioni)}</span>
      <span>{props.lokacioni.emri}</span>
    </span>
  )
}

import * as React from 'react'
import { createPortal } from 'react-dom'
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
  const options = activeLokacionet.filter((l) => !props.excludeIds?.includes(l.id))
  const selected = options.find((l) => l.id === props.value) ?? options[0]

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
    props.onNotify?.('Lokacioni u shtua me sukses.', 'success')
  }

  const addModal = props.allowAdd ? (
    <LocationAddModal
      open={addOpen}
      onClose={() => setAddOpen(false)}
      onCreated={handleCreated}
    />
  ) : null

  if (props.allowAdd) {
    const menu =
      menuOpen && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              className="location-picker-menu location-picker-menu-portal"
              role="menu"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                minWidth: menuPos.minWidth,
                maxHeight: menuPos.maxHeight,
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
            className="btn location-pill active location-picker-trigger"
            data-tutorial={props.dataTutorial}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {selected ? (
              <>
                {locationBadge(selected)} {selected.emri}
              </>
            ) : (
              <span>Zgjidh lokacionin</span>
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
        {addModal}
      </>
    )
  }

  if (options.length <= 4) {
    return (
      <div className="location-pill-row">
        {options.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`btn location-pill${props.value === l.id ? ' active' : ''}`}
            onClick={() => props.onChange(l.id)}
          >
            {locationBadge(l)} {l.emri}
          </button>
        ))}
      </div>
    )
  }

  return (
    <select
      className="input"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {options.map((l) => (
        <option key={l.id} value={l.id}>
          {l.emri}
        </option>
      ))}
    </select>
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

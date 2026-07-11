import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { DEFAULT_LOCATION_EMOJI, SUGGESTED_LOCATION_EMOJIS } from './locationEmojis'

export { DEFAULT_LOCATION_EMOJI } from './locationEmojis'

export function LocationEmojiPicker(props: {
  value: string
  onChange: (emoji: string) => void
  disabled?: boolean
  className?: string
}) {
  const [selected, setSelected] = React.useState(props.value)
  const [open, setOpen] = React.useState(false)
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    setSelected(props.value)
  }, [props.value])

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEscapeToClose(() => setOpen(false), { enabled: open })

  const className = ['location-emoji-picker', props.className].filter(Boolean).join(' ')
  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const menuWidth = 174
    const menuHeight = 190
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8)
    const top = Math.max(8, rect.top - menuHeight - 10)
    setMenuPos({ top, left })
    setOpen(true)
  }

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="location-emoji-menu location-emoji-menu-portal"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {SUGGESTED_LOCATION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`location-emoji-option${selected === emoji ? ' active' : ''}`}
                disabled={props.disabled}
                role="menuitemradio"
                aria-checked={selected === emoji}
                aria-label={`Zgjidh ikonen ${emoji}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (props.disabled) return
                  setSelected(emoji)
                  setOpen(false)
                  props.onChange(emoji)
                }}
              >
                {emoji}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={className} role="group" aria-label="Ikona e vendndodhjes">
      <button
        ref={triggerRef}
        type="button"
        className="location-emoji-trigger"
        disabled={props.disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Ikona aktuale ${selected}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (props.disabled) return
          if (open) {
            setOpen(false)
          } else {
            openMenu()
          }
        }}
      >
        {selected}
      </button>
      {menu}
    </div>
  )
}

export function locationDisplayEmoji(flagEmoji: string | null | undefined): string {
  return flagEmoji?.trim() || DEFAULT_LOCATION_EMOJI
}

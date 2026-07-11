import * as React from 'react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'

type TriggerProps = {
  open: boolean
  triggerProps: {
    type: 'button'
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    onClick: () => void
  }
}

export function DropdownMenu(props: {
  className?: string
  menuClassName?: string
  align?: 'start' | 'end'
  trigger: (props: TriggerProps) => React.ReactNode
  children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => setOpen(false), [])

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [close, open])

  useEscapeToClose(close, { enabled: open })

  return (
    <div ref={rootRef} className={['dropdown-menu-root', props.className].filter(Boolean).join(' ')}>
      {props.trigger({
        open,
        triggerProps: {
          type: 'button',
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          onClick: () => setOpen((v) => !v),
        },
      })}

      {open ? (
        <div
          className={[
            'dropdown-menu-panel',
            props.align === 'start' ? 'dropdown-menu-panel-start' : 'dropdown-menu-panel-end',
            props.menuClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          role="menu"
        >
          {props.children(close)}
        </div>
      ) : null}
    </div>
  )
}

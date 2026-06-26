import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import {
  downloadHistoryDocument,
  type HistoryDocumentFormat,
} from '../../lib/historyDocumentDownload'
import { HISTORY_FILE_FORMAT_ICONS } from './historyFileFormatIcons'

type MenuPosition = {
  top: number
  left: number
  minWidth: number
}

const EXPORT_OPTIONS: Array<{
  format: HistoryDocumentFormat
  ext: string
}> = [
  { format: 'xlsx', ext: '.xlsx' },
  { format: 'pdf', ext: '.pdf' },
  { format: 'docx', ext: '.docx' },
]

function FileFormatIcon(props: { format: HistoryDocumentFormat }) {
  const icon = HISTORY_FILE_FORMAT_ICONS[props.format]
  return (
    <img
      className="history-export-menu-icon"
      src={icon.src}
      alt=""
      width={20}
      height={20}
      draggable={false}
    />
  )
}

function ChevronDownIcon() {
  return (
    <svg
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
  )
}

function DownloadIcon() {
  return (
    <svg
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
}

export function HistoryDownloadDropdown(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  trackPrice?: boolean
  disabled?: boolean
  disabledReason?: string
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  variant?: 'inline' | 'mobile' | 'mobile-footer'
}) {
  const {
    serverFilters,
    clientFilters,
    trackPrice,
    disabled,
    disabledReason,
    onNotify,
    variant = 'inline',
  } = props

  const [open, setOpen] = React.useState(false)
  const [loadingFormat, setLoadingFormat] = React.useState<HistoryDocumentFormat | null>(null)
  const [menuPos, setMenuPos] = React.useState<MenuPosition | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  const isBusy = loadingFormat !== null
  const isDisabled = disabled || isBusy

  useEscapeToClose(() => setOpen(false), { enabled: open })

  const repositionMenu = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 6
    const edgePadding = 12
    const menuWidth = Math.max(rect.width, 168)
    let left = rect.right - menuWidth
    left = Math.max(edgePadding, Math.min(left, window.innerWidth - menuWidth - edgePadding))
    setMenuPos({
      top: rect.bottom + gap,
      left,
      minWidth: menuWidth,
    })
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return
    repositionMenu()
    const raf = requestAnimationFrame(repositionMenu)
    return () => cancelAnimationFrame(raf)
  }, [open, repositionMenu])

  React.useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => repositionMenu()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open, repositionMenu])

  React.useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleSelect = React.useCallback(
    async (format: HistoryDocumentFormat) => {
      if (isDisabled) return
      setOpen(false)
      setLoadingFormat(format)
      try {
        await downloadHistoryDocument(format, {
          server: serverFilters,
          client: clientFilters,
          trackPrice,
        })
      } catch (error) {
        onNotify?.(error instanceof Error ? error.message : 'Gabim gjate eksportit.', 'error')
      } finally {
        setLoadingFormat(null)
      }
    },
    [clientFilters, isDisabled, onNotify, serverFilters, trackPrice],
  )

  const wrapClass =
    variant === 'mobile-footer'
      ? 'mobile-histori-export-actions mobile-histori-export-actions--footer'
      : variant === 'mobile'
        ? 'mobile-histori-export-actions'
        : 'history-export-actions'

  const dropdownClass =
    variant === 'mobile-footer'
      ? 'history-export-dropdown history-export-dropdown--mobile-footer'
      : variant === 'mobile'
        ? 'history-export-dropdown history-export-dropdown--mobile'
        : 'history-export-dropdown'

  const menu =
    open && menuPos && !isDisabled
      ? createPortal(
          <div
            ref={menuRef}
            className="history-export-menu history-export-menu-portal"
            role="menu"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
            }}
          >
            {EXPORT_OPTIONS.map(({ format, ext }) => (
              <button
                key={format}
                type="button"
                role="menuitem"
                className="history-export-menu-item"
                disabled={isBusy}
                onClick={() => void handleSelect(format)}
              >
                <FileFormatIcon format={format} />
                <span>{ext}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  if (disabled) {
    return (
      <div className={wrapClass}>
        <span
          className="btn sm history-export-trigger history-export-trigger--disabled"
          title={disabledReason}
          aria-disabled="true"
        >
          <DownloadIcon />
          Shkarko
        </span>
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      <div
        ref={rootRef}
        className={dropdownClass}
      >
        <button
          ref={triggerRef}
          type="button"
          className="btn sm history-export-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={isDisabled}
          title="Shkarko historikun"
          onClick={() => setOpen((value) => !value)}
        >
          <DownloadIcon />
          {isBusy ? 'Duke shkarkuar…' : 'Shkarko'}
          <ChevronDownIcon />
        </button>
      </div>
      {menu}
    </div>
  )
}

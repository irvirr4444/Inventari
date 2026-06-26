import * as React from 'react'
import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { downloadHistoryExcel } from '../../lib/historyExcelDownload'

function ExcelIcon() {
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

export function HistoryExcelExportButton(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  trackPrice?: boolean
  disabled?: boolean
  disabledReason?: string
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  className?: string
}) {
  const { serverFilters, clientFilters, disabled, disabledReason, onNotify, className } = props
  const [loading, setLoading] = React.useState(false)
  const buttonClass = className ?? 'btn sm history-export-excel-btn'

  const handleClick = React.useCallback(async () => {
    if (disabled || loading) return
    setLoading(true)
    try {
      await downloadHistoryExcel({
        server: serverFilters,
        client: clientFilters,
        trackPrice: props.trackPrice,
      })
    } catch (error) {
      onNotify?.(error instanceof Error ? error.message : 'Gabim gjate eksportit.', 'error')
    } finally {
      setLoading(false)
    }
  }, [clientFilters, disabled, loading, onNotify, props.trackPrice, serverFilters])

  if (disabled) {
    return (
      <span
        className={`${buttonClass} history-export-excel-btn--disabled`}
        title={disabledReason}
        aria-disabled="true"
      >
        <ExcelIcon />
        Excel
      </span>
    )
  }

  return (
    <button
      type="button"
      className={buttonClass}
      title="Shkarko Excel"
      disabled={loading}
      onClick={() => void handleClick()}
    >
      <ExcelIcon />
      {loading ? 'Duke shkarkuar…' : 'Excel'}
    </button>
  )
}

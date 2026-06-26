import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { HistoryDownloadDropdown } from './HistoryDownloadDropdown'

export function HistoryExportActions(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  trackPrice?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
  variant?: 'inline' | 'mobile' | 'mobile-footer'
}) {
  const { serverFilters, clientFilters, trackPrice, onNotify, variant = 'inline' } = props

  return (
    <HistoryDownloadDropdown
      serverFilters={serverFilters}
      clientFilters={clientFilters}
      trackPrice={trackPrice}
      onNotify={onNotify}
      variant={variant}
    />
  )
}

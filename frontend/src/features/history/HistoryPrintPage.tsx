import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getActionBatch } from '../../lib/api'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useTenantConfig } from '../../hooks/useTenantConfig'
import { fetchAllActionBatches } from '../../lib/fetchAllActionBatches'
import {
  applyHistoryClientFilters,
  formatHistoryFilterRangeIssuesMessage,
  getHistoryFilterRangeIssues,
} from '../../lib/historyClientFilters'
import {
  formatHistoryPrintFilterSummary,
  parseHistoryFilterSearchParams,
} from '../../lib/historyFilterSearchParams'
import { downloadHistoryDocument } from '../../lib/historyDocumentDownload'
import { HistoryPrintPages } from './HistoryPrintPages'

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryPrintPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { trackPrice: tenantTrackPrice } = useTenantConfig()
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | {
        status: 'ready'
        details: Awaited<ReturnType<typeof getActionBatch>>[]
        filterLines: string[]
        generatedAt: string
      }
  >({ status: 'loading' })

  const parsed = React.useMemo(
    () => parseHistoryFilterSearchParams(searchParams),
    [searchParams],
  )
  const trackPrice = parsed.trackPrice ?? tenantTrackPrice

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      const issues = getHistoryFilterRangeIssues(parsed.server, parsed.client, { trackPrice })
      if (issues.length > 0) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: formatHistoryFilterRangeIssuesMessage(issues),
          })
        }
        return
      }

      try {
        const batches = await fetchAllActionBatches(parsed.server)
        const filtered = applyHistoryClientFilters(batches, parsed.client, { trackPrice })
        if (filtered.length === 0) {
          if (!cancelled) {
            setState({ status: 'error', message: 'Nuk u gjet asnje veprim per printim.' })
          }
          return
        }

        const details = await Promise.all(filtered.map((batch) => getActionBatch(batch.id)))
        const locationLabel =
          parsed.client.locationIds.length > 0
            ? filtered.find((batch) => batch.lokacioni_id === parsed.client.locationIds[0])
                ?.lokacioni_emri ??
              filtered.find(
                (batch) => batch.destination_lokacioni_id === parsed.client.locationIds[0],
              )?.destination_lokacioni_emri ??
              parsed.client.locationIds[0]
            : undefined

        if (!cancelled) {
          setState({
            status: 'ready',
            details,
            filterLines: formatHistoryPrintFilterSummary(parsed.server, parsed.client, {
              trackPrice,
              locationLabel,
            }),
            generatedAt: formatGeneratedAt(new Date()),
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Gabim gjate ngarkimit.',
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [parsed, trackPrice])

  React.useEffect(() => {
    if (state.status !== 'ready') return
    if (searchParams.get('autoPrint') !== '1') return
    const timer = window.setTimeout(() => window.print(), 250)
    return () => window.clearTimeout(timer)
  }, [searchParams, state.status])

  const handleClose = React.useCallback(() => {
    if (window.opener && !window.opener.closed) {
      window.close()
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/', { replace: true })
  }, [navigate])

  const [downloading, setDownloading] = React.useState(false)

  const handleDownload = React.useCallback(async () => {
    if (downloading || state.status !== 'ready') return
    setDownloading(true)
    try {
      await downloadHistoryDocument('pdf', {
        server: parsed.server,
        client: parsed.client,
        trackPrice,
        batchIds: state.details.map((detail) => detail.id),
        filterLines: state.filterLines,
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gabim gjate shkarkimit.')
    } finally {
      setDownloading(false)
    }
  }, [downloading, parsed.client, parsed.server, state, trackPrice])

  const handlePrint = React.useCallback(() => {
    window.print()
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="history-print-page">
        <div className="history-print-toolbar">
          <strong className="history-print-toolbar-count">Duke ngarkuar…</strong>
          <div className="history-print-toolbar-actions">
            <button type="button" className="btn sm" onClick={handleClose}>
              Mbyll
            </button>
          </div>
        </div>
        <div className="history-print-viewport">
          <div className="history-print-loading">Duke pergatitur faqen per printim…</div>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="history-print-page">
        <div className="history-print-toolbar">
          <strong className="history-print-toolbar-count">Histori</strong>
          <div className="history-print-toolbar-actions">
            <button type="button" className="btn sm" onClick={handleClose}>
              Mbyll
            </button>
          </div>
        </div>
        <div className="history-print-viewport">
          <div className="history-print-error">{state.message}</div>
        </div>
      </div>
    )
  }

  const printHeader = React.useMemo(
    () => (
      <header className="history-print-header">
        <h1 className="history-print-title">Histori e veprimeve</h1>
        <p className="history-print-subtitle">
          Gjeneruar më {state.generatedAt}
          {user?.emri ? ` · ${user.emri}` : ''}
        </p>
        {state.filterLines.length > 0 ? (
          <div className="history-print-filters">
            {state.filterLines.map((line) => (
              <span key={line} className="history-print-filter-chip">
                {line}
              </span>
            ))}
          </div>
        ) : (
          <p className="history-print-summary">Të gjitha veprimet</p>
        )}
      </header>
    ),
    [state.filterLines, state.generatedAt, user?.emri],
  )

  return (
    <div className="history-print-page">
      <div className="history-print-toolbar">
        <strong className="history-print-toolbar-count">{state.details.length} veprime</strong>
        <div className="history-print-toolbar-actions">
          <button type="button" className="btn sm" onClick={handleClose}>
            Mbyll
          </button>
          <button
            type="button"
            className="btn sm"
            title="Shkarko PDF"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? 'Duke shkarkuar…' : 'Shkarko'}
          </button>
          <button type="button" className="btn sm primary" title="Printo faqen A4" onClick={handlePrint}>
            Printo
          </button>
        </div>
      </div>

      <div className="history-print-viewport">
        <HistoryPrintPages
          details={state.details}
          trackPrice={trackPrice}
          header={printHeader}
          layoutKey={state.filterLines.join('\0')}
        />
      </div>
    </div>
  )
}

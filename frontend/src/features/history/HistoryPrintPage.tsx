import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTenantConfig } from '../../hooks/useTenantConfig'
import {
  formatHistoryFilterRangeIssuesMessage,
  getHistoryFilterRangeIssues,
} from '../../lib/historyClientFilters'
import { parseHistoryFilterSearchParams } from '../../lib/historyFilterSearchParams'
import {
  downloadHistoryDocument,
  fetchHistoryDocument,
} from '../../lib/historyDocumentDownload'

export function HistoryPrintPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { trackPrice: tenantTrackPrice } = useTenantConfig()
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; objectUrl: string; filename: string }
  >({ status: 'loading' })
  const [downloading, setDownloading] = React.useState(false)
  const objectUrlRef = React.useRef<string | null>(null)

  const parsed = React.useMemo(
    () => parseHistoryFilterSearchParams(searchParams),
    [searchParams],
  )
  const trackPrice = parsed.trackPrice ?? tenantTrackPrice
  const autoPrint = searchParams.get('autoPrint') === '1'

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
        const doc = await fetchHistoryDocument('pdf', {
          server: parsed.server,
          client: parsed.client,
          trackPrice,
        })
        if (cancelled) {
          URL.revokeObjectURL(doc.objectUrl)
          return
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = doc.objectUrl
        setState({
          status: 'ready',
          objectUrl: doc.objectUrl,
          filename: doc.filename,
        })
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
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [parsed, trackPrice])

  React.useEffect(() => {
    if (state.status !== 'ready' || !autoPrint) return
    const timer = window.setTimeout(() => {
      const frame = document.getElementById('history-print-pdf-frame') as HTMLIFrameElement | null
      frame?.contentWindow?.focus()
      frame?.contentWindow?.print()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [autoPrint, state.status])

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

  const handleDownload = React.useCallback(async () => {
    if (downloading) return
    setDownloading(true)
    try {
      await downloadHistoryDocument('pdf', {
        server: parsed.server,
        client: parsed.client,
        trackPrice,
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gabim gjate shkarkimit.')
    } finally {
      setDownloading(false)
    }
  }, [downloading, parsed.client, parsed.server, trackPrice])

  const handlePrint = React.useCallback(() => {
    const frame = document.getElementById('history-print-pdf-frame') as HTMLIFrameElement | null
    frame?.contentWindow?.focus()
    frame?.contentWindow?.print()
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
          <div className="history-print-loading">Duke pergatitur PDF per printim…</div>
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

  return (
    <div className="history-print-page">
      <div className="history-print-toolbar">
        <strong className="history-print-toolbar-count">{state.filename}</strong>
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
          <button
            type="button"
            className="btn sm primary"
            title="Printo PDF"
            onClick={handlePrint}
          >
            Printo
          </button>
        </div>
      </div>

      <div className="history-print-viewport">
        <iframe
          id="history-print-pdf-frame"
          className="history-print-pdf-frame"
          title="Histori PDF"
          src={state.objectUrl}
        />
      </div>
    </div>
  )
}

import { useSummaryDateRange } from '../../hooks/useSummaryQuery'
import { exportUrl } from '../../lib/api'
import { fmt, fmtInt } from '../../lib/format'
import { MobileDateInput } from '../components/MobileDateInput'
import { SkeletonRow } from '../components/SkeletonRow'

function SummarySection(props: {
  name: string
  flagSrc: string
  loading: boolean
  summary: { in_qty: number; in_value: number; out_qty: number; out_value: number }
}) {
  const empty =
    props.summary.in_qty === 0 &&
    props.summary.in_value === 0 &&
    props.summary.out_qty === 0 &&
    props.summary.out_value === 0

  if (props.loading) return <SkeletonRow count={2} />

  return (
    <section className="mobile-summary-section">
      <div className="mobile-card-label row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <img className="flagIcon" src={props.flagSrc} alt="" width={20} height={14} />
        {props.name}
      </div>
      {empty ? (
        <p className="mobile-card-meta">Nuk ka të dhëna për këtë periudhë.</p>
      ) : (
        <>
          <div className="mobile-summary-row">
            <span>Hyrje (sasi)</span>
            <span className="mobile-num">{fmtInt(props.summary.in_qty)}</span>
          </div>
          <div className="mobile-summary-row">
            <span>Hyrje (vlerë)</span>
            <span className="mobile-num">{fmt(props.summary.in_value)} €</span>
          </div>
          <div className="mobile-summary-row">
            <span>Dalje (sasi)</span>
            <span className="mobile-num">{fmtInt(props.summary.out_qty)}</span>
          </div>
          <div className="mobile-summary-row">
            <span>Dalje (vlerë)</span>
            <span className="mobile-num">{fmt(props.summary.out_value)} €</span>
          </div>
        </>
      )}
    </section>
  )
}

export function PermbledhjeTab() {
  const { from, setFrom, to, setTo, query, emptySummary } = useSummaryDateRange()
  const loading = query.isLoading || query.isFetching

  const allEmpty =
    !loading &&
    !query.error &&
    (query.data?.XK ?? emptySummary).in_qty === 0 &&
    (query.data?.XK ?? emptySummary).out_qty === 0 &&
    (query.data?.AL ?? emptySummary).in_qty === 0 &&
    (query.data?.AL ?? emptySummary).out_qty === 0

  return (
    <div className="mobile-tab-panel">
      <div className="mobile-field-row">
        <div>
          <label className="mobile-label">Nga</label>
          <MobileDateInput value={from} onChange={setFrom} aria-label="Nga" placeholder="Nga" />
        </div>
        <div>
          <label className="mobile-label">Deri</label>
          <MobileDateInput value={to} onChange={setTo} aria-label="Deri" placeholder="Deri" />
        </div>
      </div>

      {query.error ? (
        <div className="mobile-inline-error">
          {query.error instanceof Error ? query.error.message : 'Nuk u lexua permbledhja.'}
        </div>
      ) : null}

      {allEmpty ? (
        <div className="mobile-empty">
          <div className="mobile-empty-title">Nuk ka të dhëna për këtë periudhë.</div>
        </div>
      ) : (
        <>
          <SummarySection
            name="Kosovo"
            flagSrc="/Flag_of_Kosovo.webp"
            loading={loading}
            summary={query.data?.XK ?? emptySummary}
          />
          <SummarySection
            name="Albania"
            flagSrc="/Flag_of_Albania.svg"
            loading={loading}
            summary={query.data?.AL ?? emptySummary}
          />
        </>
      )}

      <a className="mobile-btn-outline" href={exportUrl('xlsx', { from, to })} style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Shkarko Excel
      </a>
    </div>
  )
}

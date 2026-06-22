import * as React from 'react'
import { getPaginationRange } from '../../lib/paginationRange'

export function HistoryPagination(props: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  empty?: boolean
}) {
  const { page, totalPages, total, pageSize, onPageChange } = props
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)
  const jumpInputId = React.useId()
  const pageItems = React.useMemo(
    () => getPaginationRange(page, totalPages),
    [page, totalPages],
  )

  const [jumpValue, setJumpValue] = React.useState(String(page))
  React.useEffect(() => {
    setJumpValue(String(page))
  }, [page])

  const commitJump = () => {
    const parsed = Number.parseInt(jumpValue, 10)
    if (!Number.isFinite(parsed)) {
      setJumpValue(String(page))
      return
    }
    const next = Math.min(totalPages, Math.max(1, parsed))
    setJumpValue(String(next))
    if (next !== page) onPageChange(next)
  }

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return
    onPageChange(next)
  }

  return (
    <div
      className={`history-pagination${props.empty || total === 0 ? ' history-pagination--empty' : ''}`}
    >
      <span className="history-pagination-summary">
        {total > 0
          ? `Duke shfaqur ${rangeStart}–${rangeEnd} nga ${total} veprime`
          : 'Duke shfaqur 0 veprime'}
      </span>

      <div className="history-pagination-controls">
        <button
          type="button"
          className="btn sm history-page-btn history-page-btn--edge"
          disabled={page <= 1 || total === 0}
          aria-label="Faqja e pare"
          onClick={() => goToPage(1)}
        >
          «
        </button>
        <button
          type="button"
          className="btn sm history-page-btn"
          disabled={page <= 1 || total === 0}
          aria-label="Faqja e meparshme"
          onClick={() => goToPage(page - 1)}
        >
          ‹
        </button>

        {pageItems.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="history-page-ellipsis" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`btn sm history-page-btn${item === page ? ' active' : ''}`}
              disabled={total === 0}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => goToPage(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="btn sm history-page-btn"
          disabled={page >= totalPages || total === 0}
          aria-label="Faqja tjeter"
          onClick={() => goToPage(page + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className="btn sm history-page-btn history-page-btn--edge"
          disabled={page >= totalPages || total === 0}
          aria-label="Faqja e fundit"
          onClick={() => goToPage(totalPages)}
        >
          »
        </button>

        {totalPages > 1 && total > 0 ? (
          <div className="history-pagination-jump">
            <label className="history-pagination-jump-label" htmlFor={jumpInputId}>
              Faqja
            </label>
            <input
              id={jumpInputId}
              type="text"
              inputMode="numeric"
              className="input sm history-pagination-jump-input"
              value={jumpValue}
              disabled={total === 0}
              aria-label={`Faqja, 1 deri ${totalPages}`}
              onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitJump()
                }
              }}
              onBlur={commitJump}
            />
            <span className="history-pagination-jump-total">/ {totalPages}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

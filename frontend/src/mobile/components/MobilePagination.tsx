function PaginationChevron(props: { direction: 'prev' | 'next' }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {props.direction === 'prev' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  )
}

export function MobilePagination(props: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const { page, totalPages, total, pageSize } = props
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <nav className="mobile-pagination" aria-label="Faqet">
      <p className="mobile-pagination-summary">
        {total > 0 ? (
          <>
            <span className="mobile-pagination-range">
              {rangeStart}–{rangeEnd}
            </span>
            <span className="mobile-pagination-total">nga {total}</span>
          </>
        ) : (
          '0 veprime'
        )}
      </p>
      <div className="mobile-pagination-controls">
        <button
          type="button"
          className="mobile-pagination-nav"
          disabled={page <= 1 || total === 0}
          aria-label="Faqja e meparshme"
          onClick={() => props.onPageChange(page - 1)}
        >
          <PaginationChevron direction="prev" />
        </button>
        <span className="mobile-pagination-indicator" aria-current="page">
          {page}
          <span className="mobile-pagination-indicator-sep">/</span>
          {totalPages}
        </span>
        <button
          type="button"
          className="mobile-pagination-nav"
          disabled={page >= totalPages || total === 0}
          aria-label="Faqja tjetër"
          onClick={() => props.onPageChange(page + 1)}
        >
          <PaginationChevron direction="next" />
        </button>
      </div>
    </nav>
  )
}

export function HistoryFilterClearButton(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="history-filter-clear-btn"
      aria-label="Pastro filtrat"
      onClick={props.onClick}
    >
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
        <path d="M3 6h18" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
        <path d="m4 4 16 16" />
      </svg>
      Pastro filtrat
    </button>
  )
}

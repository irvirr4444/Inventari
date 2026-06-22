export function HistoryModalTitleRow(props: { onClose: () => void }) {
  return (
    <div className="history-title-row">
      <svg
        className="history-title-icon"
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <h3>Historiku i Veprimeve</h3>
      <div className="spacer" />
      <button
        type="button"
        className="modal-close-btn"
        onClick={props.onClose}
        aria-label="Mbyll"
      >
        ×
      </button>
    </div>
  )
}

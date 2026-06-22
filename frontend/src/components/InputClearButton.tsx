export function InputClearButton(props: {
  onClick: () => void
  className?: string
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      className={`input-clear-btn${props.className ? ` ${props.className}` : ''}`}
      aria-label={props['aria-label'] ?? 'Pastro'}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        props.onClick()
      }}
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
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  )
}

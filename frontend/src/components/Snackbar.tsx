import type { SnackbarState } from '../hooks/useSnackbar'

export function Snackbar(props: { snackbar: SnackbarState }) {
  if (!props.snackbar) return null
  return (
    <div
      className={`snackbar${props.snackbar.variant === 'success' ? ' success' : ''}`}
      role="status"
      aria-live="polite"
    >
      {props.snackbar.message}
    </div>
  )
}

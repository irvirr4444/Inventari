import { createPortal } from 'react-dom'
import type { SnackbarState } from '../hooks/useSnackbar'

export function Snackbar(props: { snackbar: SnackbarState }) {
  if (!props.snackbar) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`snackbar${
        props.snackbar.variant === 'success'
          ? ' success'
          : props.snackbar.variant === 'error'
            ? ' error'
            : ''
      }`}
      role="status"
      aria-live="polite"
    >
      {props.snackbar.message}
    </div>,
    document.body,
  )
}

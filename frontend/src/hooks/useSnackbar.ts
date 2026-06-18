import * as React from 'react'

export type SnackbarState = {
  message: string
  variant?: 'success' | 'default' | 'error'
} | null

export function useSnackbar(durationMs = 4500) {
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null)

  const notify = React.useCallback(
    (message: string, variant: 'success' | 'default' | 'error' = 'default') => {
      setSnackbar({ message, variant })
    },
    [],
  )

  const clear = React.useCallback(() => setSnackbar(null), [])

  React.useEffect(() => {
    if (!snackbar) return
    const timer = window.setTimeout(() => setSnackbar(null), durationMs)
    return () => window.clearTimeout(timer)
  }, [snackbar, durationMs])

  return { snackbar, notify, clear, setSnackbar }
}

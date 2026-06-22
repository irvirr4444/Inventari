import * as React from 'react'
import { pushEscapeDismissLayer } from '../lib/escapeDismissStack'

export function useEscapeToClose(
  onClose: () => void,
  options?: { enabled?: boolean; disabled?: boolean },
) {
  const enabled = options?.enabled ?? true
  const onCloseRef = React.useRef(onClose)
  const disabledRef = React.useRef(options?.disabled ?? false)

  onCloseRef.current = onClose
  disabledRef.current = options?.disabled ?? false

  React.useEffect(() => {
    if (!enabled) return
    return pushEscapeDismissLayer(
      () => onCloseRef.current(),
      () => disabledRef.current,
    )
  }, [enabled])
}

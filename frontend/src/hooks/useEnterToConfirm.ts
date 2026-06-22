import * as React from 'react'
import { pushEnterConfirmLayer } from '../lib/enterConfirmStack'

export function useEnterToConfirm(
  onConfirm: () => void,
  options?: { enabled?: boolean; disabled?: boolean },
) {
  const enabled = options?.enabled ?? true
  const onConfirmRef = React.useRef(onConfirm)
  const disabledRef = React.useRef(options?.disabled ?? false)

  onConfirmRef.current = onConfirm
  disabledRef.current = options?.disabled ?? false

  React.useEffect(() => {
    if (!enabled) return
    return pushEnterConfirmLayer(
      () => onConfirmRef.current(),
      () => disabledRef.current,
    )
  }, [enabled])
}

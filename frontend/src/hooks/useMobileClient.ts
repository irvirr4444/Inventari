import * as React from 'react'
import { isMobileClient } from '../lib/mobileClient'

function applyMobileClientClass(mobile: boolean) {
  document.documentElement.classList.toggle('mobile-client', mobile)
}

export function useMobileClient(): boolean {
  const locked = React.useRef<boolean | null>(null)
  if (locked.current === null) {
    locked.current = isMobileClient()
    if (typeof document !== 'undefined') {
      applyMobileClientClass(locked.current)
    }
  }

  const [mobile] = React.useState(locked.current)

  React.useEffect(() => {
    applyMobileClientClass(mobile)
  }, [mobile])

  return mobile
}

export const MOBILE_CLIENT_STORAGE_KEY = 'inventari-mobile'

type NavigatorWithUaData = Navigator & { userAgentData?: { mobile?: boolean } }

/** Persist ?mobile=1 / ?desktop=1 across in-app navigations (e.g. login redirect). */
export function syncMobileClientPreference(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (params.get('mobile') === '1') {
    sessionStorage.setItem(MOBILE_CLIENT_STORAGE_KEY, '1')
  }
  if (params.get('desktop') === '1') {
    sessionStorage.removeItem(MOBILE_CLIENT_STORAGE_KEY)
  }
}

/** True when the client should get the mobile app (phone / small touch device). */
export function isMobileClient(): boolean {
  if (typeof window === 'undefined') return false

  syncMobileClientPreference()

  const params = new URLSearchParams(window.location.search)
  if (params.get('mobile') === '1') return true
  if (params.get('desktop') === '1') return false
  if (sessionStorage.getItem(MOBILE_CLIENT_STORAGE_KEY) === '1') return true

  const mobileUa = /Android|iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
  const uaMobile = (navigator as NavigatorWithUaData).userAgentData?.mobile
  if (mobileUa || uaMobile) return true

  if (
    navigator.maxTouchPoints > 0 &&
    Math.min(window.screen.width, window.screen.height) <= 820
  ) {
    return true
  }

  const narrow = window.matchMedia('(max-width: 768px)').matches
  if (narrow) return true

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  return coarsePointer && window.innerWidth <= 1024
}

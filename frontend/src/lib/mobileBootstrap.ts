/** Runs before React so Android Chrome gets the correct viewport + mobile class immediately. */
export function bootstrapMobileClient(): boolean {
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  if (params.get('desktop') === '1') return false

  const ua = navigator.userAgent
  const isAndroid = /Android/i.test(ua)
  const isPhoneUa = /Android|iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const uaDataMobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
    ?.mobile
  const touchNarrow =
    navigator.maxTouchPoints > 0 &&
    Math.min(window.screen.width, window.screen.height) <= 820

  const mobile = params.get('mobile') === '1' || isPhoneUa || uaDataMobile === true || touchNarrow
  if (!mobile) return false

  document.documentElement.classList.add('mobile-client')

  const meta = document.querySelector('meta[name="viewport"]')
  if (meta) {
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
    )
  }

  // Android Chrome "Desktop site" can ignore device-width; force layout width to the screen.
  if (isAndroid && window.screen.width > 0) {
    const layoutWidth = document.documentElement.clientWidth
    const screenWidth = window.screen.width
    if (layoutWidth > screenWidth + 32 && meta) {
      meta.setAttribute(
        'content',
        `width=${screenWidth}, initial-scale=1, minimum-scale=1, viewport-fit=cover, interactive-widget=resizes-content`,
      )
    }
  }

  return true
}

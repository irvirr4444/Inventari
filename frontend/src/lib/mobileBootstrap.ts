import { isMobileClient } from './mobileClient'

/** Runs before React so mobile layout + viewport apply on first paint. */
export function bootstrapMobileClient(): boolean {
  if (typeof window === 'undefined') return false
  if (!isMobileClient()) return false

  document.documentElement.classList.add('mobile-client')

  const meta = document.querySelector('meta[name="viewport"]')
  if (meta) {
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
    )
  }

  const ua = navigator.userAgent
  const isAndroid = /Android/i.test(ua)
  if (isAndroid && window.screen.width > 0 && meta) {
    const layoutWidth = document.documentElement.clientWidth
    const screenWidth = window.screen.width
    if (layoutWidth > screenWidth + 32) {
      meta.setAttribute(
        'content',
        `width=${screenWidth}, initial-scale=1, minimum-scale=1, viewport-fit=cover, interactive-widget=resizes-content`,
      )
    }
  }

  return true
}

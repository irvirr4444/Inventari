/** Bundled Capacitor app serves the WebView from https://localhost (androidScheme: https). */
export function isCapacitorNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.origin === 'https://localhost'
}

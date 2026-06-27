/** Public URLs for store listings and legal pages (production). */
export const LEGAL_BASE_URL = 'https://inventari-frontend.onrender.com'

export const PRIVACY_POLICY_URL = `${LEGAL_BASE_URL}/privacy`
export const TERMS_URL = `${LEGAL_BASE_URL}/terms`

/** Support contact from root `.env` / `.env.production` → `VITE_SUPPORT_EMAIL`. */
export function getSupportEmail(): string | undefined {
  const email = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined
  const trimmed = email?.trim()
  return trimmed || undefined
}

import * as React from 'react'

import { AuthBrandMark } from './AuthBrandMark'

const LOADING_MESSAGES = [
  { atMs: 0, text: 'Duke marrë të dhënat' },
  { atMs: 5000, text: 'Duke përgatitur tabelat' },
  { atMs: 10000, text: 'Pothuajse gati' },
] as const

type AuthLoadingMessage = (typeof LOADING_MESSAGES)[number]['text']

function useAuthLoadingMessage() {
  const [message, setMessage] = React.useState<AuthLoadingMessage>(LOADING_MESSAGES[0].text)

  React.useEffect(() => {
    const timers = LOADING_MESSAGES.slice(1).map((step) =>
      window.setTimeout(() => setMessage(step.text), step.atMs),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [])

  return message
}

export function AuthLoading() {
  const status = useAuthLoadingMessage()

  return (
    <main className="auth-loading-screen">
      <div className="auth-loading-content">
        <AuthBrandMark variant="loading" />
        <p key={status} className="auth-loading-status" aria-live="polite">{status}</p>
      </div>
    </main>
  )
}

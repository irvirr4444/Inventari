import * as React from 'react'

import { AuthBrandMark } from './AuthBrandMark'

const LOADING_MESSAGES = [
  { atMs: 0, text: 'Duke marrë të dhënat' },
  { atMs: 5000, text: 'Duke përgatitur tabelat' },
  { atMs: 10000, text: 'Pothuajse gati' },
] as const

const WAKING_MESSAGES = [
  { atMs: 0, text: 'Serveri po zgjohet' },
  { atMs: 5000, text: 'Po lidhemi përsëri' },
  { atMs: 10000, text: 'Ende duke u lidhur…' },
] as const

type AuthLoadingMessage =
  | (typeof LOADING_MESSAGES)[number]['text']
  | (typeof WAKING_MESSAGES)[number]['text']

function useTimedMessage(mode: 'loading' | 'waking') {
  const steps = mode === 'waking' ? WAKING_MESSAGES : LOADING_MESSAGES
  const [message, setMessage] = React.useState<AuthLoadingMessage>(steps[0].text)

  React.useEffect(() => {
    const active = mode === 'waking' ? WAKING_MESSAGES : LOADING_MESSAGES
    setMessage(active[0].text)
    const timers = active.slice(1).map((step) =>
      window.setTimeout(() => setMessage(step.text), step.atMs),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [mode])

  return message
}

export function AuthLoading(props: { waking?: boolean }) {
  const status = useTimedMessage(props.waking ? 'waking' : 'loading')

  return (
    <main className="auth-loading-screen">
      <div className="auth-loading-content">
        <AuthBrandMark variant="loading" />
        <p key={status} className="auth-loading-status" aria-live="polite">
          {status}
        </p>
      </div>
    </main>
  )
}

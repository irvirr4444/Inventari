import * as React from 'react'
import { loginWithGoogle } from '../../lib/api/auth'
import { useAuth } from '../../lib/auth/AuthProvider'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void
        }
      }
    }
  }
}

export function GoogleSignInButton(props: { onSuccess?: () => void }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const { refreshSession } = useAuth()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  React.useEffect(() => {
    if (!clientId || !containerRef.current) return

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          await loginWithGoogle(response.credential)
          await refreshSession()
          props.onSuccess?.()
        },
      })
      if (containerRef.current) {
        window.google?.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: '320',
        })
      }
    }
    document.body.appendChild(script)
    return () => {
      script.remove()
    }
  }, [clientId, props, refreshSession])

  if (!clientId) return null

  return (
    <div style={{ marginTop: 12 }}>
      <div ref={containerRef} />
    </div>
  )
}

import * as React from 'react'
import { login } from '../lib/api'
import { Snackbar } from '../components/Snackbar'
import { useSnackbar } from '../hooks/useSnackbar'

export function LoginPage(props: { onSuccess: () => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const { snackbar, notify } = useSnackbar(3500)
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email: email.trim(), password: password.trim() })
      props.onSuccess()
    } catch {
      notify('Emaili ose password gabim.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="card auth-card">
        <div style={{ marginBottom: 22 }}>
          <h1>Inventari</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Hyr per te menaxhuar produktet dhe veprimet.
          </p>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Duke hyre...' : 'Hyr'}
          </button>
        </form>
      </section>

      <Snackbar snackbar={snackbar ? { message: snackbar.message, variant: snackbar.variant } : null} />
    </>
  )
}

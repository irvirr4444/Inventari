import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../../lib/api/auth'
import { useAuth } from '../../lib/auth/AuthProvider'
import { GoogleSignInButton } from './GoogleSignInButton'
import { Snackbar } from '../../components/Snackbar'
import { useSnackbar } from '../../hooks/useSnackbar'

export function SignupPage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [emri, setEmri] = React.useState('')
  const { snackbar, notify } = useSnackbar(3500)
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signup({ email: email.trim(), password, emri: emri.trim() || undefined })
      await refreshSession()
      navigate('/onboarding/locations', { replace: true })
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Regjistrimi deshtoi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="card auth-card">
        <h1>Krijo llogari</h1>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">
            <label className="label">Emri</label>
            <input className="input" value={emri} onChange={(e) => setEmri(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Duke krijuar...' : 'Regjistrohu'}
          </button>
        </form>
        <GoogleSignInButton onSuccess={() => navigate('/onboarding/locations', { replace: true })} />
        <p className="muted" style={{ marginTop: 16 }}>
          Ke llogari? <Link to="/login">Hyr</Link>
        </p>
      </section>
      <Snackbar snackbar={snackbar ? { message: snackbar.message, variant: snackbar.variant } : null} />
    </>
  )
}

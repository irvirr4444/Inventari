import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { isAdmin } from '../../../lib/permissions'
import { UsersSettingsPanel } from './UsersSettingsPanel'

export function UsersSettingsPage() {
  const { user } = useAuth()
  if (user?.isLegacy) return <Navigate to="/app" replace />
  if (!isAdmin(user)) return <Navigate to="/app" replace />

  return (
    <main className="container auth-container">
      <UsersSettingsPanel />
      <p className="muted" style={{ marginTop: 24 }}>
        <Link to="/app">← Kthehu ne panel</Link>
      </p>
    </main>
  )
}

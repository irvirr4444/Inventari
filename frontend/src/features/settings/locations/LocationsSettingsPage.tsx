import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { isAdmin } from '../../../lib/permissions'
import { LocationsSettingsPanel } from './LocationsSettingsPanel'

export function LocationsSettingsPage() {
  const { user } = useAuth()
  if (user?.isLegacy) return <Navigate to="/app" replace />
  if (!isAdmin(user)) return <Navigate to="/app" replace />

  return (
    <main className="container auth-container">
      <LocationsSettingsPanel />
      <p className="muted" style={{ marginTop: 24 }}>
        <Link to="/app">← Kthehu ne panel</Link>
      </p>
    </main>
  )
}

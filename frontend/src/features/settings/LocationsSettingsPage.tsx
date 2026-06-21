import { LocationsEditor } from '../locations/LocationsEditor'
import { TenantConfigDisplay } from './TenantConfigDisplay'
import { useAuth } from '../../lib/auth/AuthProvider'
import { Navigate } from 'react-router-dom'

export function LocationsSettingsPage() {
  const { user } = useAuth()
  if (user?.isLegacy) return <Navigate to="/" replace />

  return (
    <main className="container auth-container">
      <LocationsEditor mode="settings" />
      <TenantConfigDisplay />
    </main>
  )
}

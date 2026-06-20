import { Navigate, useNavigate } from 'react-router-dom'
import { LocationsEditor } from '../locations/LocationsEditor'
import { useAuth } from '../../lib/auth/AuthProvider'

export function LocationsOnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshSession, logout } = useAuth()

  if (user?.isLegacy) return <Navigate to="/" replace />
  if (user?.has_locations) return <Navigate to="/" replace />

  const handleBack = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="container auth-container">
      <LocationsEditor
        mode="onboarding"
        onBack={handleBack}
        onComplete={async () => {
          await refreshSession()
          navigate('/', { replace: true })
        }}
      />
    </main>
  )
}

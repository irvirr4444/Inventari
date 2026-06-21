import * as React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createLokacioni } from '../../lib/api/lokacionet'
import { completeOnboarding, postTenantConfig } from '../../lib/api/tenantConfig'
import { useAuth } from '../../lib/auth/AuthProvider'
import { Screen1Welcome } from './screens/Screen1Welcome'
import { Screen2LocationCount } from './screens/Screen2LocationCount'
import {
  createEmptyLocations,
  Screen3LocationNames,
  type LocationDraft,
} from './screens/Screen3LocationNames'
import { Screen4Pricing } from './screens/Screen4Pricing'
import { Screen5Confirm } from './screens/Screen5Confirm'

type ScreenId = 0 | 1 | 2 | 3 | 4

const PROGRESS: Record<ScreenId, number> = {
  0: 0,
  1: 25,
  2: 50,
  3: 75,
  4: 100,
}

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { user, refreshSession, logout } = useAuth()

  const [screen, setScreen] = React.useState<ScreenId>(0)
  const [animClass, setAnimClass] = React.useState('onboarding-wizard__screen--enter')
  const [locationCount, setLocationCount] = React.useState(1)
  const [locations, setLocations] = React.useState<LocationDraft[]>(() => createEmptyLocations(1))
  const [trackPrice, setTrackPrice] = React.useState<boolean | null>(null)
  const [savingPricing, setSavingPricing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (user?.isLegacy) return <Navigate to="/" replace />
  if (user?.tenantConfig?.onboarding_complete) return <Navigate to="/" replace />

  const goTo = (next: ScreenId) => {
    setAnimClass('onboarding-wizard__screen--exit')
    window.setTimeout(() => {
      setScreen(next)
      setAnimClass('onboarding-wizard__screen--enter')
    }, 220)
  }

  const goBack = () => {
    if (screen === 0) return
    goTo((screen - 1) as ScreenId)
  }

  const continueToLocationNames = () => {
    setLocations((prev) => {
      if (locationCount === prev.length) return prev
      if (locationCount > prev.length) {
        return [...prev, ...createEmptyLocations(locationCount - prev.length)]
      }
      return prev.slice(0, locationCount)
    })
    goTo(2)
  }

  const handleCountChange = (count: number) => {
    setLocationCount(count)
    setLocations((prev) => {
      if (count === prev.length) return prev
      if (count > prev.length) {
        return [...prev, ...createEmptyLocations(count - prev.length)]
      }
      return prev.slice(0, count)
    })
  }

  const handlePricingContinue = async () => {
    if (trackPrice === null) return
    setSavingPricing(true)
    setError(null)
    try {
      await postTenantConfig({ track_price: trackPrice })
      await refreshSession()
      goTo(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setSavingPricing(false)
    }
  }

  const handleSubmit = async () => {
    if (trackPrice === null) return
    setSubmitting(true)
    setError(null)
    try {
      const validLocations = locations.filter((l) => l.emri.trim())
      for (let i = 0; i < validLocations.length; i++) {
        const loc = validLocations[i]
        await createLokacioni({
          emri: loc.emri.trim(),
          flag_emoji: loc.flagEmoji,
          rradhitja: i,
        })
      }
      await completeOnboarding()
      await refreshSession()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackToLogin = () => {
    void logout().then(() => navigate('/login', { replace: true }))
  }

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-wizard__progress" aria-hidden="true">
        <div
          className="onboarding-wizard__progress-bar"
          style={{ width: `${PROGRESS[screen]}%` }}
        />
      </div>

      <div className="onboarding-wizard__topbar">
        {screen === 0 ? (
          <button type="button" className="onboarding-wizard__back-link" onClick={handleBackToLogin}>
            Kthehu te hyrja
          </button>
        ) : (
          <button type="button" className="onboarding-wizard__back-link" onClick={goBack}>
            ← Kthehu
          </button>
        )}
      </div>

      <div className={`onboarding-wizard__body ${animClass}`}>
        {screen === 0 ? <Screen1Welcome onContinue={() => goTo(1)} /> : null}
        {screen === 1 ? (
          <Screen2LocationCount
            value={locationCount}
            onChange={handleCountChange}
            onContinue={continueToLocationNames}
          />
        ) : null}
        {screen === 2 ? (
          <Screen3LocationNames
            locations={locations}
            onChange={setLocations}
            onContinue={() => goTo(3)}
          />
        ) : null}
        {screen === 3 ? (
          <>
            <Screen4Pricing
              value={trackPrice}
              onChange={setTrackPrice}
              onContinue={() => void handlePricingContinue()}
              loading={savingPricing}
            />
            {error ? <p className="ob-error">{error}</p> : null}
          </>
        ) : null}
        {screen === 4 ? (
          <Screen5Confirm
            locations={locations}
            trackPrice={trackPrice ?? true}
            onSubmit={() => void handleSubmit()}
            submitting={submitting}
            error={error}
          />
        ) : null}
      </div>
    </div>
  )
}

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { createLokacioni } from '../../lib/api/lokacionet'
import { completeOnboarding, postTenantConfig } from '../../lib/api/tenantConfig'
import { useAuth } from '../../lib/auth/AuthProvider'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { queryKeys } from '../../lib/queryKeys'
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
  const queryClient = useQueryClient()
  const { user, refreshSession, logout } = useAuth()

  const [screen, setScreen] = React.useState<ScreenId>(0)
  const [animClass, setAnimClass] = React.useState('onboarding-wizard__screen--enter')
  const [locationCount, setLocationCount] = React.useState(1)
  const [locations, setLocations] = React.useState<LocationDraft[]>(() => createEmptyLocations(1))
  const [trackPrice, setTrackPrice] = React.useState<boolean | null>(null)
  const [savingPricing, setSavingPricing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (user?.isLegacy) return <Navigate to="/app" replace />
  if (user?.tenantConfig?.onboarding_complete) return <Navigate to="/app" replace />

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
      const createdLocations: Lokacioni[] = []
      for (let i = 0; i < validLocations.length; i++) {
        const loc = validLocations[i]
        const created = await createLokacioni({
          emri: loc.emri.trim(),
          flag_emoji: loc.flagEmoji,
          rradhitja: i,
        })
        createdLocations.push(created)
      }
      queryClient.setQueryData<Lokacioni[]>(queryKeys.lokacionet(user?.id), (prev) => {
        const byId = new Map((prev ?? []).map((loc) => [loc.id, loc]))
        for (const loc of createdLocations) byId.set(loc.id, loc)
        return Array.from(byId.values()).sort((a, b) => a.rradhitja - b.rradhitja)
      })
      await completeOnboarding()
      await refreshSession()
      await queryClient.invalidateQueries({ queryKey: queryKeys.lokacionet(user?.id) })
      navigate('/app', { replace: true })
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
      <div className="onboarding-wizard__inner">
        {screen > 0 ? (
          <>
            <div className="onboarding-top-bar">
              <button type="button" className="onboarding-back-btn" onClick={goBack}>
                ← Kthehu
              </button>
              <span className="onboarding-step-label">
                {screen} / 4
              </span>
            </div>
            <div className="onboarding-progress-track" aria-hidden="true">
              <div
                className="onboarding-progress-fill"
                style={{ width: `${PROGRESS[screen]}%` }}
              />
            </div>
          </>
        ) : null}

        <div className={`onboarding-wizard__body ${animClass}`}>
          {screen === 0 ? (
            <Screen1Welcome onContinue={() => goTo(1)} onLogout={handleBackToLogin} />
          ) : null}
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
    </div>
  )
}

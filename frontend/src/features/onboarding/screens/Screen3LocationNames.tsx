import * as React from 'react'
import { DEFAULT_LOCATION_EMOJI, LocationEmojiPicker } from '../../locations/LocationEmojiPicker'

export type LocationDraft = {
  emri: string
  flagEmoji: string
}

const PLACEHOLDERS = [
  'p.sh. Magazina Kryesore',
  'p.sh. Dyqani Qendër',
  'p.sh. Depo Veri',
]

export function createEmptyLocations(count: number): LocationDraft[] {
  return Array.from({ length: count }, () => ({
    emri: '',
    flagEmoji: DEFAULT_LOCATION_EMOJI,
  }))
}

export function Screen3LocationNames(props: {
  locations: LocationDraft[]
  onChange: (locations: LocationDraft[]) => void
  onContinue: () => void
}) {
  const [openPickerIndex, setOpenPickerIndex] = React.useState<number | null>(null)

  const allNamed = props.locations.every((l) => l.emri.trim().length > 0)
  const headline =
    props.locations.length === 1
      ? 'Shumë mirë. Si e quani vendodhjen tuaj?'
      : 'Shumë mirë. Le t\'i vendosim emra vendodhjeve tuaja.'

  const updateLocation = (index: number, patch: Partial<LocationDraft>) => {
    const next = props.locations.map((loc, i) => (i === index ? { ...loc, ...patch } : loc))
    props.onChange(next)
  }

  const getPlaceholder = (index: number) =>
    PLACEHOLDERS[Math.min(index, PLACEHOLDERS.length - 1)]

  return (
    <div className="onboarding-wizard__screen onboarding-wizard__screen--2">
      <div className="onboarding-orb onboarding-orb--a" aria-hidden="true" />
      <div className="onboarding-orb onboarding-orb--b" aria-hidden="true" />
      <div className="onboarding-content">
        <h1 className="onboarding-screen-title">{headline}</h1>
        <div className="onboarding-locs-scroll">
          {props.locations.map((loc, index) => (
            <div key={index} className="onboarding-location-row">
              <button
                type="button"
                className={`onboarding-emoji-btn${openPickerIndex === index ? ' onboarding-emoji-btn--open' : ''}`}
                onClick={() => setOpenPickerIndex(openPickerIndex === index ? null : index)}
                aria-label="Zgjidh emoji"
              >
                {loc.flagEmoji || '📦'}
              </button>
              <input
                className="onboarding-loc-input"
                value={loc.emri}
                placeholder={getPlaceholder(index)}
                onChange={(e) => updateLocation(index, { emri: e.target.value })}
                aria-label={`Emri i vendodhjes ${index + 1}`}
              />
              {openPickerIndex === index ? (
                <LocationEmojiPicker
                  className="onboarding-location-row__picker"
                  value={loc.flagEmoji}
                  onChange={(emoji) => {
                    updateLocation(index, { flagEmoji: emoji })
                    setOpenPickerIndex(null)
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="onboarding-spacer" />
        <button type="button" className="onboarding-cta" disabled={!allNamed} onClick={props.onContinue}>
          Vazhdo →
        </button>
      </div>
    </div>
  )
}
